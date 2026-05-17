# GRADEOPS Deployment Guide

## Development Environment

### Prerequisites
- Python 3.11+
- Node.js 20+
- SQLite (comes with Python)

### Setup

1. Clone repository and navigate to directory
2. Create Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Run backend:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

5. In another terminal, setup frontend:
```bash
cd frontend
npm install
npm run dev
```

6. Access:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Docker Deployment

### Single Command (Recommended)
```bash
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: PostgreSQL on localhost:5432

### Building Individual Images

Backend:
```bash
cd backend
docker build -t gradeops-backend .
docker run -p 8000:8000 gradeops-backend
```

Frontend:
```bash
cd frontend
docker build -t gradeops-frontend .
docker run -p 3000:3000 gradeops-frontend
```

## Production Deployment

### AWS EC2 Deployment

1. **Launch Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger (2GB RAM minimum)
   - 50GB storage

2. **Install Dependencies**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
```

3. **Clone and Deploy**
```bash
git clone <repo>
cd gradeops
docker-compose -f docker-compose.prod.yml up -d
```

4. **Configure nginx Reverse Proxy**
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

### Kubernetes Deployment

1. **Create Namespace**
```bash
kubectl create namespace gradeops
```

2. **Create ConfigMap for environment variables**
```bash
kubectl create configmap gradeops-config --from-env-file=.env -n gradeops
```

3. **Apply Deployment Files**
```bash
kubectl apply -f k8s/backend-deployment.yaml -n gradeops
kubectl apply -f k8s/frontend-deployment.yaml -n gradeops
kubectl apply -f k8s/postgres-deployment.yaml -n gradeops
```

## Environment Configuration

### Development (.env)
```
DATABASE_URL=sqlite:///./gradeops.db
DEBUG=true
LOG_LEVEL=DEBUG
```

### Production (.env.prod)
```
DATABASE_URL=postgresql://user:pass@db-host:5432/gradeops
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-domain.com
```

## Database Migrations

### Using Alembic

Initialize (first time):
```bash
cd backend
alembic init migrations
```

Create migration:
```bash
alembic revision --autogenerate -m "Add description"
```

Apply migration:
```bash
alembic upgrade head
```

Downgrade:
```bash
alembic downgrade -1
```

## Monitoring & Logging

### Health Checks
```bash
curl http://localhost:8000/health
```

### View Logs
Development:
```bash
docker-compose logs -f backend
```

Production (EC2):
```bash
docker logs gradeops_backend_1 -f
```

### Log Aggregation (Optional)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch (AWS)
- Datadog

## Scaling Considerations

### Horizontal Scaling
- Run multiple backend instances behind load balancer
- Use shared PostgreSQL database
- Cache with Redis
- Use Celery for async task processing

### Performance Tuning
- Enable query caching
- Add database indexes
- Use CDN for static files
- Enable gzip compression
- Optimize image sizes

### Limits
- Max upload size: 100MB (configurable)
- Max concurrent uploads: 10
- Max grading queue: 1000 items

## Backup & Recovery

### Database Backups
```bash
# PostgreSQL backup
pg_dump gradeops > backup.sql

# Restore
psql gradeops < backup.sql
```

### File Backups
```bash
# Backup uploads and artifacts
tar -czf gradeops_data_$(date +%Y%m%d).tar.gz \
  backend/uploads \
  backend/artifacts \
  backend/logs
```

## Security Checklist

- [ ] Set `DEBUG=false` in production
- [ ] Use HTTPS/TLS certificates
- [ ] Set strong database passwords
- [ ] Enable CORS only for authorized domains
- [ ] Implement JWT authentication
- [ ] Use environment secrets management
- [ ] Enable API rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Audit logging enabled

## Troubleshooting

### Backend Connection Failed
```bash
# Check if backend is running
curl http://localhost:8000/health

# View backend logs
docker-compose logs backend
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database connection
psql -U gradeops -d gradeops -h localhost
```

### Memory Issues
- Reduce number of workers
- Enable paginated queries
- Clear old artifacts periodically

### Slow Grading
- Increase number of worker processes
- Enable database query caching
- Use Redis for task queuing

## Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Review environment variables
3. Verify database connectivity
4. Check API health: `/health` endpoint

