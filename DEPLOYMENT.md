# AssessPlatform — Deployment Guide

> Enterprise-grade online candidate assessment platform with live proctoring,
> aptitude & technical testing, auto-save, auto-submit, and real-time reporting.

---

## Architecture Overview

```
Frontend (Next.js 16 — port 3000)
  React + TanStack Query + Tailwind CSS
        |
        | REST API + WebSocket
        |
Backend (Express.js — port 4000)
  TypeScript + Prisma ORM + Socket.io
        |
        | Prisma Client
        |
Database (SQLite dev / PostgreSQL prod)
  File: backend/prisma/dev.db
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x LTS |
| npm | 9.x |
| Git | 2.x |
| PostgreSQL (prod) | 14+ |

---

## Environment Variables

### Backend — `backend/.env`

```env
# Database (SQLite for dev, PostgreSQL for prod)
DATABASE_URL="file:./dev.db"
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"

# Authentication
JWT_SECRET="your-secure-jwt-secret-min-32-chars"
JWT_REFRESH_SECRET="your-secure-refresh-secret-min-32-chars"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=production

# CORS
CORS_ORIGIN="http://localhost:3000"

# Rate limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_WS_URL="http://localhost:4000"
```

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd Online-Candidate-Assessment

cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Start Dev Servers

Terminal 1 — Backend:
```bash
cd backend && npm run dev
# http://localhost:4000
```

Terminal 2 — Frontend:
```bash
cd frontend && npm run dev
# http://localhost:3000
```

---

## Production Build

### Backend

```bash
cd backend
npm run build        # Compiles TypeScript -> dist/
node dist/server.js  # Start server
# or: pm2 start dist/server.js --name assess-backend
```

### Frontend

```bash
cd frontend
npm run build        # Next.js production bundle -> .next/
npm run start        # Serve on port 3000
# or: pm2 start npm --name assess-frontend -- start
```

---

## Database Commands

### Prisma Migrate

```bash
cd backend

# Development
npx prisma migrate dev

# Production (no prompts, no shadow DB)
npx prisma migrate deploy

# Reset (DESTRUCTIVE — drops all data)
npx prisma migrate reset

# Regenerate client after schema changes
npx prisma generate
```

### Prisma Seed

```bash
cd backend
npx prisma db seed
```

**What the seed creates:**

| Type | Count | Details |
|------|-------|---------|
| Super Admin | 1 | superadmin@assessment.local / ChangeMe123! |
| Candidates | 50 | candidate1..50@example.com / Candidate@123 |
| Questions | 50 | 20 Aptitude + 30 Technical |
| Exam | 1 | "Full Stack Developer Assessment Drive" (30 min) |
| Exam Sessions | 50 | One per candidate — status NOT_STARTED |

**Question Breakdown:**

| Section | Domain | Count |
|---------|--------|-------|
| Aptitude | Quantitative Aptitude | 5 |
| Aptitude | Logical Reasoning | 5 |
| Aptitude | Verbal Ability | 5 |
| Aptitude | Data Interpretation | 5 |
| Technical | Java | 5 |
| Technical | Python | 5 |
| Technical | C Programming | 5 |
| Technical | DBMS | 5 |
| Technical | Operating Systems | 5 |
| Technical | Computer Networks | 5 |

---

## PostgreSQL Production Setup

```bash
createdb assess_platform_prod

# Set DATABASE_URL in backend/.env:
# DATABASE_URL="postgresql://user:pass@localhost:5432/assess_platform_prod"

cd backend
npx prisma migrate deploy
npx prisma db seed
```

---

## Health Check URLs

| Service | URL | Expected |
|---------|-----|---------|
| Frontend | http://localhost:3000 | HTTP 200 |
| Candidate Login | http://localhost:3000/login | HTTP 200 |
| Admin Login | http://localhost:3000/admin/login | HTTP 200 |
| Backend Auth | POST http://localhost:4000/api/v1/auth/admin/login | {"success":true} |
| Backend Sessions | GET http://localhost:4000/api/v1/exam-sessions/all | Array |

Quick check:
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superadmin@assessment.local\",\"password\":\"ChangeMe123!\"}"
```

---

## Default Credentials

### Super Admin

| Field | Value |
|-------|-------|
| Email | superadmin@assessment.local |
| Password | ChangeMe123! |
| Role | SUPER_ADMIN |
| Login URL | http://localhost:3000/admin/login |

