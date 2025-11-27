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
   - **Frontend**: http://localhost:3002
   - **Backend API**: http://localhost:5001

3. Create account, login, and submit funnel URL
4. Watch screenshots appear in real-time as the scraper progresses

## Architecture

FunnelSaver consists of four main components:

```
funnelsaver/
├── backend/          # Flask REST API + Celery workers
├── frontend/         # React web application
├── scraper/          # Playwright browser automation
├── data/             # Persistent data (database + uploads)
└── docker-compose.yml
```

### Backend (Flask + Celery + Redis)
- REST API with JWT authentication
- SQLite database for users, projects, screenshots
- Celery task queue with max 2 parallel workers
- Server-Sent Events (SSE) for real-time updates
- Static file serving for screenshots

### Frontend (React)
- Minimal, clean interface
- Login/register pages
- Project submission and listing
- Real-time screenshot updates via SSE
- Detailed view with screenshots and files

### Scraper (Playwright)
- Automated browser navigation
- Screenshot capture at each step
- HTML and markdown extraction
- Smart form filling and button detection
- Direct output to persistent storage

## Features

- **User authentication** - JWT-based secure login
- **Queue-based scraping** - Max 2 parallel jobs via Celery
- **Real-time updates** - Server-Sent Events show screenshots as they're captured
- **Screenshot capture** - Full-page screenshots at each funnel step
- **Content extraction** - HTML and markdown extraction per step
- **Persistent storage** - All data saved outside Docker containers
- **Downloadable reports** - JSON and Markdown reports
- **Responsive interface** - Clean, minimal React UI

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

1. Create environment file (optional):
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
docker-compose up -d --build
```

3. View logs:
```bash
docker-compose logs -f
```

4. Stop services:
```bash
docker-compose down
```

### Data Persistence

Docker Compose mounts local directories for data persistence:
- `./data/database/` → `/app/database` (SQLite DB)
- `./data/uploads/` → `/app/uploads` (Screenshots & files)
- `./logs/` → `/app/logs` (Application logs)

Data persists across container restarts and rebuilds.

### Ports

- **Frontend**: 3002 → 3000 (container)
- **Backend**: 5001 → 5000 (container)
- **Redis**: 6379 → 6379 (container)

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Submit new scraping job
- `GET /api/projects/:id` - Get project details with screenshots
- `GET /api/projects/:id/events` - SSE stream for real-time updates

### Files
- `GET /static/uploads/{path}` - Get screenshot images (no auth required)
- `GET /api/files/:id` - Download HTML/JSON/MD files (auth required)

### Real-Time Updates

Server-Sent Events provide live progress updates:

```javascript
const eventSource = new EventSource('/api/projects/1/events?token=YOUR_JWT_TOKEN');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: 'screenshot_added' | 'status_changed' | 'connected'
};
```

See [backend/README.md](backend/README.md) for complete API documentation.

## Project Structure

```
funnelsaver/
├── backend/
│   ├── app.py              # Flask app with API + SSE endpoints
│   ├── celery_config.py    # Celery configuration
│   ├── tasks.py            # Celery tasks (scraping job + events)
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
├── data/                   # Persistent data (gitignored)
│   ├── database/           # SQLite database
│   └── uploads/            # Screenshots and files
│
├── logs/                   # Application logs (gitignored)
│   ├── backend/
│   └── celery/
│
├── docker-compose.yml      # Docker orchestration
└── README.md               # This file
```

## Task Queue & Real-Time Updates

Celery with Redis manages scraping jobs:
- **Maximum 2 concurrent workers**
- Automatic retry on failure
- Queue status visible in frontend
- **Real-time progress via SSE** - Screenshots appear as they're captured
- **Redis Pub/Sub** - Event distribution from worker to web clients

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

1. **Security**
   - Change all secrets in `.env`
   - Configure proper CORS origins
   - Set up SSL/TLS with reverse proxy (nginx)
   - Use secure JWT secret keys

2. **Database**
   - Use PostgreSQL instead of SQLite for better concurrency
   - Implement backup strategy for database

3. **Storage**
   - Backup `data/uploads/` directory regularly
   - Consider object storage (S3) for screenshots at scale

4. **Performance**
   - Use Gunicorn/uWSGI for Flask in production
   - Consider horizontal scaling for Celery workers
   - Set up Redis persistence for queue reliability

5. **Monitoring**
   - Set up application monitoring (Sentry, etc.)
   - Monitor Celery queue depth
   - Track SSE connection health
   - Log aggregation for distributed logs

6. **Nginx Configuration**
   - Proxy `/api/` to backend (port 5001)
   - Proxy `/static/uploads/` to backend for screenshots
   - Proxy all other requests to frontend (port 3002)
   - Set appropriate timeouts for SSE connections

## License

Proprietary
