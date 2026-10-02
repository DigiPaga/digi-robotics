# Production Deployment Runbook

> **Status:** the live deployment runs on Cloudflare Workers, not Docker Compose (see `deployment/README.md`). The steps below describe an earlier plan: the repository has no `docker-compose.prod.yml`, and the Prisma schema is not used by the running services.

## Prerequisites
- Node.js v20+
- Docker & Docker Compose
- PostgreSQL 15+ (or Supabase account)
- Domain name configured (e.g., api.digirobotics.com)

## Step 1: Environment Setup
Copy `.env.example` to `.env` and fill in production secrets:
- `DATABASE_URL`
- `PRIVATE_KEY` (Use a hardware wallet or secrets manager in prod)
- `PINATA_JWT`
- `ZERODEV_PROJECT_ID`

## Step 2: Database Migration
Run Prisma migrations to set up the production schema:
npx prisma migrate deploy

## Step 3: Build & Start Services
docker-compose -f docker-compose.prod.yml up -d --build

## Step 4: Verify Health
curl https://api.digirobotics.com/health
Expected: {"status": "ok", "message": "DigiRobotics x402 Backend..."}

## Step 5: Monitor Logs
docker-compose logs -f x402-server
