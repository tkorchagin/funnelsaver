import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject } from '../api';
import './Dashboard.css';

function Dashboard({ onLogout, token }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadProjects();
    loadUserInfo();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserInfo = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    setCredits(userInfo.credits || 1);
    setIsAdmin(userInfo.is_admin || false);
  };

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await createProject(url);
      setUrl('');
      if (response.data.credits_remaining !== undefined) {
        setCredits(response.data.credits_remaining);
      }
      loadProjects();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.payment_required) {
        setShowPaymentModal(true);
      }
      setError(errorData?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#27ae60';
      case 'processing':
        return '#f39c12';
      case 'failed':
        return '#e74c3c';
      case 'queued':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>FunnelSaver</h1>
          {!isAdmin && <div className="credits-badge">Credits: {credits}</div>}
          {isAdmin && <div className="admin-badge">Admin</div>}
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="submit-form">
          <h2>Submit New Funnel</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="url"
              placeholder="Enter funnel URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="projects-list">
          <h2>Your Projects</h2>
          {projects.length === 0 ? (
            <p className="no-projects">No projects yet. Submit a URL to get started!</p>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="project-url">{project.url}</div>
                  <div className="project-meta">
                    <span
                      className="project-status"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    >
                      {project.status}
                    </span>
                    <span className="project-date">
                      {new Date(project.created_at).toLocaleString()}
                    </span>
                  </div>
                  {isAdmin && project.username && (
                    <div className="project-user">User: {project.username}</div>
                  )}
                  {project.error && (
                    <div className="project-error">{project.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>No Credits Available</h2>
            <p>You've used your free credit. Purchase more credits to continue scraping funnels.</p>
            <a
              href="https://t.me/tkorchagin"
              target="_blank"
              rel="noopener noreferrer"
              className="payment-link"
            >
              Contact on Telegram to Purchase
            </a>
            <button onClick={() => setShowPaymentModal(false)} className="close-modal-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
