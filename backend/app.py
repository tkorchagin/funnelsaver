from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv

from database import db, init_db
from models import User, Project, Screenshot, File
from tasks import scrape_funnel

load_dotenv()

app = Flask(__name__, static_folder='/app/uploads', static_url_path='/static/uploads')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_IDENTITY_CLAIM'] = 'sub'
# Use database directory for persistent storage
db_dir = os.path.join(os.path.dirname(__file__), 'database')
os.makedirs(db_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(db_dir, "funnelsaver.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    init_db()


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    user = User(
        username=username,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token,
        'username': username,
        'is_admin': user.is_admin,
        'credits': user.credits
    }), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({
        'username': user.username,
        'is_admin': user.is_admin,
        'credits': user.credits
    }), 200


@app.route('/api/projects', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    # Admin sees all projects, regular users see only their own
    if user and user.is_admin:
        projects = Project.query.order_by(Project.created_at.desc()).all()
    else:
        projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()

    return jsonify([{
        'id': p.id,
        'url': p.url,
        'status': p.status,
        'created_at': p.created_at.isoformat(),
        'completed_at': p.completed_at.isoformat() if p.completed_at else None,
        'error': p.error,
        'user_id': p.user_id,
        'username': p.user.username,  # Always show username for all users
        'screenshot_count': len(p.screenshots),
        'title': p.title,
        'description': p.description,
        'favicon_path': p.favicon_path,
        'screenshots': [{
            'id': s.id,
            'screenshot_path': s.screenshot_path,
            'step_number': s.step_number
        } for s in p.screenshots]
    } for p in projects]), 200


@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if user has credits (admin has unlimited)
    if not user.is_admin and user.credits <= 0:
        return jsonify({
            'error': 'No credits available',
            'payment_required': True,
            'telegram_link': 'https://t.me/tkorchagin'
        }), 402

    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({'error': 'URL required'}), 400

    project = Project(
        user_id=user_id,
        url=url,
        status='queued'
    )
    db.session.add(project)

    # Deduct credit if not admin
    if not user.is_admin:
        user.credits -= 1

    db.session.commit()

    # Queue Celery task
    scrape_funnel.delay(project.id)

    return jsonify({
        'id': project.id,
        'url': project.url,
        'status': project.status,
        'credits_remaining': user.credits,
        'created_at': project.created_at.isoformat()
    }), 201


@app.route('/api/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Admin can see any project, regular users only their own
    if user.is_admin:
        project = Project.query.filter_by(id=project_id).first()
    else:
        project = Project.query.filter_by(id=project_id, user_id=user_id).first()

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    screenshots = Screenshot.query.filter_by(project_id=project_id).order_by(Screenshot.step_number).all()
    files = File.query.filter_by(project_id=project_id).all()

    return jsonify({
        'id': project.id,
        'url': project.url,
        'status': project.status,
        'is_public': project.is_public,
        'created_at': project.created_at.isoformat(),
        'completed_at': project.completed_at.isoformat() if project.completed_at else None,
        'error': project.error,
        'title': project.title,
        'description': project.description,
        'favicon_path': project.favicon_path,
        'screenshots': [{
            'id': s.id,
            'step_number': s.step_number,
            'url': s.url,
            'screenshot_path': s.screenshot_path,
            'html_path': s.html_path,
            'markdown_path': s.markdown_path,
            'action_description': s.action_description,
            'markdown_content': s.markdown_content
        } for s in screenshots],
        'files': [{
            'id': f.id,
            'file_type': f.file_type,
            'file_path': f.file_path,
            'file_name': f.file_name
        } for f in files]
    }), 200


@app.route('/api/files/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    user_id = int(get_jwt_identity())
    file = File.query.join(Project).filter(
        File.id == file_id,
        Project.user_id == user_id
    ).first()

    if not file:
        return jsonify({'error': 'File not found'}), 404

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.file_path)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on disk'}), 404

    return send_file(file_path, as_attachment=True, download_name=file.file_name)


@app.route('/api/screenshots/<int:screenshot_id>/image', methods=['GET'])
@jwt_required()
def get_screenshot_image(screenshot_id):
    user_id = int(get_jwt_identity())
    screenshot = Screenshot.query.join(Project).filter(
        Screenshot.id == screenshot_id,
        Project.user_id == user_id
    ).first()

    if not screenshot:
        return jsonify({'error': 'Screenshot not found'}), 404

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], screenshot.screenshot_path)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Screenshot file not found'}), 404

    return send_file(file_path, mimetype='image/png')


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


@app.route('/api/projects/<int:project_id>/events')
def project_events(project_id):
    """Server-Sent Events endpoint for real-time project updates"""
    # Get token from query param since EventSource doesn't support headers
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Missing token'}), 401

    from flask_jwt_extended import decode_token
    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except:
        return jsonify({'error': 'Invalid token'}), 401

    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Admin can access any project, regular users only their own
    if user.is_admin:
        project = Project.query.filter_by(id=project_id).first()
    else:
        project = Project.query.filter_by(id=project_id, user_id=user_id).first()

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    import redis
    import json

    def event_stream():
        # Connect to Redis for pub/sub
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379/0'))
        pubsub = r.pubsub()
        channel = f'project_{project_id}_updates'
        pubsub.subscribe(channel)

        # Send initial state
        yield f"data: {json.dumps({'type': 'connected', 'project_id': project_id})}\n\n"

        # Listen for updates
        for message in pubsub.listen():
            if message['type'] == 'message':
                yield f"data: {message['data'].decode('utf-8')}\n\n"

    return app.response_class(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )


@app.route('/api/projects/<int:project_id>/toggle-public', methods=['POST'])
@jwt_required()
def toggle_public(project_id):
    """Toggle public access for a project"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    # Check if user owns this project or is admin
    project = Project.query.filter_by(id=project_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    if project.user_id != user_id and not (user and user.is_admin):
        return jsonify({'error': 'Not authorized'}), 403

    # Toggle is_public
    project.is_public = not project.is_public
    db.session.commit()

    return jsonify({
        'id': project.id,
        'is_public': project.is_public
    }), 200


@app.route('/api/projects/<int:project_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_project(project_id):
    """Cancel a running project"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    project = Project.query.filter_by(id=project_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    if project.user_id != user_id and not (user and user.is_admin):
        return jsonify({'error': 'Not authorized'}), 403

    if project.status not in ['queued', 'processing']:
        return jsonify({'error': 'Project is not running'}), 400

    # Revoke Celery task
    from celery_config import celery_app
    
    # Inspect active and reserved tasks to find the one for this project
    i = celery_app.control.inspect()
    active = i.active()
    reserved = i.reserved()
    
    task_id = None
    
    # Check active tasks
    if active:
        for worker, tasks in active.items():
            for task in tasks:
                # Check if args matches project_id (args is a list, project_id is int)
                if task.get('args') and task['args'][0] == project_id:
                    task_id = task['id']
                    break
            if task_id: break
            
    # Check reserved tasks if not found in active
    if not task_id and reserved:
        for worker, tasks in reserved.items():
            for task in tasks:
                if task.get('args') and task['args'][0] == project_id:
                    task_id = task['id']
                    break
            if task_id: break
    
    if task_id:
        celery_app.control.revoke(task_id, terminate=True)

    # Update project status to cancelled (not failed)
    project.status = 'cancelled'
    project.error = 'Cancelled by user'
    project.completed_at = datetime.utcnow()
    db.session.commit()

    # Send status update event
    from tasks import send_progress_event
    send_progress_event(project_id, 'status_changed', {
        'status': 'cancelled',
        'error': 'Cancelled by user'
    })

    return jsonify({'message': 'Project cancelled'}), 200


@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project and all its data"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.filter_by(id=project_id).first()

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Check ownership (only owner or admin can delete)
    if project.user_id != user_id and not (user.is_admin):
        return jsonify({'error': 'Unauthorized'}), 403

    # Cancel the task if it's running
    if project.status in ['queued', 'processing']:
        from celery_config import celery_app
        task_id = None

        # Find the task in Celery
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        reserved_tasks = inspect.reserved()

        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    if task.get('args') and task['args'][0] == project_id:
                        task_id = task['id']
                        break
                if task_id: break

        if not task_id and reserved_tasks:
            for worker, tasks in reserved_tasks.items():
                for task in tasks:
                    if task.get('args') and task['args'][0] == project_id:
                        task_id = task['id']
                        break
                if task_id: break

        if task_id:
            celery_app.control.revoke(task_id, terminate=True)

    # Delete associated files from filesystem
    import os

    # Delete screenshots
    for screenshot in project.screenshots:
        screenshot_path = os.path.join('uploads', screenshot.screenshot_path)
        if os.path.exists(screenshot_path):
            os.remove(screenshot_path)

    # Delete exported files
    for file in project.files:
        file_path = os.path.join('uploads', file.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)

    # Delete favicon
    if project.favicon_path:
        favicon_path = os.path.join('uploads', project.favicon_path)
        if os.path.exists(favicon_path):
            os.remove(favicon_path)

    # Delete project from database (cascade will delete screenshots and files)
    db.session.delete(project)
    db.session.commit()

    return jsonify({'message': 'Project deleted successfully'}), 200


@app.route('/api/public/projects/<int:project_id>', methods=['GET'])
def get_public_project(project_id):
    """Get public project without authentication"""
    project = Project.query.filter_by(id=project_id, is_public=True).first()

    if not project:
        return jsonify({'error': 'Project not found or not public'}), 404

    screenshots = Screenshot.query.filter_by(project_id=project_id).order_by(Screenshot.step_number).all()
    files = File.query.filter_by(project_id=project_id).all()

    return jsonify({
        'id': project.id,
        'url': project.url,
        'status': project.status,
        'created_at': project.created_at.isoformat(),
        'completed_at': project.completed_at.isoformat() if project.completed_at else None,
        'error': project.error,
        'is_public': project.is_public,
        'owner_username': project.user.username if project.user else None,
        'title': project.title,
        'description': project.description,
        'favicon_path': project.favicon_path,
        'screenshots': [{
            'id': s.id,
            'step_number': s.step_number,
            'url': s.url,
            'screenshot_path': s.screenshot_path,
            'html_path': s.html_path,
            'markdown_path': s.markdown_path,
            'action_description': s.action_description,
            'markdown_content': s.markdown_content
        } for s in screenshots],
        'files': [{
            'id': f.id,
            'file_type': f.file_type,
            'file_path': f.file_path,
            'file_name': f.file_name
        } for f in files]
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
