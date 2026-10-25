#!/bin/bash
echo "🚀 Starting DigiRobotics Local Development Environment..."

# Start x402 backend in background
echo "Starting x402-server on port 3001..."
cd x402-server
npm run dev &
X402_PID=$!

# Wait a moment for backend to initialize
sleep 3

# Start Next.js frontend
echo "Starting Next.js frontend on port 3000..."
cd ../web
npm run dev

# Cleanup on exit
trap "kill $X402_PID" EXIT
