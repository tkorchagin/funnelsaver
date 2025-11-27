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
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    loadProject();

    // Set up Server-Sent Events for real-time updates
    const token = localStorage.getItem('token');
    if (!token) return;

    // EventSource doesn't support custom headers, pass token as query param
    const eventSource = new EventSource(
      `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/api/projects/${id}/events?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE event received:', data);

        if (data.type === 'screenshot_added') {
          // Reload project to get new screenshot
          loadProject();
        } else if (data.type === 'status_changed') {
          // Update status immediately
          setProject(prev => prev ? {...prev, status: data.data.status} : null);
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            loadProject();
          }
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    // Fallback polling every 10 seconds if SSE fails
    const interval = setInterval(() => {
      if (project?.status === 'processing' || project?.status === 'queued') {
        loadProject();
      }
    }, 10000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

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

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    if (project.screenshots && lightboxIndex < project.screenshots.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const handleKeyDown = (e) => {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage(e);
    if (e.key === 'ArrowLeft') prevImage(e);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

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

        {project.screenshots && project.screenshots.length > 0 && (
          <div className="screenshots-section">
            <h2>Screenshots ({project.screenshots.length})</h2>
            <div className="screenshots-grid">
              {project.screenshots.map((screenshot, index) => {
                // Find HTML and MD files for this step
                const stepFiles = project.files?.filter(f =>
                  f.file_name.includes(`step_${screenshot.step_number}`)
                );
                const htmlFile = stepFiles?.find(f => f.file_name.endsWith('.html'));
                const mdFile = stepFiles?.find(f => f.file_name.endsWith('.md'));

                return (
                  <div key={screenshot.id} className="screenshot-card">
                    <div className="screenshot-thumbnail" onClick={() => openLightbox(index)}>
                      <img
                        src={getScreenshotImage(screenshot.screenshot_path)}
                        alt={`Step ${screenshot.step_number}`}
                        className="screenshot-image"
                      />
                      <div className="screenshot-overlay">
                        <span>🔍 Click to view</span>
                      </div>
                    </div>
                    <div className="screenshot-info">
                      <div className="screenshot-header">
                        <span className="step-number">Step {screenshot.step_number}</span>
                      </div>
                      <div className="screenshot-url">{screenshot.url}</div>
                      {screenshot.action_description && (
                        <div className="screenshot-action">
                          {screenshot.action_description}
                        </div>
                      )}
                      {(htmlFile || mdFile) && (
                        <div className="screenshot-files">
                          {htmlFile && (
                            <button
                              className="file-btn-small"
                              onClick={() => handleDownload(htmlFile.id, htmlFile.file_name)}
                            >
                              📄 HTML
                            </button>
                          )}
                          {mdFile && (
                            <button
                              className="file-btn-small"
                              onClick={() => handleDownload(mdFile.id, mdFile.file_name)}
                            >
                              📝 Markdown
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxIndex !== null && project.screenshots && (
          <div className="lightbox" onClick={closeLightbox}>
            <button className="lightbox-close" onClick={closeLightbox}>✕</button>
            {lightboxIndex > 0 && (
              <button className="lightbox-prev" onClick={prevImage}>‹</button>
            )}
            {lightboxIndex < project.screenshots.length - 1 && (
              <button className="lightbox-next" onClick={nextImage}>›</button>
            )}
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path)}
                alt={`Step ${project.screenshots[lightboxIndex].step_number}`}
                className="lightbox-image"
              />
              <div className="lightbox-info">
                <div className="lightbox-step">
                  Step {project.screenshots[lightboxIndex].step_number} / {project.screenshots.length}
                </div>
                <div className="lightbox-url">{project.screenshots[lightboxIndex].url}</div>
              </div>
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
