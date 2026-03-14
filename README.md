# Epistlo

Sign up and get your own **@epistlo.com** email address. Send and receive real emails, manage your inbox, and connect with any email client you already use.

*From Latin epistola, Greek epistolē: "something sent to someone."*

**Live:** [https://epistlo.com](https://epistlo.com)

---

## Features

- Real @epistlo.com addresses with working mailboxes
- Send and receive emails over SMTP
- IMAP support so you can use any email client with your Epistlo account
- File attachments up to 25MB, stored on AWS S3
- Folders, starring, read/unread tracking
- Full-text email search

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Material-UI (dark theme), Redux Toolkit |
| Backend | Python 3.11, FastAPI (3 microservices) |
| Database | Supabase (PostgreSQL + Auth + Row-Level Security) |
| Outbound email | Resend (epistlo.com domain verified) |
| Inbound email | Custom SMTP server (port 25 to 2525) |
| IMAP | Custom IMAP server (port 1143) |
| Storage | AWS S3 |
| Search | Elasticsearch (optional, falls back to Supabase search) |
| Cache | Redis (optional, app works without it) |
| Hosting | AWS EC2 t3.small, Nginx, Let's Encrypt HTTPS |

---

## Architecture

Three FastAPI microservices plus email servers:

| Service | Port |
|---|---|
| Auth service | 8000 |
| Email service | 8001 |
| Mailbox service | 8002 |
| SMTP receive server | 2525 |
| IMAP server | 1143 |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for optional Elasticsearch, Redis)

### Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd backend
python run_integrated_server.py
```

This starts all 3 FastAPI services plus the SMTP/IMAP email servers.

### Frontend

```bash
cd frontend
npm install
npm start   # http://localhost:3000
```

---

## Environment Variables

### `backend/.env`

```
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
SECRET_KEY=           # JWT signing key (openssl rand -hex 32)
RESEND_API_KEY=       # for outbound email
MAX_EMAILS_PER_HOUR=
MAX_EMAILS_PER_DAY=
```

### `frontend/.env`

```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

> Run the backend from the `backend/` directory. `load_dotenv()` reads from the working directory.
