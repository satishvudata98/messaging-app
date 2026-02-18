Overview
========
This document explains deploying the messaging app to an EC2 instance using Docker Compose and Nginx as a reverse proxy with TLS.

Quick steps
-----------
1. Provision EC2 (Ubuntu 22.04), attach Elastic IP, and point DNS to it.
2. Install Docker and Docker Compose plugin.
3. Clone repo to `/srv/messaging-app` and create `.env` from `.env.example` with production values.
4. Run `./deploy.sh` to start services using `docker compose -f docker-compose.prod.yml up -d --build`.
5. Configure Nginx on host to proxy TLS (Let’s Encrypt) to backend and frontend containers. See example nginx block in this repo's README.

Notes
-----
- Ensure `TURN_EXTERNAL_IP` is set to the Elastic IP or public domain and open ports 3478 (UDP/TCP), 5349 (TCP), and the UDP relay range (49152-65535) in the EC2 security group.
- For production, use managed Postgres (RDS) and Redis (Elasticache) for durability — update `DATABASE_URL` and `REDIS_URL` accordingly.
- Keep secrets out of the repo; commit only `.env.example`.
