# 🎬 DigiRobotics Demo Guide

## 1. Mobile Data Capture (Production)
1. Open `https://digirobotics.xyz/capture` on a mobile device or desktop browser.
2. Grant camera/microphone permissions when prompted.
3. Click "Start Recording", capture a short clip, and click "Stop".
4. Click "Upload" to see the direct-to-Supabase upload flow.

## 2. x402 Autonomous Agent (Local Development)
1. Ensure you have the x402 backend running: `cd x402-server && npm run dev`
2. In a new terminal, start the frontend: `cd web && npm run dev`
3. Open `http://localhost:3000/agent-demo`
4. Connect your wallet (ensure you are on Arbitrum Sepolia).
5. Click "START NEW RUN" to watch the autonomous discovery and payment flow.

## 3. Database Verification
Run `npx prisma studio` in the `web/` directory to view live User and Clip records in Neon PostgreSQL.
