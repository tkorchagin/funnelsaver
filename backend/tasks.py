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

            # Define callback for real-time updates
            async def on_step_completed(step_data):
                """Callback called by scraper after each step"""
                try:
                    # We need to run sync DB operations inside async callback
                    # Since we are in the same thread, we can use the app context
                    # but let's be safe and re-establish it if needed, though
                    # here we are just using the outer scope variables.
                    
                    step_number = step_data['step']
                    screenshot_path_abs = step_data['screenshot_path']
                    html_path_abs = step_data['html_path']
                    
                    # Convert absolute paths to relative paths for DB/Frontend
                    # The scraper writes to project_dir which is uploads/project_{id}
                    # We want paths like project_{id}/step_0.png
                    
                    rel_screenshot_path = f"project_{project_id}/{os.path.basename(screenshot_path_abs)}"
                    rel_html_path = f"project_{project_id}/{os.path.basename(html_path_abs)}" if html_path_abs else None
                    
                    # Markdown content is passed directly
                    markdown_content = step_data.get('markdown_content')
                    
                    # Create screenshot record
                    screenshot = Screenshot(
                        project_id=project_id,
                        step_number=step_number,
                        url=step_data['url'],
                        screenshot_path=rel_screenshot_path,
                        html_path=rel_html_path,
                        markdown_path=None, # Will be set at end if needed, or we can save per step
                        markdown_content=markdown_content,
                        action_description=step_data.get('action_desc', f'Step {step_number}')
                    )
                    
                    db.session.add(screenshot)
                    db.session.commit()
                    
                    # Send screenshot added event
                    send_progress_event(project_id, 'screenshot_added', {
                        'step_number': step_number,
                        'screenshot_id': screenshot.id,
                        'screenshot_path': rel_screenshot_path
                    })
                    
                except Exception as e:
                    print(f"Error in on_step_completed: {e}")

            # Run the scraper with custom output directory and callback
            asyncio.run(run_funnel(
                url=project.url,
                headless=True,
                max_steps=100,
                output_dir=project_dir,
                on_step_completed=on_step_completed
            ))

            # Use project_dir as run_dir (scraper will write directly there)
            run_dir = project_dir

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
