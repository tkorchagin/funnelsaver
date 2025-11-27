from datetime import datetime
from database import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    credits = db.Column(db.Integer, default=1)  # Free credits, starts with 1
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship('Project', backref='user', lazy=True, cascade='all, delete-orphan')


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default='queued')  # queued, processing, completed, failed
    is_public = db.Column(db.Boolean, default=False)  # Public sharing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    error = db.Column(db.Text, nullable=True)

    screenshots = db.relationship('Screenshot', backref='project', lazy=True, cascade='all, delete-orphan')
    files = db.relationship('File', backref='project', lazy=True, cascade='all, delete-orphan')


class Screenshot(db.Model):
    __tablename__ = 'screenshots'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    step_number = db.Column(db.Integer, nullable=False)
    url = db.Column(db.String(500), nullable=False)
    screenshot_path = db.Column(db.String(500), nullable=False)
    html_path = db.Column(db.String(500), nullable=True)
    markdown_path = db.Column(db.String(500), nullable=True)
    action_description = db.Column(db.Text, nullable=True)
    markdown_content = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class File(db.Model):
    __tablename__ = 'files'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)  # html, json, markdown
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
