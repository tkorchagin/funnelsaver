# FunnelSaver Backend

Flask-based REST API with Celery task queue for managing scraping jobs.

## Features

- JWT-based authentication
- SQLite database
- Celery task queue with Redis
- File upload/download management
- Project and screenshot management

## Setup

### Local Development

1. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install Playwright browsers:
```bash
playwright install chromium
```

4. Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
SECRET_KEY=your-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-change-this
REDIS_URL=redis://localhost:6379/0
```

5. Start Redis (in separate terminal):
```bash
redis-server
```

6. Start Flask app:
```bash
python app.py
```

7. Start Celery worker (in separate terminal):
```bash
celery -A celery_config.celery_app worker --loglevel=info --concurrency=2
```

### Docker

Build and run with Docker Compose from root directory:
```bash
cd ..
docker-compose up backend celery_worker
```

## Database Schema

### Users
- `id`: Primary key
- `username`: Unique username
- `password_hash`: Hashed password
- `created_at`: Registration timestamp

### Projects
- `id`: Primary key
- `user_id`: Foreign key to users
- `url`: Funnel starting URL
- `status`: queued | processing | completed | failed
- `created_at`: Creation timestamp
- `completed_at`: Completion timestamp
- `error`: Error message if failed

### Screenshots
- `id`: Primary key
- `project_id`: Foreign key to projects
- `step_number`: Step in funnel
- `url`: Page URL at this step
- `screenshot_path`: Path to screenshot file
- `action_description`: What action was taken
- `markdown_content`: Extracted markdown
- `created_at`: Capture timestamp

### Files
- `id`: Primary key
- `project_id`: Foreign key to projects
- `file_type`: html | json | markdown
- `file_path`: Relative path to file
- `file_name`: Original filename
- `created_at`: Upload timestamp

## API Endpoints

### Authentication

**Register**
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}
```

**Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}

Response:
{
  "access_token": "jwt-token",
  "username": "user"
}
```

### Projects

**List Projects**
```
GET /api/projects
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "url": "https://example.com",
    "status": "completed",
    "created_at": "2024-01-01T00:00:00",
    "completed_at": "2024-01-01T00:05:00",
    "error": null
  }
]
```

**Create Project**
```
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com"
}

Response:
{
  "id": 1,
  "url": "https://example.com",
  "status": "queued",
  "created_at": "2024-01-01T00:00:00"
}
```

**Get Project Details**
```
GET /api/projects/:id
Authorization: Bearer <token>

Response:
{
  "id": 1,
  "url": "https://example.com",
  "status": "completed",
  "created_at": "2024-01-01T00:00:00",
  "completed_at": "2024-01-01T00:05:00",
  "error": null,
  "screenshots": [...],
  "files": [...]
}
```

### Files

**Download File**
```
GET /api/files/:id
Authorization: Bearer <token>

Returns file as attachment
```

**Get Screenshot Image**
```
GET /api/screenshots/:id/image
Authorization: Bearer <token>

Returns PNG image
```

## Celery Tasks

### scrape_funnel

Asynchronous task that:
1. Updates project status to "processing"
2. Runs the scraper with provided URL
3. Copies outputs to uploads directory
4. Creates database records for screenshots and files
5. Updates project status to "completed" or "failed"

## Task Queue Configuration

- **Concurrency**: 2 workers max
- **Prefetch**: 1 task per worker
- **Broker**: Redis
- **Backend**: Redis
- **Serializer**: JSON

## File Storage

All files stored in `uploads/` directory:
```
uploads/
├── project_1/
│   ├── step_0.png
│   ├── step_0.html
│   ├── step_1.png
│   ├── step_1.html
│   ├── report.md
│   └── report.json
└── project_2/
    └── ...
```

## Development Tips

1. **Database Reset**: Delete `funnelsaver.db` to reset database
2. **View Queue**: Use `celery -A celery_config.celery_app inspect active`
3. **Monitor Tasks**: Check Celery logs for task execution
4. **Debug Mode**: Flask runs in debug mode by default in app.py

## Production Considerations

1. Change SECRET_KEY and JWT_SECRET_KEY in .env
2. Use PostgreSQL instead of SQLite
3. Set up proper CORS origins
4. Use Gunicorn instead of Flask dev server
5. Set up SSL/TLS
6. Configure proper backup for database and uploads
7. Set up monitoring and logging
