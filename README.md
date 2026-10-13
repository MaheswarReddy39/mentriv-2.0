# Mentriv 2.0

A full-stack MERN learning platform with separate Student, Teacher and Admin experiences — course enrollment, classes, assignments, MCQ tests, in-browser coding practice, progress tracking, and an AI support chatbot.

- **Live app:** https://mentriv.vercel.app/
- **API:** https://mentriv.onrender.com

> The backend runs on Render and may take ~20–30 seconds to respond after a period of inactivity.

> **Status:** Core platform implemented. Payments currently use a **manual, screenshot-based verification flow**; online payment-gateway integration is **pending**.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Monaco Editor, react-markdown |
| Backend | Node.js, Express 5, express-validator |
| Database | MongoDB Atlas with Mongoose |
| Auth | JWT access tokens, bcrypt password hashing |
| Email | Nodemailer (SMTP) |
| AI | Qdrant vector DB, Gemini embeddings, LLMs via OpenRouter with Groq and Gemini fallbacks |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Features

### Authentication & Access Control
- Student registration and separate teacher registration
- Email verification, account activation, forgot/reset password and change password
- JWT-based authentication with bcrypt-hashed passwords
- Role-based access control for `student`, `teacher`, `admin` and `superAdmin`, enforced by API role middleware and role-specific protected routes in the client

### Students
- Browse courses and enroll
- Classes, assignments and submissions
- MCQ tests with attempt tracking
- Coding practice in a Monaco-based editor with automated evaluation
- Course progress, learning streaks, achievements and leaderboard
- Notifications and announcements
- View their own payment submissions

### Teachers
- Teacher dashboard
- Create and manage MCQ tests, assignments and coding tasks
- AI-assisted conversion of pasted text into structured MCQ questions (Gemini)

### Admins
- Dashboard and management of courses, classes, students, teachers, enrollments, submissions, MCQs, announcements and notifications
- Review payment submissions and mark them verified or rejected

### AI Support Chatbot
- Public chatbot using retrieval-augmented generation (RAG) over documents in `Knowledge/`
- Embeddings stored in Qdrant; responses can be streamed
- LLM provider fallback: OpenRouter → Groq → Gemini
- Rate-limited chat endpoints

### Coding Evaluation
- JavaScript tasks run against test cases in a separate Node.js process with a per-case timeout
- Frontend / React / MERN tasks are checked against the task's listed requirements

## Payments

Online payment-gateway integration is **not yet implemented**. The current manual flow:

1. The student scans the payment QR code shown during registration.
2. The student submits the transaction ID and a payment screenshot link for their enrollment.
3. An admin reviews the submission and marks it `verified` or `rejected` (initial status: `pending`).

## Verification Status

| Area | Status |
|---|---|
| Frontend deployment, backend availability, database-backed course API, and frontend/backend CORS | Verified in production |
| Authentication, role-based access, manual payments, teacher/admin features | Implementation identified in code; end-to-end production testing not completed |
| AI chatbot, email delivery, and coding evaluation | Implementation identified in code; production functionality not verified |

## Project Structure

```
mentriv-2.0/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # UI, chatbot, navigation, route guards
│       ├── context/        # Auth and theme context
│       ├── layouts/        # Public, auth, student, teacher, admin layouts
│       ├── pages/          # Route pages per role
│       └── services/       # API clients
├── server/                 # Express backend
│   ├── index.js
│   ├── scripts/            # Knowledge ingestion and test scripts
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/     # auth, role, validation, rate limit, errors
│       ├── models/         # Mongoose models
│       ├── routes/         # Mounted under /api/v1
│       └── services/
├── Knowledge/              # Source documents for the chatbot
└── docs/api-contract.md
```

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 8 and Mongoose 9) and npm
- A MongoDB Atlas cluster (or local MongoDB)
- Optional: SMTP credentials, a Qdrant instance and LLM API keys for email and chatbot features

### Install

```bash
cd server && npm install
cd ../client && npm install
```

### Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in the values in each `.env`. Never commit `.env` files.

### Run locally

```bash
# Backend — http://localhost:5000
cd server
npm run dev

# Frontend — http://localhost:5173 (separate terminal)
cd client
npm run dev
```

### Load chatbot knowledge (optional)

```bash
cd server
node scripts/ingest-knowledge.js
```

## Environment Variables

### Server (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment |
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` | JWT signing secret and lifetime |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`, `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES`, `ACCOUNT_ACTIVATION_TOKEN_TTL_MINUTES` | Token lifetimes |
| `APP_FRONTEND_URL` | Base URL used in emailed links |
| `CORS_ORIGIN` | Allowed frontend origin |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | Email delivery (optional; emails are skipped if unset) |
| `ADMIN_EMAIL` | Receives administrative notifications |
| `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` | Vector database |
| `GEMINI_EMBEDDING_API_KEY`, `GEMINI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSION` | Embeddings |
| `OPENROUTER_API_KEY`, `LLM_MODEL` | Primary LLM provider |
| `GROQ_API_KEY`, `GROQ_MODEL` | Fallback LLM provider |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Fallback LLM and MCQ parsing |

### Client (`client/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin. Defaults to `http://localhost:5000` if unset. |

> Only variables prefixed with `VITE_` are exposed to client-side code by Vite, and they are embedded in the public build. Never put secrets in `client/.env`.

## Scripts

| Location | Command | Description |
| --- | --- | --- |
| `client` | `npm run dev` | Vite dev server |
| `client` | `npm run build` | Production build |
| `client` | `npm run preview` | Preview production build |
| `server` | `npm run dev` | Start API with `node --watch` |
| `server` | `npm start` | Start API |

## Deployment

| Part | Platform | URL |
| --- | --- | --- |
| Frontend | Vercel | https://mentriv.vercel.app/ |
| Backend | Render | https://mentriv.onrender.com |
| Database | MongoDB Atlas | — |

- **Vercel:** `client/vercel.json` rewrites all routes to `index.html` for client-side routing. Set `VITE_API_BASE_URL=https://mentriv.onrender.com`.
- **Render:** root directory `server/`, start command `npm start`. Set all server environment variables, including `CORS_ORIGIN=https://mentriv.vercel.app` and `APP_FRONTEND_URL=https://mentriv.vercel.app`. No `render.yaml` is included; settings are configured in the Render dashboard.

## Roadmap

- [ ] Online payment-gateway integration
