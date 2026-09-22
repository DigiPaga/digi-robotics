# API Documentation

Base URL: `http://localhost:3001/api`

## Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "DigiPaga x402 Server is running",
  "timestamp": "2026-09-15T10:00:00.000Z"
}
```

### Catalog

```
GET /catalog?{type,category,search,minPrice,maxPrice}
```

**Query Parameters:**
- `type` (optional): Filter by type (pdf, video, dataset, cad, json, csv)
- `category` (optional): Filter by category
- `search` (optional): Search by name
- `minPrice` (optional): Minimum price in USDC
- `maxPrice` (optional): Maximum price in USDC

**Response:**
```json
{
  "success": true,
  "assets": [...],
  "total": 5,
  "filters": { ... }
}
```

### Assets

```
GET /assets/:id
```

**Headers Required:**
- `X-Agent-Address`: Agent's Ethereum address
- `X-Signature`: EIP-712 signature
- `X-Payment-Proof`: Payment proof

**Response (200 OK):**
```json
{
  "success": true,
  "asset": { ... },
  "data": { ... }
}
```

**Response (402 Payment Required):**
```json
{
  "error": "Payment Required",
  "message": "This asset requires a micro-payment to access.",
  "paymentDetails": {
    "price": "0.50",
    "currency": "USDC",
    "network": "arbitrum-sepolia",
    "recipient": "0x...",
    "requiredHeaders": ["X-Payment-Proof", "X-Agent-Address", "X-Signature"]
  }
}
```

### Verify Agent

```
POST /verify
```

**Body:**
```json
{
  "address": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "agent": {
    "address": "0x...",
    "agentType": "vps",
    "isActive": true
  }
}
```
