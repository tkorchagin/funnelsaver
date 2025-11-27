from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
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

CORS(app)
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
    return jsonify({'access_token': access_token, 'username': username}), 200


@app.route('/api/projects', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()

    return jsonify([{
        'id': p.id,
        'url': p.url,
        'status': p.status,
        'created_at': p.created_at.isoformat(),
        'completed_at': p.completed_at.isoformat() if p.completed_at else None,
        'error': p.error
    } for p in projects]), 200


@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
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
    db.session.commit()

    # Queue Celery task
    scrape_funnel.delay(project.id)

    return jsonify({
        'id': project.id,
        'url': project.url,
        'status': project.status,
        'created_at': project.created_at.isoformat()
    }), 201


@app.route('/api/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()

    if not project:
        return jsonify({'error': 'Project not found'}), 404

    screenshots = Screenshot.query.filter_by(project_id=project_id).order_by(Screenshot.step_number).all()
    files = File.query.filter_by(project_id=project_id).all()

    return jsonify({
        'id': project.id,
        'url': project.url,
        'status': project.status,
        'created_at': project.created_at.isoformat(),
        'completed_at': project.completed_at.isoformat() if project.completed_at else None,
        'error': project.error,
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
