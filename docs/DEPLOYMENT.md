# Deployment Guide

## Prerequisites

- Node.js v20+
- PostgreSQL (optional for caching)
- Redis (optional for rate limiting)
- PM2 or Docker for process management

## Environment Setup

```bash
cp .env.example .env
# Edit .env with production values
```

## Build

```bash
npm run build
```

## Production Start

### Option 1: PM2
```bash
pm2 start dist/index.js --name digipaga-x402
pm2 save
pm2 startup
```

### Option 2: Docker
```bash
docker build -t digipaga/x402-server .
docker run -p 3001:3001 --env-file .env digipaga/x402-server
```

### Option 3: Systemd
```bash
sudo nano /etc/systemd/system/digipaga-x402.service
sudo systemctl enable digipaga-x402
sudo systemctl start digipaga-x402
```

## Monitoring

- Health check: `http://your-domain:3001/health`
- Logs: `pm2 logs digipaga-x402` or `journalctl -u digipaga-x402 -f`

## SSL/TLS

Use Nginx as reverse proxy with Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name api.digipaga.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
