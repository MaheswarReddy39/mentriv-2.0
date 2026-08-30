# Mentriv 2.0

A production-ready EdTech platform. This repository currently contains only the **Step 1: Project Foundation** — a clean full-stack scaffold with no business logic yet.

## Tech Stack

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node.js + Express (`server/`)

## Project Structure

```
mentriv-2.0/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.js
├── server/          # Express backend
│   ├── index.js
│   ├── .env.example
│   └── .env         # local only, never committed
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js >= 20
- npm >= 10

## Getting Started

### 1. Install dependencies

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### 2. Set up environment variables

Copy each `.env.example` to a `.env` file and adjust values as needed:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Run the development servers

```bash
# Backend (http://localhost:5000)
cd server
npm run dev

# Frontend (http://localhost:5173) — in a separate terminal
cd client
npm run dev
```

## Scripts

| Location | Command         | Description                       |
| -------- | --------------- | --------------------------------- |
| `client` | `npm run dev`   | Start Vite dev server             |
| `client` | `npm run build` | Production build                  |
| `client` | `npm run preview` | Preview production build        |
| `server` | `npm run dev`   | Start Express with auto-reload    |
| `server` | `npm start`     | Start Express (production mode)   |

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description              |
| -------- | ------- | ------------------------ |
| `PORT`   | `5000`  | Port the API listens on  |

### Client (`client/.env`)

| Variable            | Default                    | Description                                   |
| ------------------- | -------------------------- | --------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5000`    | Base URL of the backend API                   |

> Only variables prefixed with `VITE_` are exposed to the frontend.

## Status / Roadmap

- [x] **Step 1:** Project foundation (frontend + backend scaffolding)
- [ ] Step 2+: Authentication, database, APIs, payments, admin features *(not implemented yet)*
