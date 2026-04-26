# Epistlo — Interview Prep

---

## 1. How to Pitch the Project

### 30-second version
> "Epistlo is a self-hosted Gmail-like platform I built from scratch — React/TypeScript frontend, three Python FastAPI microservices for auth, email, and mailbox management, and a custom SMTP and IMAP server written in asyncio. Supabase as the primary PostgreSQL database, Redis for caching, Elasticsearch for full-text search, and AWS S3 for attachments — each with graceful fallbacks so the app works without those optional services."

### What to proactively bring up
- Built the **email protocol layer from scratch** (SMTP + IMAP in asyncio) — most devs never touch RFC 5321
- **Fire-and-forget send with automatic rollback** — non-trivial async pattern
- **Three-tier graceful degradation**: every optional service has a fallback
- **Dual-backend search**: ES for relevance → Supabase ILIKE as fallback

---

## 2. Architecture

```
Browser (React, port 3000)
    ├──► Auth Service     (FastAPI, port 8000)
    ├──► Email Service    (FastAPI, port 8001)
    └──► Mailbox Service  (FastAPI, port 8002)
              ├── Supabase (PostgreSQL)
              ├── Redis (email list cache)
              ├── Elasticsearch (full-text search)
              └── AWS S3 (attachments)

Internet  → SMTP Receiver (port 2525) — inbound email
Email clients → IMAP Server (port 1143)
```

Services are spawned as separate OS processes via `subprocess.Popen` in `run_integrated_server.py`. They share the same Supabase DB but don't call each other — no inter-service HTTP.

---

## 3. The Interesting Engineering Patterns

### Fire-and-Forget Send with Rollback
```
POST /emails/compose
→ Save to Supabase (status = SENT)
→ Return 200 immediately
→ asyncio.create_task(send_email_background())
    → fetch attachments in parallel (asyncio.gather)
    → SMTP or Resend API call (120s timeout)
    → on failure: revert status to DRAFT
```
**Why:** UX — user gets instant feedback. **Risk:** if the server crashes mid-task, the email stays SENT in DB but was never delivered. Proper fix: Celery job queue with retries (declared in requirements but not yet wired up).

### Three-Tier Storage Fallback
| Layer | Primary | Fallback |
|---|---|---|
| Search | Elasticsearch | Supabase `ILIKE` |
| Email list | Redis cache | Supabase query |
| Attachments | AWS S3 | Local filesystem |

Every optional service degrades gracefully — the app is fully functional without ES, Redis, or S3.

### Dual-Backend Search
1. Query Elasticsearch → returns matching **email IDs only**
2. Fetch actual documents from Supabase using `WHERE id IN (...)`
3. On ES failure → Supabase `ILIKE '%term%'` on subject + body

Supabase is always the source of truth. ES is only used for relevance ranking.

### Attachment Parallel Processing
```python
results = await asyncio.gather(*[prepare_attachment(a) for a in attachments],
                                return_exceptions=True)
```
`return_exceptions=True` means one bad attachment doesn't abort the entire send.

---

## 4. Custom Email Infrastructure

