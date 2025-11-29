import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, getCurrentUser, getScreenshotImage } from '../api';
import { ThemeToggle } from './ThemeToggle';
import {
  Layers,
  Plus,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  MoreHorizontal,
  Coins
} from 'lucide-react';

function DashboardNew({ onLogout, token }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    loadProjects();
    loadUserInfo();
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await getCurrentUser();
      setCredits(response.data.credits);
      setIsAdmin(response.data.is_admin);
      setUsername(response.data.username);
    } catch (err) {
      console.error('Failed to load user info', err);
      // Redirect to login if user is not authenticated
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects', err);
      // Redirect to login if user is not authenticated
      localStorage.removeItem('token');
      navigate('/login');
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
      if (response.data.id) {
        navigate(`/projects/${response.data.id}`);
      }
    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFirstScreenshot = (project) => {
    if (project.screenshots && project.screenshots.length > 0) {
      return getScreenshotImage(project.screenshots[0].screenshot_path);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="h-[70px] flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 px-8">
        <a href="/" className="flex items-center gap-2 text-foreground text-lg font-bold no-underline">
          <Layers className="h-5 w-5" />
          FunnelSaver
        </a>

        <div className="flex items-center gap-6">
          {/* Credits Pill */}
          {!isAdmin && (
            <a
              href="https://t.me/tkorchagin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-muted border border-border px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:border-muted-foreground/50 transition-colors cursor-pointer no-underline"
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="text-foreground font-bold">{credits} credits</span>
              <span className="text-border">|</span>
              <span className="text-xs">Buy</span>
            </a>
          )}

          <ThemeToggle />

          {/* User Avatar */}
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {username?.[0]?.toUpperCase() || 'U'}
          </div>

          <button
            onClick={onLogout}
            className="text-muted-foreground bg-transparent border-none cursor-pointer text-sm transition-colors hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto max-w-[1200px] px-8">
        {/* Hero Section */}
        <section className="py-12 border-b border-border">
          <h1 className="text-2xl font-semibold mb-2">Create New Funnel</h1>
          <p className="text-muted-foreground mb-6">
            Enter a URL to start scraping the mobile funnel.
          </p>

          <form onSubmit={handleSubmit} className="max-w-[700px]">
            <div className="flex gap-3 bg-muted p-2 border border-border rounded-xl transition-colors focus-within:border-muted-foreground/50">
              <input
                type="url"
                className="flex-1 bg-transparent border-none px-4 text-foreground text-base outline-none placeholder:text-muted-foreground"
                placeholder="https://example.com/landing-page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-foreground text-background border-none px-6 py-3 rounded-lg font-semibold cursor-pointer flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                {loading ? 'Creating...' : 'Start Scraping'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2 max-w-[700px]">
              <AlertOctagon className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </section>

        {/* Projects Grid */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No projects yet. Submit a URL to get started!
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
              {projects.map((project) => {
                const firstScreenshot = getFirstScreenshot(project);
                const isProcessing = project.status === 'processing' || project.status === 'queued';
                const isFailed = project.status === 'failed';
                const isCancelled = project.status === 'cancelled';
                const isCompleted = project.status === 'completed';

                return (
                  <article
                    key={project.id}
                    className={`bg-muted border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-muted-foreground/40 hover:-translate-y-0.5 cursor-pointer flex flex-col ${
                      isFailed ? 'border-destructive/40' : ''
                    }`}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {/* Card Preview */}
                    <div
                      className={`h-[180px] bg-card border-b border-border relative overflow-hidden flex items-center justify-center ${
                        isProcessing ? 'bg-muted/50' : ''
                      } ${isFailed ? 'bg-destructive/5' : ''}`}
                    >
                      {isProcessing && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
                          <span className="text-sm text-muted-foreground animate-pulse">
                            Scraping...
                          </span>
                        </div>
                      )}

                      {isFailed && (
                        <AlertOctagon className="h-8 w-8 text-destructive" />
                      )}

                      {isCancelled && (
                        <XCircle className="h-8 w-8 text-muted-foreground" />
                      )}

                      {isCompleted && firstScreenshot && (
                        <div className="relative w-[120px] h-[160px] translate-y-5 -rotate-6 opacity-80 transition-all duration-300 hover:translate-y-2 hover:rotate-0 hover:opacity-100 hover:scale-105">
                          <div
                            className="absolute top-0 left-0 w-full h-full rounded-xl border border-border/20 bg-cover bg-top shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-30"
                            style={{ backgroundImage: `url(${firstScreenshot})` }}
                          />
                          <div className="absolute top-2.5 left-5 w-full h-full rounded-xl border border-border/20 bg-muted/60 z-20 opacity-60" />
                        </div>
                      )}

                      {isCompleted && !firstScreenshot && (
                        <div className="relative w-[120px] h-[160px] translate-y-5 -rotate-6 opacity-80">
                          <div className="absolute top-0 left-0 w-full h-full rounded-xl border border-border/20 bg-muted/80 z-30" />
                          <div className="absolute top-2.5 left-5 w-full h-full rounded-xl border border-border/20 bg-muted/60 z-20 opacity-60" />
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 flex items-start gap-3">
                          {/* Favicon or First Letter */}
                          {project.favicon_path ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/20 flex-shrink-0">
                              <img
                                src={getScreenshotImage(project.favicon_path)}
                                alt={project.title || 'Favicon'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: '#E6F8D3' }}
                            >
                              <span className="text-lg font-bold text-black">
                                {(project.title || new URL(project.url).hostname)[0].toUpperCase()}
                              </span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-foreground mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                              {project.title || new URL(project.url).hostname.replace('www.', '')}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {project.description || project.url}
                            </p>
                          </div>
                        </div>
                        <button
                          className="bg-transparent border-none text-muted-foreground cursor-pointer p-1 hover:text-foreground flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {isFailed && project.error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive/80 px-3 py-2 rounded-lg text-xs mt-4 flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5" />
                          {project.error}
                        </div>
                      )}

                      {isCancelled && project.error && (
                        <div className="bg-muted border border-border text-muted-foreground px-3 py-2 rounded-lg text-xs mt-4 flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5" />
                          {project.error}
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground mt-auto pt-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(project.created_at)}
                        </div>
                        {isCompleted && (
                          <>
                            <div className="flex items-center gap-1">
                              <Smartphone className="h-3.5 w-3.5" />
                              {project.screenshot_count || 0} screens
                            </div>
                            <div className="flex items-center gap-1 ml-auto text-green-500">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          </>
                        )}
                        {isProcessing && (
                          <div className="flex items-center gap-1">...</div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardNew;
