# Deploying with PostgreSQL (SQLAlchemy)

This guide covers deploying OpsSight with PostgreSQL using SQLAlchemy as the database backend.

## Prerequisites

- PostgreSQL 12+ installed and running
- Docker and Docker Compose (for containerized deployment)
- Python 3.9+ (for local development)

## Local Development Setup

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE opsight_dev;

# Create user (optional)
CREATE USER opsight_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE opsight_dev TO opsight_user;
```

### 3. Configure Environment

Create `backend/.env`:

```env
# Database Backend
DATABASE_BACKEND=sqlalchemy

# Database Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsight_dev

# Other required settings
APP_NAME=OpsSight
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CSRF_SECRET=your-csrf-secret-here
REDIS_URL=redis://localhost:6379/0
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/callback
```

### 4. Run Database Migrations

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations (if using Alembic)
alembic upgrade head

# Or create schema directly
python scripts/create-supabase-schema.py
```

### 5. Start Application

```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm run dev
```

## Docker Compose Deployment

### 1. Update docker-compose.yml

Ensure PostgreSQL service is configured:

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: opsight
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      DATABASE_BACKEND: sqlalchemy
      DATABASE_URL: postgresql://postgres:postgres@db:5432/opsight
      # ... other env vars
    depends_on:
      - db

volumes:
  postgres_data:
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Or create schema
docker-compose exec backend python scripts/create-supabase-schema.py
```

## Production Deployment

### 1. Use Managed PostgreSQL

Consider using managed PostgreSQL services:
- **AWS RDS**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**

### 2. Environment Variables

Set production environment variables:

```env
DATABASE_BACKEND=sqlalchemy
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 3. Connection Pooling

Configure connection pooling in `backend/app/db/database.py`:

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

### 4. Security

- Use strong passwords
- Enable SSL connections
- Restrict database access to application servers
- Use connection pooling
- Monitor connection usage

## Troubleshooting

### Connection Refused

- Check PostgreSQL is running: `pg_isready`
- Verify connection string format
- Check firewall rules
- Ensure database exists

### Migration Errors

- Check database user has CREATE privileges
- Verify migration scripts are correct
- Review Alembic version history

### Performance Issues

- Enable connection pooling
- Add database indexes
- Monitor slow queries
- Consider read replicas for read-heavy workloads

