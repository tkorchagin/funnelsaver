import sys
import os
import shutil
from datetime import datetime
from celery_config import celery_app
from flask import Flask
from database import db
from models import Project, Screenshot, File

# Initialize Flask app for database access
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///funnelsaver.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
db.init_app(app)

# Add scraper module to path
scraper_path = os.path.join(os.path.dirname(__file__), '..', 'scraper')
sys.path.insert(0, scraper_path)


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

            # Import scraper functions
            import asyncio
            from src.main import run_funnel

            # Create temp output directory
            temp_output = os.path.join(app.config['UPLOAD_FOLDER'], f'temp_{project_id}')
            os.makedirs(temp_output, exist_ok=True)

            # Run the scraper (this will create outputs/ subdirectory)
            asyncio.run(run_funnel(
                url=project.url,
                headless=True,
                max_steps=20
            ))

            # Find the latest output directory
            outputs_dir = os.path.join(scraper_path, 'outputs')
            if not os.path.exists(outputs_dir):
                raise Exception('No outputs directory found')

            # Get the latest run directory
            run_dirs = [d for d in os.listdir(outputs_dir)
                       if os.path.isdir(os.path.join(outputs_dir, d))]
            if not run_dirs:
                raise Exception('No run directories found')

            latest_run = sorted(run_dirs)[-1]
            run_dir = os.path.join(outputs_dir, latest_run)

            # Create project directory in uploads
            project_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'project_{project_id}')
            os.makedirs(project_dir, exist_ok=True)

            # Process screenshots and HTML files
            step_number = 0
            while True:
                screenshot_file = f'step_{step_number}.png'
                html_file = f'step_{step_number}.html'

                screenshot_path = os.path.join(run_dir, screenshot_file)
                html_path = os.path.join(run_dir, html_file)

                if not os.path.exists(screenshot_path):
                    break

                # Copy screenshot to uploads
                dest_screenshot = os.path.join(project_dir, screenshot_file)
                shutil.copy2(screenshot_path, dest_screenshot)

                # Store screenshot in database
                screenshot = Screenshot(
                    project_id=project_id,
                    step_number=step_number,
                    url=project.url,  # Will be updated from report data
                    screenshot_path=f'project_{project_id}/{screenshot_file}',
                    action_description=f'Step {step_number}'
                )
                db.session.add(screenshot)

                # Copy HTML if exists
                if os.path.exists(html_path):
                    dest_html = os.path.join(project_dir, html_file)
                    shutil.copy2(html_path, dest_html)

                    html_file_record = File(
                        project_id=project_id,
                        file_type='html',
                        file_path=f'project_{project_id}/{html_file}',
                        file_name=html_file
                    )
                    db.session.add(html_file_record)

                step_number += 1

            # Copy report files (markdown and JSON)
            report_md = os.path.join(run_dir, 'report.md')
            report_json = os.path.join(run_dir, 'report.json')

            if os.path.exists(report_md):
                dest_md = os.path.join(project_dir, 'report.md')
                shutil.copy2(report_md, dest_md)

                md_file = File(
                    project_id=project_id,
                    file_type='markdown',
                    file_path=f'project_{project_id}/report.md',
                    file_name='report.md'
                )
                db.session.add(md_file)

            if os.path.exists(report_json):
                dest_json = os.path.join(project_dir, 'report.json')
                shutil.copy2(report_json, dest_json)

                json_file = File(
                    project_id=project_id,
                    file_type='json',
                    file_path=f'project_{project_id}/report.json',
                    file_name='report.json'
                )
                db.session.add(json_file)

            # Update project status
            project.status = 'completed'
            project.completed_at = datetime.utcnow()
            db.session.commit()

            # Cleanup temp directory
            if os.path.exists(temp_output):
                shutil.rmtree(temp_output)

            return {'status': 'completed', 'project_id': project_id}

        except Exception as e:
            # Update project status to failed
            project.status = 'failed'
            project.error = str(e)
            project.completed_at = datetime.utcnow()
            db.session.commit()

            return {'status': 'failed', 'error': str(e)}
