# Production Deployment Runbook

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
