# API Testing Guide (x402 Flow)

This guide provides cURL commands to test the core x402 payment flow manually.

## 1. Check Server Health
curl -X GET http://localhost:3001/health

## 2. Browse Available Datasets (Retail Submissions)
curl -X GET "http://localhost:3001/api/submissions?category=industrial&minScore=90"

## 3. Simulate a Purchase Request (Expect 402 Payment Required)
curl -X GET http://localhost:3001/api/purchase/1

## 4. Execute Payment (Mock Signature)
curl -X POST http://localhost:3001/api/purchase/1 \
  -H "Content-Type: application/json" \
  -H "X-Agent-Address: 0x1234567890123456789012345678901234567890" \
  -H "X-Signature: 0xmock_signature_for_testing" \
  -H "X-Payment-Proof: 1"

## 5. Create a New Data Bounty (Robot Builder Flow)
curl -X POST http://localhost:3001/api/bounties \
  -H "Content-Type: application/json" \
  -d '{"requesterAddress": "0x123...", "title": "Need soldering data", "bountyAmount": "5.00"}'
