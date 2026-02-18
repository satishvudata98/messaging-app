# EC2 Deployment Quick Checklist

Copy and follow these steps sequentially for fast deployment.

## Phase 1: AWS Setup (5-10 mins)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04 LTS, t3.small+)
# 2. Allocate Elastic IP and attach to instance
# 3. Create security group with rules:
#    - SSH 22 (your IP only)
#    - HTTP/HTTPS 80, 443 (0.0.0.0/0)
#    - Coturn TCP/UDP 3478, 5349 (0.0.0.0/0)
#    - Coturn relay UDP 49152-65535 (0.0.0.0/0)
# 4. Point your domain A record to Elastic IP
# 5. Wait for DNS propagation (~5-15 mins)
```

## Phase 2: SSH into EC2 and Install Docker (10-15 mins)

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_ELASTIC_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker ubuntu
# Log out and back in for this to take effect

# Install Nginx
sudo apt install -y nginx && sudo systemctl start nginx && sudo systemctl enable nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

## Phase 3: Clone Repo and Generate Secrets (5 mins)

```bash
cd /srv
sudo git clone https://github.com/YOUR_USERNAME/messaging-app.git
sudo chown -R ubuntu:ubuntu messaging-app
cd messaging-app

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
TURN_PASSWORD=$(openssl rand -hex 16)
TURN_CLI_PASSWORD=$(openssl rand -hex 16)

echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo "TURN_PASSWORD: $TURN_PASSWORD"
echo "TURN_CLI_PASSWORD: $TURN_CLI_PASSWORD"
# Copy these values for use in .env
```

## Phase 4: Create and Configure .env File (5 mins)

```bash
cp .env.example .env
nano .env  # or: vi .env
```

**Fill in .env with these values** (replace YOUR_ELASTIC_IP and messaging.example.com):

```env
# Node
NODE_ENV=production

# Database (local Postgres in container)
DATABASE_URL=postgres://postgres:postgres@postgres:5432/messaging

# Redis (local Redis in container)
REDIS_URL=redis://redis:6379

# Secrets (use generated values from Phase 3)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
JWT_REFRESH_SECRET=YOUR_GENERATED_JWT_REFRESH_SECRET

# Domain
PUBLIC_DOMAIN=messaging.example.com
CORS_ORIGIN=https://messaging.example.com

# TURN Server
TURN_EXTERNAL_IP=YOUR_ELASTIC_IP
TURN_USERNAME=turnuser
TURN_PASSWORD=YOUR_GENERATED_TURN_PASSWORD
TURN_REALM=messaging.example.com
TURN_CLI_PASSWORD=YOUR_GENERATED_TURN_CLI_PASSWORD

# Frontend build-time envs
REACT_APP_API_URL=https://messaging.example.com/api
REACT_APP_SOCKET_URL=https://messaging.example.com
REACT_APP_TURN_SERVERS='[{"urls":["turn:messaging.example.com:3478"],"username":"turnuser","credential":"YOUR_GENERATED_TURN_PASSWORD"}]'
```

Save and exit: `ESC + :wq` (vim) or `CTRL+X, Y, Enter` (nano)

**Also copy to backend and frontend:**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Copy the same key env vars into backend/.env
# Copy only REACT_APP_* vars into frontend/.env
```

## Phase 5: Configure Nginx for HTTPS (10 mins)

### Step 1: Create temporary HTTP-only config

```bash
sudo nano /etc/nginx/sites-available/messaging-app
```

Paste:

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

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/messaging-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2: Get SSL certificate

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d messaging.example.com
```

### Step 3: Update Nginx with HTTPS + reverse proxy

```bash
sudo nano /etc/nginx/sites-available/messaging-app
```

Replace entire file with (from EC2_DEPLOYMENT_GUIDE.md section 4.3):

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

    ssl_certificate /etc/letsencrypt/live/messaging.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/messaging.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    access_log /var/log/nginx/messaging-access.log;
    error_log /var/log/nginx/messaging-error.log;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API
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

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

## Phase 6: Start Docker Compose Services (5-10 mins)

```bash
cd /srv/messaging-app

# Build
docker compose -f docker-compose.prod.yml build

# Start
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# Follow logs (Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f
```

Wait for all services to be "Up". Should see:
- postgres: ✅ Up
- redis: ✅ Up
- coturn: ✅ Up
- backend: ✅ Up
- frontend: ✅ Up

## Phase 7: Test the Application (5 mins)

1. **Open browser**: `https://messaging.example.com`
   - Should load without certificate warnings
   - See registration/login page

2. **Register first user**: email + password (e.g., user1@test.com / pass123)

3. **Register second user**: different email (e.g., user2@test.com / pass456)

4. **Log in as user 1** (tab/window 1)

5. **Log in as user 2** (tab/window 2)

6. **Send message** from user 1 to user 2 → should appear instantly

7. **Test video call** (if UI has video button):
   - Start call from user 1
   - Accept on user 2
   - See video stream

## Phase 8: Verify Connectivity (5 mins)

### From your local machine, test ports:

```bash
# TCP
nc -zv messaging.example.com 3478

# UDP
nc -zvu messaging.example.com 3478

# Should output: Connection succeeded
```

### Check Coturn logs:

```bash
docker compose -f docker-compose.prod.yml logs coturn | tail -20
# Should see listener initialization logs
```

## Phase 9: Backup Setup (optional, but recommended)

```bash
# Backup database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres messaging > /home/ubuntu/backup_$(date +%s).sql

# Schedule daily backup (crontab)
crontab -e
# Add line:
# 0 2 * * * cd /srv/messaging-app && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres messaging > /home/ubuntu/backup_$(date +%s).sql
```

## Phase 10: Enable Auto-Renewal for Certificates (1 min)

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| **"Connection refused" on https://** | Check Nginx: `sudo systemctl status nginx` |
| **Certificate warning** | Wait for DNS propagation, or check: `sudo certbot certificates` |
| **Video call not working** | Check TURN: `docker compose logs coturn`, verify firewall ports open |
| **Socket.IO not connecting** | Check backend: `docker compose logs backend`, verify CORS_ORIGIN |
| **Database error** | Check Postgres: `docker compose logs postgres` |
| **Out of memory** | Upgrade EC2 instance type or reduce container limits |

---

## Environment Variables Crib Sheet

```env
# Generate these:
JWT_SECRET=openssl rand -hex 32
JWT_REFRESH_SECRET=openssl rand -hex 32
TURN_PASSWORD=openssl rand -hex 16
TURN_CLI_PASSWORD=openssl rand -hex 16

# Replace these with YOUR values:
YOUR_ELASTIC_IP=YOUR_AWS_ELASTIC_IP (e.g., 52.1.2.3)
DOMAIN=messaging.example.com (your purchased domain)

# Keep as-is unless using managed services:
DATABASE_URL=postgres://postgres:postgres@postgres:5432/messaging
REDIS_URL=redis://redis:6379
```

---

## After Deployment

Once running and tested, you can:

1. **Auto-deploy on git push**: Set up GitHub Actions (CI/CD)
2. **Scale database**: Migrate to AWS RDS
3. **Scale cache**: Migrate to AWS Elasticache
4. **Add monitoring**: CloudWatch, Datadog, or New Relic
5. **Add CDN**: CloudFront for static assets
6. **Add load balancer**: AWS ALB for multi-region

---

**Total Time**: ~60-90 minutes for first deployment

Good luck! 🚀
