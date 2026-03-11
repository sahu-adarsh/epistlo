# Epistlo — Claude Code Project Guide

## Project Overview
Full-featured Gmail-like email service with a React frontend, Python FastAPI microservices backend, and custom SMTP/IMAP email servers.

---

## Architecture

```
Epistlo/
├── backend/
│   ├── auth_service/        # FastAPI — auth & user management (port 8000)
│   ├── email_service/       # FastAPI — email CRUD, sending, attachments (port 8001)
│   ├── mailbox_service/     # FastAPI — folders & counts (port 8002)
│   ├── email_server/        # Custom SMTP receiver (2525) + IMAP server (1143)
│   ├── shared/              # Config, Supabase client, Elasticsearch service
│   ├── run_integrated_server.py  # Starts all backend services together
│   └── .env                 # Backend environment variables (never commit)
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI components (auth/, email/, dashboard/, layout/, landing/)
│   │   ├── store/slices/    # Redux: emailSlice.ts, authSlice.ts
│   │   ├── services/        # Axios API service layer
│   │   ├── config/config.ts # API base URLs and endpoint constants
│   │   └── types/email.ts   # TypeScript interfaces
│   └── .env                 # Frontend environment variables (never commit)
├── requirements.txt         # Python dependencies (root level, only one)
└── CLAUDE.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Material-UI (dark theme), Redux Toolkit, React Query, React Router v6 |
| Backend | Python 3.11, FastAPI, Pydantic, Uvicorn |
| Database | Supabase (PostgreSQL + Auth + Row-Level Security) |
| Search | Elasticsearch 8.11 (optional — falls back to Supabase ilike search) |
| Storage | AWS S3 for attachments (optional — falls back to local filesystem) |
| Email sending | AWS SES (optional — falls back to local SMTP on port 2525) |
| Cache | Redis (optional) |
| Queue | RabbitMQ + Celery (optional) |

---

## Running Locally

### Backend
```bash
cd backend
python run_integrated_server.py
```
This starts all 3 FastAPI services + the SMTP/IMAP email server.

Or start services individually:
```bash
cd backend
python -m uvicorn auth_service.main:app --port 8000 --reload
python -m uvicorn email_service.main:app --port 8001 --reload
python -m uvicorn mailbox_service.main:app --port 8002 --reload
python run_email_server.py
```

### Frontend
```bash
cd frontend
npm install   # first time only
npm start     # runs on http://localhost:3000
```

### Python environment setup (first time)
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Service Ports

| Service | Port |
|---|---|
| Frontend (React) | 3000 |
| Auth Service | 8000 |
| Email Service | 8001 |
| Mailbox Service | 8002 |
| SMTP Receiver | 2525 |
| IMAP Server | 1143 |
| Elasticsearch | 9200 |
| Redis | 6379 |
| RabbitMQ | 5672 |

---

## Environment Variables

### `backend/.env` — required fields
```
SUPABASE_URL        # https://your-project.supabase.co
SUPABASE_KEY        # anon/public key
SUPABASE_SERVICE_KEY # service_role key
SECRET_KEY          # JWT signing key (openssl rand -hex 32)
MAX_EMAILS_PER_HOUR # e.g. 50
MAX_EMAILS_PER_DAY  # e.g. 200
```
> `load_dotenv()` in `shared/config.py` reads from the working directory — always run backend from `backend/`.

### `frontend/.env` — required fields
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
```
Service URLs default to localhost and don't need to be set for local dev.

---

## Database (Supabase PostgreSQL)

Core tables: `users`, `emails`, `folders`, `attachments`, `user_settings`

- `emails.status` enum: `draft | sent | received | archived | trash`
- `emails.priority` enum: `low | normal | high | urgent`
- `folders.type` enum: `system | custom`
- All tables use UUID primary keys and Supabase RLS for user isolation

---

## Key Files

| File | Purpose |
|---|---|
| `backend/shared/config.py` | All settings via pydantic-settings — single source of truth |
| `backend/shared/database.py` | Supabase client singleton |
| `backend/shared/elasticsearch_service.py` | Search — gracefully degrades if ES unavailable |
| `backend/email_service/main.py` | Core email API endpoints |
| `backend/email_service/attachment_handler.py` | File upload/download, S3 or local |
| `backend/email_service/aws_ses_handler.py` | AWS SES sending integration |
| `backend/email_server/smtp_receive_server.py` | Receives inbound emails on port 2525 |
| `backend/email_server/imap_server.py` | IMAP server for email client access |
| `frontend/src/config/config.ts` | API base URLs and all endpoint paths |
| `frontend/src/store/slices/emailSlice.ts` | Email Redux state + cache management |

---

## Important Notes

- The root `requirements.txt` is the only Python dependencies file (no `backend/requirements.txt`)
- `DEVELOPMENT_MODE=true` skips TLS/SSL on the email server — keep this for local dev
- `ENABLE_AWS_SES=false` uses local SMTP (port 2525) for sending — fine for local dev
- Elasticsearch is fully optional; search falls back to Supabase `ilike` queries
- All `__pycache__/` dirs are gitignored — safe to delete anytime
- `backend/init_elasticsearch.py` — run this once to create the ES index if using Elasticsearch