> See the Mermaid flow diagram in [README.md — Email Infrastructure](README.md#email-infrastructure).


### SMTP Receive Server (port 2525)
Built on raw `asyncio.start_server` — implements RFC 5321 from scratch.

Full conversation:
```
220 SMTP Ready  →  EHLO  →  MAIL FROM  →  RCPT TO  →  DATA  →  . (dot)  →  QUIT
```

On `DATA` received:
1. Parse MIME via Python stdlib `email.parser.BytesParser`
2. Walk parts → extract text, HTML, attachments
3. Wrap attachments in `MockUploadFile` → reuse existing `attachment_handler`
4. Look up recipient user in Supabase (5s timeout)
5. `EmailDatabase.create_email()` → index in ES → bust Redis cache

**Dot-stuffing** (RFC 5321): a body line starting with `.` is escaped to `..` by the sender. Server reverses it: `if line.startswith(b".."): line = b"." + line[2:]`

**Why port 2525 not 25?** Port 25 requires root privileges and is blocked by most ISPs. 2525 works unprivileged for local dev.

### IMAP Server (port 1143)
State machine: `NOT_AUTHENTICATED → AUTHENTICATED → SELECTED → LOGOUT`

`SELECT` works (queries real email counts from Supabase). `FETCH` and `SEARCH` are stubs — hardcoded responses. Sufficient for connection testing, not production-ready.

**Development bypass:** `if settings.development_mode:` skips password verification entirely.

---

## 5. Database & Caching

### Schema (key tables)
```
emails: id, user_id, subject, body, html_body,
        from_address (JSONB), to_addresses (JSONB[]),
        status (draft|sent|received|archived|trash),
        priority (low|normal|high|urgent),
        is_read, is_starred, thread_id, ...

email_folders: id, name, user_id, type (system|custom),
               parent_id, color, icon, email_count, unread_count
```

**Why JSONB for addresses?** Email addresses carry `{email, name}` pairs. JSONB avoids a join on every fetch and maps directly to RFC 2822 address format. Downside: can't efficiently query "all emails from X" without a GIN index.

**`thread_id`**: schema supports conversation threading (nullable UUID) — not yet implemented in the UI.

### Redis Caching
Key: `emails:{user_id}:{folder}:{page}:{limit}` — TTL 5 minutes.

Only caches `page=1`, no search, no filters (everything else goes straight to DB).

Invalidation: `KEYS("emails:{user_id}:*")` + `DELETE` all — a full user cache wipe on any write. Simple but has a problem: `KEYS` is O(N) and blocks Redis. Fix: use `SCAN` (cursor-based, non-blocking).

---

## 6. Elasticsearch

**Index mapping highlights:**
- `subject`, `body` → `text` (tokenized, full-text)
- `status`, `user_id`, `from_address.email` → `keyword` (exact match)
- `to_addresses`, `cc_addresses` → **`nested`** (not `object`)

**Why `nested` for address arrays?**
`object` type flattens arrays, causing cross-object matches. Example: if `to_addresses` is `[{email: "x@a.com", name: "Bob"}, {email: "y@b.com", name: "Alice"}]`, an `object` mapping would incorrectly match `name:Alice AND email:x@a.com` even though that combination doesn't exist in any single object. `nested` keeps each object independent.

**Search query:**
```json
{
  "multi_match": {
    "fields": ["subject^2", "body", "from_address.name"],
    "fuzziness": "AUTO"
  }
}
```
`subject^2` doubles relevance contribution from subject. `fuzziness: AUTO` = 1 edit for 3–5 char terms, 2 edits for 6+ — typo tolerance without making short terms too loose.

**Sync strategy:** Synchronous write-through — every `create_email` immediately calls `elasticsearch_service.index_email()`. If ES is down, the email is still in Supabase and found via ILIKE fallback.

**Index config:** 1 shard, 0 replicas — single-node dev setup. Production needs replicas for HA.

---

## 7. System Design Questions

**How would you scale to 1M users?**
- Partition `emails` by `user_id` (hash partitioning), add read replicas
- Index `emails(user_id, status, created_at DESC)` for folder queries
- Replace `KEYS`-based cache invalidation with `SCAN` or per-user key sets in Redis
- Activate Celery (already in requirements) for durable email sending with retries
- ES cluster with multiple shards + replicas; add index aliases for zero-downtime re-indexing
- CDN for frontend static assets, code splitting by route

**How would you add real-time notifications?**
SSE (Server-Sent Events) — simpler than WebSockets, HTTP-based, auto-reconnect:
1. SMTP server receives email → publishes to Redis Pub/Sub channel `user:{user_id}:inbox`
2. `GET /notifications/stream` SSE endpoint subscribes → pushes to browser
3. Browser `EventSource` API handles reconnection

**How would you implement rate limiting properly?**
Redis sorted set: key `rate:{user_id}:hourly`, values = timestamps of sent emails. On each send: prune entries older than 1hr, check `count < limit`, add timestamp — atomically via Lua script. Return 429 with `Retry-After`. (Currently `MAX_EMAILS_PER_HOUR/DAY` exist in config but aren't enforced anywhere.)

**How would you add email threading?**
Schema already has `thread_id`. On reply: copy sender's `thread_id`. For external emails: parse `In-Reply-To` / `References` SMTP headers in the receive server to assign thread automatically.

---

## 8. Known Trade-offs (own these)

| Issue | Current State | Proper Fix |
|---|---|---|
| Email send durability | `asyncio.create_task` — lost on crash | Celery + RabbitMQ (in requirements, not wired) |
| Rate limiting | Config vars exist, never enforced | Redis sorted-set rate limiter |
| IMAP FETCH/SEARCH | Hardcoded stubs | Complete RFC 3501 implementation |
| Redis cache invalidation | `KEYS` O(N) blocks Redis | `SCAN` or track keys in a Set |
| Blocking I/O in auth | `get_user()` is sync, called from async handlers | `run_in_executor` or async client |
| No JWT refresh tokens | 30-min hard expiry | Refresh token + httpOnly cookie |
| S3 attachment lookup | `list_objects` because key not stored in DB | Store full S3 key in the DB |
| Celery + pika declared | In requirements.txt, zero usage | Remove or implement |

---

## 9. Behavioural

**Hardest part?**
> "The custom SMTP and IMAP servers — reading RFC 5321 to handle edge cases like dot-stuffing and MIME multipart, and managing per-connection state correctly in asyncio without race conditions."

**What would you do differently?**
> "Activate the Celery job queue from day one. Fire-and-forget with `create_task` is fine for demos but email delivery needs durability — crash recovery and retries. I'd also use an async Supabase client everywhere to avoid blocking the event loop in auth."

**How did you handle the optional service fallbacks?**
> "Each service wraps initialization in try/except and sets an `enabled` flag. Every call checks that flag first and falls back to the simpler implementation. It meant I could develop and demo the app without running Docker for every dependency."

---

## Quick Reference

| Tech | Why |
|---|---|
| FastAPI | Async-native ASGI, Pydantic, auto OpenAPI |
| Supabase | PostgreSQL + Auth + RLS, minimal infra |
| Redis | Sub-ms cache, future pub/sub for notifications |
| Elasticsearch | Full-text, fuzzy matching, relevance ranking |
| S3 | Presigned URLs offload bandwidth from app server |
| asyncio SMTP/IMAP | Learning depth, tight DB integration |

**Email status lifecycle:**
`DRAFT → SENT` (on compose) `→ DRAFT` (on send failure) | `RECEIVED` (inbound) | `ARCHIVED` / `TRASH` (user action — soft delete, never hard deleted)
