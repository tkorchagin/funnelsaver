import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getScreenshotImage, downloadFile } from '../api';
import './ProjectDetail.css';

function ProjectDetail({ token, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
    // Poll for updates every 5 seconds if still processing
    const interval = setInterval(() => {
      if (project?.status === 'processing' || project?.status === 'queued') {
        loadProject();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, project?.status]);

  const loadProject = async () => {
    try {
      const response = await getProject(id);
      setProject(response.data);
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileId, fileName) => {
    const url = downloadFile(fileId);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="project-detail">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="project-detail">
        <div className="error">{error || 'Project not found'}</div>
      </div>
    );
  }

  return (
    <div className="project-detail">
      <header className="detail-header">
        <button onClick={() => navigate('/')} className="back-btn">← Back</button>
        <h1>Project Details</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="detail-content">
        <div className="project-info">
          <h2>Project Information</h2>
          <div className="info-row">
            <span className="info-label">URL:</span>
            <span className="info-value">{project.url}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`status-badge status-${project.status}`}>
              {project.status}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Created:</span>
            <span className="info-value">
              {new Date(project.created_at).toLocaleString()}
            </span>
          </div>
          {project.completed_at && (
            <div className="info-row">
              <span className="info-label">Completed:</span>
              <span className="info-value">
                {new Date(project.completed_at).toLocaleString()}
              </span>
            </div>
          )}
          {project.error && (
            <div className="info-row">
              <span className="info-label">Error:</span>
              <span className="info-value error-text">{project.error}</span>
            </div>
          )}
        </div>

        {project.files && project.files.length > 0 && (
          <div className="files-section">
            <h2>Files</h2>
            <div className="files-list">
              {project.files.map((file) => (
                <button
                  key={file.id}
                  className="file-btn"
                  onClick={() => handleDownload(file.id, file.file_name)}
                >
                  📄 {file.file_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {project.screenshots && project.screenshots.length > 0 && (
          <div className="screenshots-section">
            <h2>Screenshots ({project.screenshots.length})</h2>
            <div className="screenshots-grid">
              {project.screenshots.map((screenshot) => (
                <div key={screenshot.id} className="screenshot-card">
                  <div className="screenshot-header">
                    <span className="step-number">Step {screenshot.step_number}</span>
                  </div>
                  <img
                    src={getScreenshotImage(screenshot.id)}
                    alt={`Step ${screenshot.step_number}`}
                    className="screenshot-image"
                  />
                  <div className="screenshot-info">
                    <div className="screenshot-url">{screenshot.url}</div>
                    {screenshot.action_description && (
                      <div className="screenshot-action">
                        {screenshot.action_description}
                      </div>
                    )}
                    {screenshot.markdown_content && (
                      <details className="markdown-details">
                        <summary>View Markdown</summary>
                        <pre className="markdown-content">
                          {screenshot.markdown_content}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {project.status === 'processing' && (
          <div className="processing-message">
            Scraping in progress... This page will update automatically.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
