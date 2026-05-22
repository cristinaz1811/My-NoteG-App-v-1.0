# Note G — Coding Learning Platform

An interactive platform for learning and teaching programming. Students enroll in
courses, solve in-browser code exercises with automated test grading and AI hints,
and track their progress; professors create courses, manage exercises, run
plagiarism checks, and view class analytics.

## Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | React 18, React Router, Tailwind CSS, Monaco Editor     |
| Backend   | Node.js, Express, WebSocket (`ws`), JWT auth            |
| Database  | PostgreSQL                                              |
| Cache/Queue | Redis, BullMQ                                         |
| Dashboard | Streamlit (Python) — separate analytics app            |
| AI        | OpenAI API (exercise hints, complexity analysis)        |

## Repository Structure

```
backend/    Express REST API + WebSocket server
frontend/   React single-page application
database/   PostgreSQL schema and migrations
dashboard/  Streamlit analytics dashboard
docs/       Deployment notes
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional, for the containerized setup)

## Quick Start (Docker)

```bash
docker-compose up --build
```

This starts PostgreSQL, Redis, the API, a queue worker, the Streamlit dashboard,
and the frontend.

## Manual Setup

### 1. Database

Create a PostgreSQL database, then load the schema and migrations:

```bash
psql -d code_learning -f database/schema.sql
psql -d code_learning -f database/docker-migrations.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # then fill in the values
npm install
npm run dev            # starts on http://localhost:5000
```

Required environment variables (see `backend/.env.example`): `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`. The server fails fast at startup
if any are missing.

### 3. Frontend

```bash
cd frontend
npm install
npm start              # starts on http://localhost:3000
```

## Useful Scripts

### Backend (`/backend`)

| Command           | Description                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Start the API with auto-reload       |
| `npm start`       | Start the API                        |
| `npm run lint`    | Run ESLint                           |
| `npm run lint:fix`| Run ESLint and auto-fix              |
| `npm run format`  | Format the code with Prettier        |

### Frontend (`/frontend`)

| Command          | Description                  |
|------------------|------------------------------|
| `npm start`      | Start the dev server         |
| `npm run build`  | Production build             |
| `npm test`       | Run the test suite           |

## Seeding Demo Content

`backend/seed-real-content.js` populates the database with sample courses,
chapters, exercises, and test cases:

```bash
cd backend && node seed-real-content.js
```
