# CodeMind AI 🤖⚡

> A production-ready, multi-agent AI coding assistant with real-time streaming, RAG document search, code execution, and JWT authentication.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal)](https://fastapi.tiangolo.com)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com)

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🤖 **Multi-Agent System** | Debug Agent · Architecture Agent · Security Agent · General Agent |
| 🔄 **SSE Streaming** | Real-time token streaming with blinking cursor |
| 📚 **RAG Pipeline** | FAISS vector store · sentence-transformers · PDF/TXT ingestion |
| ▶️ **Code Execution** | Python (subprocess) · JavaScript (Node vm sandbox) |
| 🔒 **JWT Auth** | Register/Login · Per-user sessions · bcrypt passwords |
| 🌙 **Dark/Light Mode** | Persistent theme via localStorage |
| 📂 **Document Upload** | Drag & drop · pdfplumber extraction · live docs list |

---

## 🏗️ Architecture

```
┌─────────────────┐     SSE Stream      ┌──────────────────────┐
│   Browser UI    │ ←────────────────── │  Express Backend     │
│  (HTML/JS/CSS)  │ ──POST /api/chat──► │  Node.js · Port 3001 │
└─────────────────┘                     └──────────┬───────────┘
                                                   │ HTTP
                                         ┌─────────▼───────────┐
                                         │   RAG Microservice   │
                                         │  FastAPI · Port 8000 │
                                         │  FAISS · embeddings  │
                                         └─────────────────────┘
```

### Multi-Agent Routing

User queries are **automatically classified** by keyword scoring and routed to the best agent:

| Agent | Triggers | System Prompt Style |
|-------|----------|---------------------|
| 🐛 Debug | `error`, `bug`, `crash`, `traceback` | Root cause → Fix → Prevention |
| 📐 Architecture | `design`, `scale`, `microservice`, `pattern` | Trade-off analysis + diagrams |
| 🔒 Security | `vulnerability`, `injection`, `auth`, `xss` | OWASP-focused threat modeling |
| ⚡ General | catch-all | Elite coding assistant |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- Python 3.11+
- Groq API key → [console.groq.com](https://console.groq.com)

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd ai-chatbot
```

### 2. Backend (Express)

```bash
cd backend
cp ../.env.example .env
# Edit .env and add your GROQ_API_KEY
npm install
npm start
# → http://localhost:3001
```

### 3. RAG Service (FastAPI)

```bash
cd rag_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### 4. Open the App

Visit **[http://localhost:3001](http://localhost:3001)**

---

## 📁 Project Structure

```
ai-chatbot/
├── Aicodingchatbot .HTML       # Single-file frontend
├── login.html                  # Auth page
├── .env.example                # Environment variables template
├── README.md
│
├── backend/                    # Express API server
│   ├── src/
│   │   ├── app.js              # Express config, middleware, routes
│   │   ├── server.js           # HTTP server entry point
│   │   ├── routes/
│   │   │   ├── auth.js         # POST /api/auth/register, /login, /me
│   │   │   ├── chat.js         # POST /api/chat, /api/chat/stream
│   │   │   ├── upload.js       # POST /api/upload, GET/DELETE /api/documents
│   │   │   └── execute.js      # POST /api/execute (JS + Python sandbox)
│   │   ├── services/
│   │   │   ├── groqService.js  # Groq SDK wrapper (chat + streaming)
│   │   │   ├── ragService.js   # RAG proxy (forwards to FastAPI)
│   │   │   └── agentRouter.js  # Multi-agent keyword classifier
│   │   └── middleware/
│   │       └── auth.js         # JWT verify middleware
│   └── package.json
│
└── rag_service/                # FastAPI RAG microservice
    ├── main.py                 # Endpoints: /query, /index, /index/file, /documents
    ├── requirements.txt
    └── rag/
        ├── pipeline.py         # Text chunking + indexing pipeline
        ├── embedder.py         # sentence-transformers wrapper
        └── vectorstore.py      # FAISS store with persistence
```

---

## 🌍 Deployment

### Option A: Backend on Render (Free Tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo, set **Root Directory** to `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add Environment Variables:
   ```
   GROQ_API_KEY=gsk_...
   JWT_SECRET=your-super-secret-key-here
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.netlify.app
   RAG_SERVICE_URL=https://your-rag-service.onrender.com
   ```

### Option B: Backend on Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
# Set env vars in Railway dashboard
```

### RAG Service on Render

1. Create a second Render service
2. Set **Root Directory** to `rag_service`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend on Netlify / Vercel

Since the frontend is served by Express, deploy both together **or** extract the HTML:

**Netlify (static):**
```bash
# Copy HTML files to a dist/ folder
cp "Aicodingchatbot .HTML" dist/index.html
cp login.html dist/login.html
# Change BACKEND_URL in HTML to your Render URL before deploying
netlify deploy --prod --dir dist
```

**Vercel:**
```bash
vercel --prod
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Your Groq API key |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (use a long random string in prod) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | — | Server port (default: 3001) |
| `FRONTEND_URL` | Prod | Allowed CORS origin(s), comma-separated |
| `RAG_SERVICE_URL` | — | FastAPI URL (default: http://localhost:8000) |
| `GROQ_DEFAULT_MODEL` | — | Default model (default: llama-3.3-70b-versatile) |

---

## 🔑 API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ email, password, name }` | Create account |
| POST | `/api/auth/login` | `{ email, password }` | Login, get JWT |
| GET | `/api/auth/me` | — (Bearer token) | Get current user |

### Chat
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | `{ userMessage, history, ragEnabled }` | Single response |
| POST | `/api/chat/stream` | `{ userMessage, history, ragEnabled }` | SSE streaming |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF/TXT, index into RAG |
| GET | `/api/documents` | List indexed documents |
| DELETE | `/api/documents/:source` | Remove from vector store |

### Code Execution
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/execute` | `{ code, language }` | Run Python or JavaScript |

---

## 🛡️ Security Notes

- API key is **never** exposed to the browser — all Groq calls go through the backend
- Passwords are hashed with **bcrypt** (cost factor 12)
- JWT tokens expire after **7 days**
- JS execution runs in an isolated **Node.js `vm` sandbox** (no require, no fs, no network)
- Python execution has a **5-second timeout** via SIGKILL
- Rate limiting: **60 requests/minute** per IP on all `/api` routes

> ⚠️ **Production upgrade**: Replace the in-memory user store in `routes/auth.js` with MongoDB/PostgreSQL/Supabase before going live.

---

## 🛠️ Tech Stack

**Frontend:** HTML5 · Vanilla JS · CSS3 (glassmorphism, animations)  
**Backend:** Node.js · Express 4 · JWT · bcryptjs · Multer  
**AI:** Groq API (llama-3.3-70b-versatile) · sentence-transformers  
**RAG:** FAISS · pdfplumber · FastAPI · Uvicorn  
**Deployment:** Render / Railway · Netlify / Vercel

---

## 📜 License

MIT — Built for portfolio and production use.
