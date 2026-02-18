# EC2 Deployment Guide: WebRTC Messaging App

Complete guide to deploy the messaging app on AWS EC2 with Nginx, HTTPS (Let's Encrypt), and Coturn TURN server.

---

## 1. EC2 Instance Setup

### 1.1 Launch EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Click **Launch Instances**
3. Choose:
   - **AMI**: Ubuntu Server 22.04 LTS (free tier eligible)
   - **Instance Type**: `t3.small` or `t3.medium` (for production, at least 2GB RAM)
   - **Storage**: 30GB gp3 recommended
4. Click **Review and Launch**

### 1.2 Configure Security Group

Create/select a security group with these **inbound rules**:

| Protocol | Port(s)            | Source      | Purpose                  |
|----------|-------------------|-------------|--------------------------|
| TCP      | 22                | Your IP     | SSH (restrict to your IP) |
| TCP      | 80                | 0.0.0.0/0   | HTTP (Nginx → HTTPS)     |
| TCP      | 443               | 0.0.0.0/0   | HTTPS (Nginx)            |
| TCP      | 3478              | 0.0.0.0/0   | Coturn TCP               |
| UDP      | 3478              | 0.0.0.0/0   | Coturn UDP               |
| TCP      | 5349              | 0.0.0.0/0   | Coturn TLS               |
| UDP      | 49152–65535       | 0.0.0.0/0   | Coturn relay ports       |

**⚠️ Production tip**: Restrict SSH (port 22) to your IP or VPN only.

### 1.3 Elastic IP

1. In EC2 console, go to **Elastic IPs**
2. Click **Allocate Elastic IP Address**
3. Allocate one, then **Associate** it with your running instance
4. Note the **Public IP** (you'll use this for domain DNS)

### 1.4 Domain & DNS

1. Buy a domain (e.g., `messaging.example.com`) from Route 53, GoDaddy, Namecheap, etc.
2. Point the **A record** to your **Elastic IP**
3. Wait ~5–15 minutes for DNS propagation
4. Test: `nslookup messaging.example.com` (should resolve to your IP)

---

## 2. SSH into EC2 and Install Docker

### 2.1 Connect to EC2

```bash
# Use your key pair file
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP
# or
ssh -i /path/to/your-key.pem ubuntu@messaging.example.com
```

### 2.2 Update system packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2.3 Install Docker

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 2.4 Add ubuntu user to docker group (so no need for sudo)

```bash
sudo usermod -aG docker ubuntu
# Log out and back in for this to take effect
```

### 2.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.6 Install Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 3. Clone Repository and Set Up Project

### 3.1 Clone the repo

```bash
cd /srv
sudo git clone https://github.com/YOUR_USERNAME/messaging-app.git
sudo chown -R ubuntu:ubuntu messaging-app
cd messaging-app
```

### 3.2 Create `.env` file from template

```bash
cp .env.example .env
nano .env  # or vi .env
```

Fill in production values:

```env
# Node environment
NODE_ENV=production

# Database (use RDS in production)
DATABASE_URL=postgres://user:password@postgres:5432/messaging

# Redis (use Elasticache in production)
REDIS_URL=redis://redis:6379

# JWT secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-generate-this-randomly
JWT_REFRESH_SECRET=your-super-secret-refresh-key-generate-this-randomly

# Domain
PUBLIC_DOMAIN=messaging.example.com
CORS_ORIGIN=https://messaging.example.com

# TURN Server
TURN_EXTERNAL_IP=YOUR_ELASTIC_IP
TURN_USERNAME=turnuser
TURN_PASSWORD=generate-strong-turn-password
TURN_REALM=messaging.example.com
TURN_CLI_PASSWORD=generate-strong-cli-password

# Frontend (build-time)
REACT_APP_API_URL=https://messaging.example.com/api
REACT_APP_SOCKET_URL=https://messaging.example.com
REACT_APP_TURN_SERVERS=[{"urls":["turn:messaging.example.com:3478"],"username":"turnuser","credential":"generate-strong-turn-password"}]
```

**Generate secure random strings:**

```bash
# In terminal, run:
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
openssl rand -hex 16  # For TURN_PASSWORD
openssl rand -hex 16  # For TURN_CLI_PASSWORD
```

### 3.3 Backend `.env`

```bash
cp backend/.env.example backend/.env
# Copy values from root `.env` into this file
```

### 3.4 Frontend `.env`

```bash
cp frontend/.env.example frontend/.env
# Add build-time vars:
echo "REACT_APP_API_URL=https://messaging.example.com/api" >> frontend/.env
echo "REACT_APP_SOCKET_URL=https://messaging.example.com" >> frontend/.env
echo "REACT_APP_TURN_SERVERS='[{\"urls\":[\"turn:messaging.example.com:3478\"],\"username\":\"turnuser\",\"credential\":\"TURN_PASSWORD\"}]'" >> frontend/.env
```

---

## 4. Configure Nginx for HTTPS & Reverse Proxy

### 4.1 Create Nginx config (before HTTPS)

```bash
sudo nano /etc/nginx/sites-available/messaging-app
```

Add this **temporary HTTP-only block** (for Let's Encrypt):

```nginx
server {
    listen 80;
    server_name messaging.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

Enable the config:

```bash
sudo ln -s /etc/nginx/sites-available/messaging-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.2 Issue TLS Certificate with Let's Encrypt

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d messaging.example.com
```

This creates:
- `/etc/letsencrypt/live/messaging.example.com/fullchain.pem`
- `/etc/letsencrypt/live/messaging.example.com/privkey.pem`

### 4.3 Update Nginx config with HTTPS & proxy

```bash
sudo nano /etc/nginx/sites-available/messaging-app
```

Replace with full HTTPS config:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name messaging.example.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name messaging.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/messaging.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/messaging.example.com/privkey.pem;

    # SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (enforce HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/messaging-access.log;
    error_log /var/log/nginx/messaging-error.log;

    # Frontend (React SPA served from backend container on port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For WebSocket upgrades if needed
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket endpoint for Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket upgrade headers (required for Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.4 Auto-renew certificates (optional but recommended)

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 5. Start Docker Compose Services

### 5.1 Build and start

```bash
cd /srv/messaging-app
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 5.2 Verify services are running

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Expected output:
```
NAME                 IMAGE                           STATUS
postgres             postgres:15-alpine              Up
redis                redis:7-alpine                  Up
coturn               coturn/coturn:4                 Up
backend              messaging-app_backend:latest    Up
frontend             messaging-app_frontend:latest   Up
```

### 5.3 Check backend logs for DB initialization

```bash
docker compose -f docker-compose.prod.yml logs backend
# Should see: "Server running on port 5000"
```

---

## 6. Test the Application

### 6.1 Access via browser

Open: `https://messaging.example.com` in your browser

You should see:
- **Frontend loads** (HTTPS certificate is valid)
- No certificate warnings
- Registration/Login page appears

### 6.2 Test registration & login

1. Register a new account with email and password
2. Log in
3. Verify the page loads

### 6.3 Test messaging

1. Register a second user (different email)
2. Log in as first user in one browser/tab
3. Log in as second user in another browser/tab
4. Send messages between them
5. Verify messages appear in real-time

### 6.4 Test video call (if implemented)

1. From user 1: click user 2 to start a call
2. On user 2: call notification should appear
3. Accept the call
4. Verify video/audio streams (requires `getUserMedia` permissions)

### 6.5 Test TURN server connectivity

If WebRTC video/audio fails, check Coturn:

```bash
docker compose -f docker-compose.prod.yml logs coturn
# Look for listener init logs and any errors
```

Test TURN port accessibility:

```bash
# From your local machine
nc -zv messaging.example.com 3478   # TCP
nc -zvu messaging.example.com 3478  # UDP
```

---

## 7. Database & Persistence

### 7.1 Local Postgres (current setup)

Data persists in Docker volume `pgdata`. To backup:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres messaging > backup.sql
```

### 7.2 Upgrade to AWS RDS (recommended for production)

1. Create RDS Postgres instance in AWS:
   - Engine: PostgreSQL 14+
   - DB instance class: `db.t3.micro` or larger
   - Publicly accessible: **Yes** (or use VPC peering)
   - Security group: allow Postgres (5432) from EC2 security group

2. Get RDS endpoint: `mydb.XXXXXX.us-east-1.rds.amazonaws.com`

3. Update `.env`:
   ```env
   DATABASE_URL=postgres://admin:password@mydb.XXXXXX.us-east-1.rds.amazonaws.com:5432/messaging
   ```

4. Restart backend:
   ```bash
   docker compose -f docker-compose.prod.yml up -d backend
   ```

### 7.3 Upgrade to AWS Elasticache (Redis)

1. Create Elasticache Redis cluster in AWS
2. Get endpoint: `myredis.XXXXXX.ng.0001.use1.cache.amazonaws.com`
3. Update `.env`:
   ```env
   REDIS_URL=redis://myredis.XXXXXX.ng.0001.use1.cache.amazonaws.com:6379
   ```
4. Restart services

---

## 8. Monitoring & Logs

### 8.1 View real-time logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f coturn
```

### 8.2 Nginx logs

```bash
sudo tail -f /var/log/nginx/messaging-access.log
sudo tail -f /var/log/nginx/messaging-error.log
```

### 8.3 System resource usage

```bash
docker stats
```

### 8.4 SSH into container for debugging

```bash
docker compose -f docker-compose.prod.yml exec backend bash
docker compose -f docker-compose.prod.yml exec frontend sh
```

---

## 9. Troubleshooting

### 9.1 HTTPS certificate warnings

- Verify domain DNS resolves: `nslookup messaging.example.com`
- Check cert: `sudo certbot certificates`
- Renew if needed: `sudo certbot renew --dry-run`

### 9.2 WebRTC video/audio not working

- Ensure Elastic IP is public and reachable
- Check Coturn logs: `docker compose logs coturn`
- Verify TURN credentials in `.env` match `TURN_SERVERS` in frontend
- Test ports: `nc -zv messaging.example.com 3478` (TCP), `nc -zvu messaging.example.com 3478` (UDP)

### 9.3 Socket.IO connection refused

- Check backend logs: `docker compose logs backend`
- Verify `CORS_ORIGIN` and `REACT_APP_SOCKET_URL` match domain
- Check Nginx proxy: `sudo nginx -T`

### 9.4 Database connection errors

- Verify `DATABASE_URL` env var is set correctly
- Check Postgres is running: `docker compose ps postgres`
- View Postgres logs: `docker compose logs postgres`

### 9.5 Out of memory

- Upgrade EC2 instance type (t3.small → t3.medium/large)
- Check container resource limits: edit `docker-compose.prod.yml`

---

## 10. Deployment Automation (Optional)

### 10.1 Simple deploy script

Create `/srv/messaging-app/deploy-prod.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /srv/messaging-app

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "✅ Deployment complete. Use 'docker compose -f docker-compose.prod.yml logs -f' to watch."
```

Make executable:

```bash
chmod +x /srv/messaging-app/deploy-prod.sh
```

Run:

```bash
/srv/messaging-app/deploy-prod.sh
```

### 10.2 GitHub Actions CI/CD (future enhancement)

Add `.github/workflows/deploy.yml` to auto-deploy on push to `main` branch:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy via SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh -i ~/.ssh/id_rsa ubuntu@messaging.example.com '/srv/messaging-app/deploy-prod.sh'
```

---

## 11. Security Checklist

- [ ] SSH key pair stored securely (not in repo)
- [ ] Security group restricts SSH to your IP
- [ ] `.env` file with secrets NOT in git (only `.env.example`)
- [ ] SSL/TLS certificate active (verify with `https://www.ssllabs.com/ssltest/`)
- [ ] Coturn credentials changed from defaults
- [ ] JWT secrets are strong random values
- [ ] Database password is complex
- [ ] Backups configured (RDS automated backup or manual `pg_dump`)
- [ ] CloudWatch or similar monitoring enabled
- [ ] Rate limiting enabled on API endpoints (future enhancement)

---

## 12. Quick Reference

### Common Commands

```bash
# View all services
docker compose -f docker-compose.prod.yml ps

# Follow logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild frontend (after env changes)
docker compose -f docker-compose.prod.yml build frontend

# SSH into backend
docker compose -f docker-compose.prod.yml exec backend bash

# Database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres messaging > backup_$(date +%s).sql

# Restore database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres messaging < backup.sql
```

### Key Files

- **Nginx config**: `/etc/nginx/sites-available/messaging-app`
- **Certificates**: `/etc/letsencrypt/live/messaging.example.com/`
- **Docker Compose**: `/srv/messaging-app/docker-compose.prod.yml`
- **Environment**: `/srv/messaging-app/.env`
- **Logs**: `docker compose logs`

---

## 13. Support & Next Steps

If you encounter issues:
1. Check logs: `docker compose logs backend` (or other service)
2. Review this guide's **Troubleshooting** section
3. Verify all `.env` values match your domain and credentials
4. Ensure security group ports are open
5. Test connectivity: `nc -zv domain.com PORT`

For scaling production:
- Use LoadBalancer (AWS ALB/NLB)
- Multi-region deployment
- CDN for static assets (CloudFront)
- Monitoring with CloudWatch/Datadog

---

**Ready to deploy? Start from Section 1 and work through each step in order.**
