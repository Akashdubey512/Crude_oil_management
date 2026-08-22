# Production Deployment Runbook — Phase 12

Follow this runbook to perform complete deployment of the platform.

---

## 1. Prerequisites
- Docker & Docker Compose installed.
- PostgreSQL database instance configured (or let Docker Compose boot the default database).
- Set up domain names, certificates, and TLS configurations.

---

## 2. Step-by-Step Deployment Steps

### Step 1: Clone and Set Up Configuration
1. Clone the project repository.
2. Create `.env` file from the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` settings to match production credentials:
   - `ENVIRONMENT=production`
   - `DATABASE_URL=postgresql://db_user:secure_pwd@db-host:5432/energy_db`
   - `CORS_ORIGINS=https://resilience.energy-india.gov.in`

### Step 2: Build & Start Services
Use Docker Compose to build and start the API backend and database containers:
```bash
docker-compose up -d --build
```
This command:
1. Builds the multi-stage backend container.
2. Downloads and configures PostgreSQL.
3. Sets up persistent volume bindings for DB storage.
4. Mounts the healthchecks and initializes the database tables.

### Step 3: Run Database verification
Confirm that uvicorn started and tables are populated:
```bash
docker-compose logs backend | grep -i "Database initialized successfully"
```

### Step 4: Deploy Frontend Assets
1. Build frontend assets:
   ```bash
   cd frontend
   npm install
   VITE_API_BASE_URL=https://api.resilience.energy-india.gov.in npm run build
   ```
2. Copy the resulting static files in `frontend/dist/` to your web server (e.g. Nginx, Cloudflare Pages, S3).
