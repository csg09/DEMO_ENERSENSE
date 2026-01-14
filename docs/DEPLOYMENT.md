# Deployment Guide

This guide covers deploying DEMO_ENERSENSE to production environments.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Cloud Platforms](#cloud-platforms)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Security Hardening](#security-hardening)

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass (`pytest` and `npm test`)
- [ ] Environment variables are configured for production
- [ ] Database migrations are up to date
- [ ] SSL/TLS certificates are obtained
- [ ] Strong secret keys are generated
- [ ] Default passwords are changed
- [ ] CORS origins are restricted
- [ ] Debug mode is disabled
- [ ] Logging is configured
- [ ] Backup strategy is in place
- [ ] Monitoring tools are set up
- [ ] Load testing is completed

---

## Environment Setup

### Generate Secret Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Production Environment Variables

**Backend (.env):**
```env
# Application
APP_NAME=DEMO_ENERSENSE
DEBUG=False
SECRET_KEY=<your-generated-secret-key>

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://username:password@localhost:5432/enersense

# JWT Configuration
JWT_SECRET_KEY=<your-generated-jwt-secret-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS - Restrict to your frontend domain
ALLOWED_ORIGINS=https://your-domain.com

# Email (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/enersense/app.log
```

**Frontend (.env.production):**
```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_APP_NAME=DEMO_ENERSENSE
```

---

## Database Setup

### PostgreSQL Installation (Ubuntu)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE enersense;
CREATE USER enersense_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE enersense TO enersense_user;
\q
```

### Run Migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head
python init_db.py  # Initialize with default data
```

---

## Backend Deployment

### Option 1: Systemd + Gunicorn (Ubuntu)

1. **Install Gunicorn:**
```bash
pip install gunicorn
```

2. **Create systemd service file:**
```bash
sudo nano /etc/systemd/system/enersense.service
```

```ini
[Unit]
Description=DEMO_ENERSENSE FastAPI Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/enersense/backend
Environment="PATH=/var/www/enersense/backend/venv/bin"
ExecStart=/var/www/enersense/backend/venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/enersense/access.log \
    --error-logfile /var/log/enersense/error.log

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. **Start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl start enersense
sudo systemctl enable enersense
sudo systemctl status enersense
```

### Option 2: Docker

See [Docker Deployment](#docker-deployment) section below.

### Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/enersense
```

```nginx
upstream enersense_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/enersense_access.log;
    error_log /var/log/nginx/enersense_error.log;

    # API Proxy
    location / {
        proxy_pass http://enersense_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Max upload size
    client_max_body_size 10M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/enersense /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## Frontend Deployment

### Build for Production

```bash
cd frontend
npm run build
```

This creates optimized files in `frontend/dist/`.

### Option 1: Nginx Static Hosting

```bash
sudo nano /etc/nginx/sites-available/enersense-frontend
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/enersense/frontend/dist;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Deploy:
```bash
sudo cp -r frontend/dist/* /var/www/enersense/frontend/dist/
sudo ln -s /etc/nginx/sites-available/enersense-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: CDN Deployment (Vercel, Netlify, etc.)

**Vercel:**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod --dir=dist
```

---

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run with gunicorn
CMD ["gunicorn", "main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: enersense
      POSTGRES_USER: enersense_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U enersense_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://enersense_user:${DB_PASSWORD}@db:5432/enersense
      SECRET_KEY: ${SECRET_KEY}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    volumes:
      - ./backend/logs:/app/logs
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deploy with Docker Compose

```bash
# Create .env file with secrets
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)
EOF

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend alembic upgrade head

# Initialize database
docker-compose exec backend python init_db.py
```

---

## Cloud Platforms

### AWS Deployment

**Using AWS ECS (Elastic Container Service):**

1. Push Docker images to ECR
2. Create ECS task definitions
3. Set up Application Load Balancer
4. Create RDS PostgreSQL instance
5. Deploy ECS service

**Using AWS Elastic Beanstalk:**

```bash
eb init -p docker enersense
eb create enersense-prod
eb deploy
```

### Google Cloud Platform

**Using Cloud Run:**

```bash
# Build and push images
gcloud builds submit --tag gcr.io/PROJECT_ID/enersense-backend
gcloud builds submit --tag gcr.io/PROJECT_ID/enersense-frontend

# Deploy services
gcloud run deploy enersense-backend \
    --image gcr.io/PROJECT_ID/enersense-backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated

gcloud run deploy enersense-frontend \
    --image gcr.io/PROJECT_ID/enersense-frontend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

### Azure

**Using Azure Container Instances:**

```bash
az container create \
    --resource-group enersense-rg \
    --name enersense-backend \
    --image your-registry.azurecr.io/enersense-backend \
    --dns-name-label enersense-api \
    --ports 8000
```

---

## Monitoring & Logging

### Application Monitoring

**Using Prometheus + Grafana:**

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"

volumes:
  prometheus_data:
  grafana_data:
```

### Centralized Logging

**Using ELK Stack:**

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    volumes:
      - es_data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

### Uptime Monitoring

- **UptimeRobot**: https://uptimerobot.com/
- **Pingdom**: https://www.pingdom.com/
- **Better Uptime**: https://betteruptime.com/

---

## Backup & Recovery

### Database Backups

**Automated PostgreSQL Backup Script:**

```bash
#!/bin/bash
# /usr/local/bin/backup-enersense.sh

BACKUP_DIR="/backups/enersense"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="enersense"
DB_USER="enersense_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/enersense_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/enersense_$DATE.sql.gz s3://your-bucket/backups/
```

**Add to crontab:**
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-enersense.sh
```

### Restore from Backup

```bash
# Restore from local backup
gunzip -c /backups/enersense/enersense_20250114_020000.sql.gz | \
    psql -U enersense_user -d enersense

# Restore from S3
aws s3 cp s3://your-bucket/backups/enersense_20250114_020000.sql.gz - | \
    gunzip | psql -U enersense_user -d enersense
```

---

## Security Hardening

### Firewall Configuration (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL only from localhost
sudo ufw deny 5432/tcp

# Enable firewall
sudo ufw enable
```

### Fail2Ban

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
sudo systemctl restart fail2ban
```

### Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Implement rate limiting
- [ ] Use strong passwords
- [ ] Enable database SSL connections
- [ ] Restrict CORS origins
- [ ] Keep dependencies updated
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable audit logging
- [ ] Implement security headers
- [ ] Regular security scans (OWASP ZAP, Nessus)
- [ ] Set up intrusion detection
- [ ] Use Web Application Firewall (WAF)

---

## Post-Deployment

### Health Checks

```bash
# Check backend health
curl https://api.your-domain.com/health

# Check frontend
curl https://your-domain.com

# Check database connection
docker-compose exec backend python -c "from database import engine; print(engine.connect())"
```

### Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://api.your-domain.com/api/assets
```

### Monitoring Checklist

- [ ] Set up application monitoring (Prometheus/Grafana)
- [ ] Configure error tracking (Sentry)
- [ ] Enable access logging
- [ ] Set up alerts for critical errors
- [ ] Monitor database performance
- [ ] Track API response times
- [ ] Monitor disk space
- [ ] Set up uptime monitoring

---

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check logs
journalctl -u enersense -f

# Check database connection
psql -U enersense_user -h localhost -d enersense
```

**High memory usage:**
```bash
# Reduce Gunicorn workers
# Edit: /etc/systemd/system/enersense.service
--workers 2  # Instead of 4
```

**502 Bad Gateway:**
```bash
# Check if backend is running
systemctl status enersense

# Check nginx error logs
tail -f /var/log/nginx/error.log
```

---

## Rollback Procedure

If deployment fails:

1. **Identify the issue**
2. **Revert to previous version:**

```bash
# With systemd
sudo cp /var/www/enersense.backup/backend/* /var/www/enersense/backend/
sudo systemctl restart enersense

# With Docker
docker-compose down
git checkout previous-tag
docker-compose up -d
```

3. **Restore database if needed**
4. **Verify system is working**
5. **Investigate and fix issues**

---

## Support

For deployment support:
- GitHub Issues: https://github.com/csg09/DEMO_ENERSENSE/issues
- Documentation: https://github.com/csg09/DEMO_ENERSENSE/wiki
