# FunnelSaver

Automated funnel scraping tool with web interface, task queue, and real-time progress tracking.

## Quick Start

1. Clone repository and start with Docker Compose:
```bash
git clone <repository-url>
cd funnelsaver
docker-compose up --build
```

2. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000

3. Create account, login, and submit funnel URL

## Architecture

FunnelSaver consists of three main components:

```
funnelsaver/
├── backend/          # Flask REST API + Celery workers
├── frontend/         # React web application
├── scraper/          # Playwright browser automation
└── docker-compose.yml
```

### Backend (Flask + Celery + Redis)
- REST API with JWT authentication
- SQLite database for users, projects, screenshots
- Celery task queue with max 2 parallel workers
- File storage and management

### Frontend (React)
- Minimal, clean interface
- Login/register pages
- Project submission and listing
- Detailed view with screenshots and files

### Scraper (Playwright)
- Automated browser navigation
- Screenshot capture at each step
- HTML and markdown extraction
- Smart form filling and button detection

## Features

- User authentication (JWT)
- Queue-based scraping (max 2 parallel jobs)
- Real-time progress tracking
- Screenshot capture at each funnel step
- HTML and markdown extraction
- Downloadable reports (JSON, Markdown)
- Responsive web interface

## Development Setup

Each component can be developed independently:

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Start Redis
redis-server

# Start Flask
python app.py

# Start Celery worker (in separate terminal)
celery -A celery_config.celery_app worker --loglevel=info --concurrency=2
```

See [backend/README.md](backend/README.md) for detailed backend documentation.

### Frontend
```bash
cd frontend
npm install
npm start
```

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

### Scraper
```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

python -m src.main --url "https://example.com" --max-steps 20
```

See [scraper/README.md](scraper/README.md) for detailed scraper documentation.

## Docker Deployment

**Recommended for production**

1. Create environment file:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
SECRET_KEY=your-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-change-this
REDIS_URL=redis://redis:6379/0
```

2. Start all services:
```bash
docker-compose up -d
```

3. View logs:
```bash
docker-compose logs -f
```

4. Stop services:
```bash
docker-compose down
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Submit new scraping job
- `GET /api/projects/:id` - Get project details with screenshots

### Files
- `GET /api/screenshots/:id/image` - Get screenshot image
- `GET /api/files/:id` - Download HTML/JSON/MD files

See [backend/README.md](backend/README.md) for complete API documentation.

## Project Structure

```
funnelsaver/
├── backend/
│   ├── app.py              # Flask app with API endpoints
│   ├── celery_config.py    # Celery configuration
│   ├── tasks.py            # Celery tasks (scraping job)
│   ├── database.py         # Database initialization
│   ├── models.py           # SQLAlchemy models
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile
│   └── README.md           # Backend documentation
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js          # Main app component
│   │   ├── api.js          # API client
│   │   └── index.js        # Entry point
│   ├── package.json
│   ├── Dockerfile
│   └── README.md           # Frontend documentation
│
├── scraper/
│   ├── src/
│   │   ├── main.py         # CLI entry point
│   │   ├── browser.py      # Playwright wrapper
│   │   ├── clicker.py      # Navigation logic
│   │   ├── scraper.py      # Screenshot & HTML capture
│   │   ├── reporter.py     # Report generation
│   │   └── config.py       # Configuration
│   ├── requirements.txt
│   └── README.md           # Scraper documentation
│
├── docker-compose.yml      # Docker orchestration
└── README.md               # This file
```

## Task Queue

Celery with Redis manages scraping jobs:
- **Maximum 2 concurrent workers**
- Automatic retry on failure
- Queue status visible in frontend
- Real-time progress updates

## Database Schema

### Users
- Basic authentication (username + hashed password)

### Projects
- Tracks scraping jobs
- Status: queued → processing → completed/failed

### Screenshots
- One record per funnel step
- Links to image file and metadata

### Files
- HTML, JSON, and Markdown reports
- Associated with projects

## Environment Variables

Create `backend/.env`:
```
SECRET_KEY=change-this-secret-key
JWT_SECRET_KEY=change-this-jwt-secret
REDIS_URL=redis://redis:6379/0
DATABASE_URL=sqlite:///funnelsaver.db
```

## Contributing

This is an internal tool. For development:

1. Read component-specific README:
   - [Backend Documentation](backend/README.md)
   - [Frontend Documentation](frontend/README.md)
   - [Scraper Documentation](scraper/README.md)

2. Each component has detailed setup instructions
3. Use Docker Compose for integrated testing

## Production Considerations

1. Change all secrets in `.env`
2. Use PostgreSQL instead of SQLite
3. Set up SSL/TLS with reverse proxy
4. Configure proper CORS origins
5. Set up monitoring and logging
6. Implement backup strategy for database and uploads
7. Use Gunicorn for Flask in production
8. Consider horizontal scaling for Celery workers

## License

Proprietary
