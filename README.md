# ClinicOS

ClinicOS is a full-stack clinic management system using React, Vite, TypeScript, Express, Prisma, and PostgreSQL.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- ORM: Prisma
- Database: PostgreSQL 16
- Infrastructure: Docker Compose

## Project Structure

.
├── frontend/                 # React Vite TypeScript app
├── backend/                  # Express TypeScript API
│   ├── prisma/               # Prisma schema, migrations, seed
│   └── src/                  # API source code
├── docker-compose.yml        # PostgreSQL service
├── package.json              # Root orchestration scripts
└── README.md

## Root Scripts

- `npm run dev` — run frontend and backend together
- `npm run dev:frontend` — run the frontend only
- `npm run dev:backend` — run the backend only
- `npm run db:generate` — run Prisma generate in the backend
- `npm run db:migrate` — run Prisma migrations in the backend
- `npm run db:seed` — seed the database from the backend
- `npm run build` — build frontend and backend

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose

## PostgreSQL Defaults

The Docker setup starts PostgreSQL with these defaults:

- Host: `localhost`
- Port: `5432`
- Database: `clinicos`
- User: `clinicos`
- Password: `clinicos`

## Recommended Backend Environment

Create `backend/.env` with:

```env
DATABASE_URL="postgresql://clinicos:clinicos@localhost:5432/clinicos?schema=public"
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Quick Start

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   npm install --prefix frontend
   ```

3. Install backend dependencies:
   ```bash
   npm install --prefix backend
   ```

4. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Run database migrations:
   ```bash
   npm run db:migrate
   ```

7. Seed the database:
   ```bash
   npm run db:seed
   ```

8. Start the application:
   ```bash
   npm run dev
   ```

## Expected Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Notes

- The root package is an orchestrator for the `frontend` and `backend` apps.
- Prisma commands are delegated to the backend package.
- PostgreSQL data is persisted in the `clinicos_postgres_data` Docker volume.

---

## Production Deployment

### Overview

| Layer    | Platform | Service            |
|----------|----------|--------------------|
| Frontend | Vercel   | Static / Edge      |
| Backend  | Railway  | Node.js service    |
| Database | Railway  | PostgreSQL plugin  |

---

### Railway — Backend + PostgreSQL

#### 1. Create Railway project

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli
railway login
```

#### 2. Add PostgreSQL plugin

In the Railway dashboard, click **+ New** → **Database** → **PostgreSQL**.  
Railway sets `DATABASE_URL` automatically in the service environment.

#### 3. Deploy backend service

- Connect your GitHub repo to Railway.
- Set **Root Directory** to `backend`.
- Railway auto-detects `package.json`. Confirm these scripts exist:

  ```json
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev":   "tsx watch src/server.ts"
  }
  ```

#### 4. Set backend environment variables in Railway

| Variable        | Value                                  |
|-----------------|----------------------------------------|
| `DATABASE_URL`  | Auto-set by Railway PostgreSQL plugin  |
| `PORT`          | Auto-set by Railway (do not override)  |
| `NODE_ENV`      | `production`                           |
| `FRONTEND_URL`  | `https://your-app.vercel.app`          |

> To allow multiple Vercel preview URLs:  
> `FRONTEND_URLS=https://app.vercel.app,https://app-git-main.vercel.app`

#### 5. Run Prisma migration on Railway

After first deploy, run from Railway shell or CLI:

```bash
cd backend
npx prisma migrate deploy
```

Or add a **deploy command** in Railway:

```
npm run build && npx prisma migrate deploy
```

---

### Vercel — Frontend

#### 1. Import project

- Connect GitHub repo to Vercel.
- Set **Root Directory** to `frontend`.
- Framework preset: **Vite**.

#### 2. Set frontend environment variables in Vercel

| Variable       | Value                                   |
|----------------|-----------------------------------------|
| `VITE_API_URL` | `https://clinicos-backend-production-df88.up.railway.app` |

> Set this for **Production**, **Preview**, and **Development** environments as needed.

#### 3. Build settings (Vercel auto-detects, but verify)

| Setting       | Value           |
|---------------|-----------------|
| Build command | `npm run build` |
| Output dir    | `dist`          |
| Install cmd   | `npm install`   |

---

### Environment file reference

**`frontend/.env.example`**
```env
VITE_API_URL=http://localhost:3001
```

**`backend/.env.example`**
```env
DATABASE_URL="postgresql://user:password@host:5432/clinicos?schema=public"
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

---

### Migration commands

| Action               | Command                                      |
|----------------------|----------------------------------------------|
| Create migration     | `npm run db:migrate` (from repo root)        |
| Deploy to production | `cd backend && npx prisma migrate deploy`    |
| Generate client      | `cd backend && npx prisma generate`          |
| Seed database        | `npm run db:seed` (from repo root)           |
