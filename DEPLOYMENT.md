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

## Free Tier Cloud Deployment

Due to the backend using PyTorch/SentenceTransformers (which are heavy machine learning dependencies), standard free-tier web hosting platforms like Render or Koyeb with a 512MB RAM limit will run out of memory during installation or execution.

To deploy GradeOps completely free, we recommend the following stack:
1. **Database:** [Neon](https://neon.tech/) (Generous serverless PostgreSQL free tier)
2. **Backend API:** [Hugging Face Spaces](https://huggingface.co/spaces) (Docker Space with free 16GB RAM CPU tier)
3. **Frontend:** [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) (Free fast static hosting for React SPA)

---

### 1. Database Setup (Neon Postgres)

1. Sign up on [Neon.tech](https://neon.tech/) and create a new project.
2. In the Neon Console, choose a name for your database (e.g., `gradeops`) and region.
3. Once created, copy the **Connection String** from the dashboard. It will look like:
   ```env
   postgresql://alex:strongpassword@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/gradeops?sslmode=require
   ```
4. Keep this connection string safe. You will need it for the backend environment variables.

---

### 2. Backend Deployment (Hugging Face Spaces)

Hugging Face Spaces allows you to host Docker containers. The free CPU tier provides **16GB RAM and 50GB space**, which is more than enough to load PyTorch and SentenceTransformer models.

#### A. Configure the backend for Hugging Face
Hugging Face expects web apps to run on port `7860`. We can add a custom `Dockerfile` or modify the existing one.
1. Create a `Dockerfile` inside the `backend` folder (or use the existing one, but we must configure the launch port).
2. Create a new `README.md` at the root of your Hugging Face Space repository with the following YAML header block (Metadata) so Hugging Face knows how to run your space:
   ```yaml
   ---
   title: GradeOps Backend
   emoji: 📝
   colorFrom: indigo
   colorTo: purple
   sdk: docker
   app_port: 7860
   ---
   ```

#### B. Create the Space and Upload Code
1. Log in to [Hugging Face](https://huggingface.co/) and click **New Space**.
2. Set the Space name (e.g., `gradeops-backend`), select **Docker** as the SDK, and choose **Blank** (or any Docker template).
3. Set the visibility to **Public** (required for the free tier, but keep your keys secure!).
4. Push your backend code to the Space's Git repository. Ensure the files in the Space repository match the structure of your `backend` folder, with `Dockerfile` at the root of the repository.
5. In your backend `Dockerfile`, make sure the final CMD starts Uvicorn on port `7860`:
   ```dockerfile
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
   ```

#### C. Set Environment Variables
In the Hugging Face Space **Settings** tab, scroll to **Variables and secrets** and add:
- `DATABASE_URL`: Your Neon Postgres connection string.
- `DEBUG`: `false`
- `LOG_LEVEL`: `INFO`
- `NVIDIA_NIM_API_KEY`: *(Optional)* Your Nvidia API key if using VLM grading.
- `NVIDIA_NIM_BASE_URL`: *(Optional)* Your Nvidia base URL.

Once the environment variables are saved, restart/rebuild the space. The Space will build the image, download the dependencies, and expose your backend API.
Your API will be publicly available at: `https://<username>-<space-name>.hf.space/` (e.g., `https://huggingface.co/spaces/username/spacename` points to the interface, and the direct API URL is `https://username-spacename.hf.space`).

---

### 3. Frontend Deployment (Vercel or Netlify)

The React/Vite frontend is a static single-page application and can be hosted for free on Vercel or Netlify.

#### A. Prepare Frontend Environment
1. Ensure the frontend connects to the deployed backend. Create a `.env.production` file in your `frontend/` directory (or configure this in the hosting settings):
   ```env
   VITE_API_URL=https://username-spacename.hf.space
   ```
   *(Replace with your actual Hugging Face Space API URL, ensuring no trailing slash).*

#### B. Option 1: Deploy on Vercel (Recommended)
1. Install Vercel CLI locally or connect your GitHub repository to [Vercel Dashboard](https://vercel.com).
2. If connecting GitHub:
   - Select your repository.
   - Set **Root Directory** to `frontend`.
   - Vercel will automatically detect **Vite** as the framework preset and configure the build command (`npm run build`) and output directory (`dist`).
   - In the **Environment Variables** section, add:
     - Key: `VITE_API_URL`
     - Value: `https://username-spacename.hf.space`
   - Click **Deploy**.

#### C. Option 2: Deploy on Netlify
1. Connect your GitHub repository to [Netlify](https://www.netlify.com/).
2. Select the repository and configure the build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://username-spacename.hf.space`
4. Click **Deploy Site**.

---

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

