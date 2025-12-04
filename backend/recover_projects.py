#!/usr/bin/env python
"""
Recovery script to restart stuck projects after system restart
"""
from app import app, db
from models import Project, Screenshot, File
from tasks import scrape_funnel
from datetime import datetime
import os

def recover_stuck_projects():
    """Find and restart projects that were processing when system went down"""
    with app.app_context():
        # Find projects stuck in queued or processing state
        stuck_projects = Project.query.filter(
            Project.status.in_(['queued', 'processing'])
        ).all()

        if not stuck_projects:
            print("No stuck projects found")
            return

        print(f"Found {len(stuck_projects)} stuck project(s)")

        for project in stuck_projects:
            print(f"Recovering project {project.id}: {project.url}")

            # Delete existing screenshots and files to avoid duplicates
            screenshots_deleted = 0
            for screenshot in project.screenshots:
                # Delete screenshot file from disk
                screenshot_path = os.path.join('uploads', screenshot.screenshot_path)
                if os.path.exists(screenshot_path):
                    try:
                        os.remove(screenshot_path)
                    except Exception as e:
                        print(f"  Warning: Could not delete {screenshot_path}: {e}")

                # Delete from database
                db.session.delete(screenshot)
                screenshots_deleted += 1

            files_deleted = 0
            for file in project.files:
                # Delete file from disk
                file_path = os.path.join('uploads', file.file_path)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"  Warning: Could not delete {file_path}: {e}")

                # Delete from database
                db.session.delete(file)
                files_deleted += 1

            if screenshots_deleted > 0 or files_deleted > 0:
                print(f"  Cleaned up {screenshots_deleted} screenshots and {files_deleted} files")

            # Reset status to queued
            project.status = 'queued'
            project.error = None
            project.completed_at = None
            db.session.commit()

            # Re-queue the scraping task
            try:
                scrape_funnel.delay(project.id)
                print(f"  ✓ Re-queued project {project.id}")
            except Exception as e:
                print(f"  ✗ Failed to re-queue project {project.id}: {e}")
                project.status = 'failed'
                project.error = f'Recovery failed: {str(e)}'
                project.completed_at = datetime.utcnow()
                db.session.commit()

if __name__ == '__main__':
    recover_stuck_projects()
