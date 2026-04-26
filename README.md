# Epistlo

> A self-hosted email service with real **@epistlo.com** addresses, built on FastAPI microservices and a custom SMTP/IMAP stack.

*From Latin epistola, Greek epistolē: "something sent to someone."*

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![FastAPI](https://img.shields.io/badge/FastAPI-3%20services-009688?logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Live → [epistlo.com](https://epistlo.com)**

---

## Screenshots

| Landing | Inbox |
|---|---|
| ![Landing page](screenshots/landing.png) | ![Inbox](screenshots/inbox.png) |

| Compose | Email View |
|---|---|
| ![Compose](screenshots/compose.png) | ![Email view](screenshots/email-view.png) |

---

## Features

- **Real mailboxes** — every account gets a working `@epistlo.com` address
- **SMTP & IMAP** — send/receive over standard protocols; connect any email client
- **Attachments** — up to 25 MB per email, stored on AWS S3
- **Full-text search** — powered by Elasticsearch, falls back to Supabase `ilike`
- **Folders & starring** — system folders + custom, read/unread tracking
- **Responsive UI** — Material-UI dark theme, works on mobile and desktop
- **Rate limiting** — per-user send limits configurable via env vars

---

## Architecture

![Architecture](screenshots/architecture.png)

---

## Email Infrastructure

![Email Infrastructure](screenshots/email-infra.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Material-UI, Redux Toolkit, React Router v6 |
| Backend | Python 3.11, FastAPI, Uvicorn (3 microservices) |
| Database | Supabase (PostgreSQL + Auth + Row-Level Security) |
| Outbound email | Resend (epistlo.com domain verified) |
| Inbound email | Custom SMTP server |
| IMAP | Custom IMAP server |
| Storage | AWS S3 (falls back to local filesystem) |
| Search | Elasticsearch (falls back to Supabase search) |
| Cache | Redis (optional) |
| Hosting | AWS EC2, Nginx, Let's Encrypt |

---

## License

MIT License. See [LICENSE](LICENSE) for details.
