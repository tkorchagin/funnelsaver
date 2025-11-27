import sys
import os
import shutil
import json
from datetime import datetime
from celery_config import celery_app
from flask import Flask
from database import db
from models import Project, Screenshot, File
import redis

# Initialize Flask app for database access
app = Flask(__name__)
db_dir = os.path.join(os.path.dirname(__file__), 'database')
os.makedirs(db_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(db_dir, "funnelsaver.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
db.init_app(app)

# Add scraper module to path
# In Docker, scraper is mounted at /scraper
scraper_path = '/scraper' if os.path.exists('/scraper') else os.path.join(os.path.dirname(__file__), '..', 'scraper')
sys.path.insert(0, scraper_path)


def send_progress_event(project_id, event_type, data):
    """Send real-time progress event via Redis pub/sub"""
    try:
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379/0'))
        channel = f'project_{project_id}_updates'
        message = json.dumps({
            'type': event_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        })
        r.publish(channel, message)
    except Exception as e:
        print(f"Failed to send progress event: {e}")


@celery_app.task(bind=True)
def scrape_funnel(self, project_id):
    """
    Celery task to scrape a funnel

    Args:
        project_id: ID of the project to scrape
    """
    with app.app_context():
        project = Project.query.get(project_id)
        if not project:
            return {'error': 'Project not found'}

        try:
            # Update status to processing
            project.status = 'processing'
            db.session.commit()

            # Send status update event
            send_progress_event(project_id, 'status_changed', {'status': 'processing'})

            # Import scraper functions
            import asyncio
            from src.main import run_funnel

            # Create project directory directly in uploads
            project_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'project_{project_id}')
            os.makedirs(project_dir, exist_ok=True)

            # Run the scraper with custom output directory
            asyncio.run(run_funnel(
                url=project.url,
                headless=True,
                max_steps=20,
                output_dir=project_dir
            ))

            # Use project_dir as run_dir (scraper will write directly there)
            run_dir = project_dir

            # Process screenshots, HTML and MD files (already in project_dir)
            step_number = 0
            while True:
                screenshot_file = f'step_{step_number}.png'
                html_file = f'step_{step_number}.html'
                md_file = f'step_{step_number}.md'

                screenshot_path = os.path.join(project_dir, screenshot_file)
                html_path = os.path.join(project_dir, html_file)
                md_path = os.path.join(project_dir, md_file)

                if not os.path.exists(screenshot_path):
                    break

                # Read markdown content if exists
                markdown_content = None
                if os.path.exists(md_path):
                    try:
                        with open(md_path, 'r', encoding='utf-8') as f:
                            markdown_content = f.read()
                    except:
                        pass

                # Store screenshot in database (file already in place)
                screenshot = Screenshot(
                    project_id=project_id,
                    step_number=step_number,
                    url=project.url,  # Will be updated from report data
                    screenshot_path=f'project_{project_id}/{screenshot_file}',
                    html_path=f'project_{project_id}/{html_file}' if os.path.exists(html_path) else None,
                    markdown_path=f'project_{project_id}/{md_file}' if os.path.exists(md_path) else None,
                    markdown_content=markdown_content,
                    action_description=f'Step {step_number}'
                )
                db.session.add(screenshot)
                db.session.commit()  # Commit immediately so SSE can see it

                # Send screenshot added event
                send_progress_event(project_id, 'screenshot_added', {
                    'step_number': step_number,
                    'screenshot_id': screenshot.id,
                    'screenshot_path': f'project_{project_id}/{screenshot_file}'
                })

                step_number += 1

            # Store report files in database (files already in place)
            report_md_path = os.path.join(project_dir, 'funnel_report.md')
            report_json_path = os.path.join(project_dir, 'funnel_data.json')

            if os.path.exists(report_md_path):
                md_file = File(
                    project_id=project_id,
                    file_type='markdown',
                    file_path=f'project_{project_id}/funnel_report.md',
                    file_name='funnel_report.md'
                )
                db.session.add(md_file)

            if os.path.exists(report_json_path):
                json_file = File(
                    project_id=project_id,
                    file_type='json',
                    file_path=f'project_{project_id}/funnel_data.json',
                    file_name='funnel_data.json'
                )
                db.session.add(json_file)

            # Update project status
            project.status = 'completed'
            project.completed_at = datetime.utcnow()
            db.session.commit()

            # Send completion event
            send_progress_event(project_id, 'status_changed', {
                'status': 'completed',
                'completed_at': project.completed_at.isoformat()
            })

            return {'status': 'completed', 'project_id': project_id}

        except Exception as e:
            # Update project status to failed
            project.status = 'failed'
            project.error = str(e)
            project.completed_at = datetime.utcnow()
            db.session.commit()

            # Send failure event
            send_progress_event(project_id, 'status_changed', {
                'status': 'failed',
                'error': str(e)
            })

            return {'status': 'failed', 'error': str(e)}