> IMPORTANT: Change this password immediately in production.

### Default Candidates

| Field | Pattern |
|-------|---------|
| Email | candidate{N}@example.com (N=1..50) |
| Password | Candidate@123 |
| Login URL | http://localhost:3000/login |

Examples:
- candidate1@example.com / Candidate@123
- candidate2@example.com / Candidate@123
- candidate50@example.com / Candidate@123

---

## Application Routes

### Public Routes
| Route | Description |
|-------|-------------|
| / | Landing page |
| /login | Candidate login |
| /register | Candidate self-registration |
| /admin/login | Admin login |

### Candidate Routes (auth required)
| Route | Description |
|-------|-------------|
| /dashboard | My exams & profile |
| /exam/[sessionId]/system-check | Hardware check |
| /exam/[sessionId]/instructions | Exam rules |
| /exam/[sessionId] | Live exam + palette + timer |

### Admin Routes (ADMIN role required)
| Route | Description |
|-------|-------------|
| /admin/dashboard | KPI cards + live feed |
| /admin/questions | Question bank (CRUD + import) |
| /admin/exams | Exam management |
| /admin/candidates | Roster + scores + details |
| /admin/live-proctoring | Real-time session monitoring |

---

## Backend API Reference

### Auth
```
POST /api/v1/auth/admin/login
POST /api/v1/auth/candidate/login
POST /api/v1/auth/candidate/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Questions
```
GET    /api/v1/questions
POST   /api/v1/questions
PUT    /api/v1/questions/:id
DELETE /api/v1/questions/:id
POST   /api/v1/questions/import/excel
GET    /api/v1/questions/export/excel
```

### Exams
```
GET    /api/v1/exams
POST   /api/v1/exams
PUT    /api/v1/exams/:id
DELETE /api/v1/exams/:id
```

### Exam Sessions
```
POST   /api/v1/exam-sessions              Start / resume
GET    /api/v1/exam-sessions/my           Candidate's sessions
GET    /api/v1/exam-sessions/all          All sessions (admin)
GET    /api/v1/exam-sessions/:id          Detail + questions
POST   /api/v1/exam-sessions/:id/answer   Save answer
POST   /api/v1/exam-sessions/:id/submit   Submit exam
POST   /api/v1/exam-sessions/:id/warning  Log warning
POST   /api/v1/exam-sessions/:id/disqualify  Admin DQ
POST   /api/v1/exam-sessions/:id/force-submit  Admin force submit
POST   /api/v1/exam-sessions/:id/heartbeat  Keepalive
```

---

## CI / CD Checklist

```bash
# Backend — must all pass
cd backend
npm run lint      # 0 errors
npm run build     # 0 TS errors

# Frontend — must all pass
cd frontend
npm run lint      # 0 errors
npm run typecheck # 0 errors
npm run build     # All 15 routes compiled
```

---

## Troubleshooting

### Login fails
```bash
cd backend
npx prisma db seed          # Re-seed users
npx prisma studio           # Inspect DB at http://localhost:5555
```

### "Table not found" Prisma error
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Port already in use (Windows)
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F

netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### CORS error in browser
Set `CORS_ORIGIN` in `backend/.env` to your production frontend URL:
```env
CORS_ORIGIN="https://your-domain.com"
```

---

## Project Structure

```
Online-Candidate-Assessment/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        Database schema
│   │   ├── seed.ts              Seeder (safe to re-run)
│   │   └── migrations/          Migration history
│   └── src/
│       ├── modules/             auth / exams / exam-sessions / questions
│       ├── middleware/          auth-guard, rate-limit, error handler
│       ├── utils/               AppError, formatQuestion
│       └── sockets/             Socket.io proctor events
│
├── frontend/
│   └── src/
│       ├── app/                 Next.js App Router
│       │   ├── (admin)/         Admin route group + layout
│       │   ├── dashboard/       Candidate dashboard
│       │   ├── exam/            Live exam engine
│       │   └── login/           Auth pages
│       ├── components/          ui / layout / providers / marketing
│       ├── services/            API client + service layer
│       ├── types/               TypeScript definitions
│       └── utils/               Client helpers
│
└── DEPLOYMENT.md                This file
```

---

*Generated: 2026-07-27 | Version: 1.0.0*
