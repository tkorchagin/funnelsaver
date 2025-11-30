import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getScreenshotImage, togglePublic, cancelProject, deleteProject, getCurrentUser } from '../api';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { ThemeToggle } from './ThemeToggle';
import { updatePageMeta } from '../utils/seo';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  Download,
  FileCode,
  FileText,
  Layers,
  ArrowUp,
  ArrowLeft,
  Globe,
  Check,
  ExternalLink,
  Trash2
} from 'lucide-react';

function ProjectDetailNew({ token, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (project) {
      const firstScreenshot = project.screenshots?.[0];
      const projectTitle = firstScreenshot?.metadata?.title || new URL(project.url).hostname;
      const projectDescription = firstScreenshot?.metadata?.description || `Mobile app funnel for ${new URL(project.url).hostname}`;
      const projectImage = firstScreenshot ? getScreenshotImage(firstScreenshot.screenshot_path) : `${window.location.origin}/og-image.png`;

      updatePageMeta({
        title: `${projectTitle} - FunnelSaver`,
        description: projectDescription,
        url: window.location.href,
        image: projectImage
      });
    }
  }, [project]);

  useEffect(() => {
    loadProject();
    loadUserInfo();

    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(
      `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/api/projects/${id}/events?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'screenshot_added') {
          loadProject();
        } else if (data.type === 'status_changed') {
          setProject(prev => prev ? {...prev, status: data.data.status} : null);
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            loadProject();
          }
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    const interval = setInterval(() => {
      if (project?.status === 'processing' || project?.status === 'queued') {
        loadProject();
      }
    }, 10000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [id, project?.status]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (lightboxIndex !== null) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setLightboxIndex(null);
        } else if (e.key === 'ArrowRight' && lightboxIndex < (project?.screenshots?.length || 0) - 1) {
          setLightboxIndex(lightboxIndex + 1);
        } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1);
        }
      };

      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [lightboxIndex, project]);

  const loadUserInfo = async () => {
    try {
      const response = await getCurrentUser();
      setUsername(response.data.username);
    } catch (err) {
      console.error('Failed to load user info', err);
      // Redirect to login if user is not authenticated
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const loadProject = async () => {
    try {
      const response = await getProject(id);
      setProject(response.data);
    } catch (err) {
      setError('Failed to load project');
      // Redirect to login if user is not authenticated
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    try {
      const response = await togglePublic(id);
      setProject({ ...project, is_public: response.data.is_public });
    } catch (err) {
      console.error('Failed to toggle public', err);
    }
  };

  const handleStopProject = async () => {
    if (!window.confirm('Are you sure you want to stop this project?')) return;
    setStopping(true);
    try {
      await cancelProject(id);
      loadProject();
    } catch (err) {
      console.error('Failed to stop project', err);
      alert('Failed to stop project');
    } finally {
      setStopping(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project', err);
      alert(err.response?.data?.error || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/public/${id}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyImage = async (imageUrl, e) => {
    e?.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const handleDownloadImage = async (imageUrl, step, e) => {
    e?.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-${step}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
          <div className="container mx-auto h-[60px] flex items-center justify-between max-w-[1400px] px-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </nav>
        <div className="container mx-auto max-w-[1400px] px-8">
          <div className="pt-12 pb-4">
            <Skeleton className="h-20 w-20 rounded-[20px] mb-6" />
            <Skeleton className="h-12 w-64 mb-2" />
            <Skeleton className="h-12 w-96 mb-8" />
            <Skeleton className="h-12 w-full mb-10" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-8 py-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[9/19.5] rounded-[32px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Project not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const screenshots = project.screenshots || [];
  const projectName = project.title || new URL(project.url).hostname.split('.')[0] || 'Project';
  const projectDescription = project.description || project.url.split('//')[1]?.split('/')[0] || 'Funnel Analysis';
  const firstLetter = projectName[0].toUpperCase();
  const faviconUrl = project.favicon_path ? getScreenshotImage(project.favicon_path) : null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Sticky Navbar */}
        <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
          <div className="container mx-auto h-[60px] flex items-center justify-between max-w-[1400px] px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
              >
                <Layers className="h-5 w-5" />
                <span className="text-base font-bold">FunnelSaver</span>
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => navigate('/projects')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
              >
                Projects
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground truncate max-w-[300px]">{projectName}</span>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {username?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* App Header */}
        <header className="container mx-auto max-w-[1400px] px-8">
          <div className="pt-12 pb-4">
            {/* Brand Icon - Favicon or Letter on colored background */}
            {faviconUrl ? (
              <div className="w-20 h-20 rounded-[20px] overflow-hidden mb-6 border border-border/20">
                <img src={faviconUrl} alt={projectName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6"
                style={{ backgroundColor: '#E6F8D3' }}
              >
                <span className="text-4xl font-bold text-black">{firstLetter}</span>
              </div>
            )}

            {/* Title */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex-1">
                <h1 className="text-5xl font-bold leading-tight tracking-tight mb-2">
                  {projectName}
                </h1>
                <h2 className="text-2xl text-muted-foreground mb-4 leading-relaxed">
                  {projectDescription}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {(project.status === 'queued' || project.status === 'processing') && (
                  <button
                    onClick={handleStopProject}
                    disabled={stopping}
                    className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-medium cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-none"
                  >
                    {stopping ? 'Stopping...' : 'Stop'}
                  </button>
                )}
                <button
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="flex items-center gap-2 bg-transparent text-destructive border border-destructive px-4 py-2 rounded-lg font-medium cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Public Sharing */}
            <div className="bg-muted rounded-lg p-4 mb-6 max-w-[800px]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {project.is_public ? (
                      <input
                        type="text"
                        value={`${window.location.origin}/public/${id}`}
                        readOnly
                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono"
                      />
                    ) : (
                      <span className="text-sm font-medium">Share publicly — Anyone with the link can view</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {project.is_public && (
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted-foreground/10 transition-colors cursor-pointer bg-background text-foreground text-sm"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                  <Switch
                    id="public-toggle"
                    checked={project.is_public}
                    onCheckedChange={handleTogglePublic}
                  />
                </div>
              </div>
            </div>

            {/* Visit Button */}
            <div className="flex items-center gap-3 mb-6">
              <button
                className="bg-background border border-border text-foreground px-6 py-3 rounded-full font-medium cursor-pointer transition-colors hover:bg-muted flex items-center gap-2"
                onClick={() => window.open(project.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Visit funnel
              </button>
              <Badge
                variant={
                  project.status === 'completed' ? 'default' :
                  project.status === 'processing' ? 'secondary' :
                  project.status === 'queued' ? 'secondary' :
                  project.status === 'failed' ? 'destructive' :
                  project.status === 'cancelled' ? 'outline' : 'outline'
                }
              >
                {project.status}
              </Badge>
            </div>

            {/* Error Display */}
            {project.error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2 mb-6 max-w-[800px]">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{project.error}</span>
              </div>
            )}

            {/* Processing Status */}
            {project.status === 'processing' && (
              <div className="bg-muted/50 rounded-lg p-4 text-center mb-6 max-w-[800px]">
                <p className="font-medium">
                  🔄 Scraping in progress... This page will update automatically.
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Gallery */}
        <section className="container mx-auto max-w-[1400px] px-8 py-12">
          {screenshots.length > 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-6">
                Screenshots ({screenshots.length})
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-8">
                {screenshots.map((screenshot, index) => {
                  const imageUrl = getScreenshotImage(screenshot.screenshot_path);
                  return (
                    <div key={screenshot.id} className="group">
                      {/* Card */}
                      <div
                        className="relative aspect-[9/19.5] bg-black rounded-[32px] overflow-hidden border border-border/40 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-border/60"
                        onClick={() => setLightboxIndex(index)}
                      >
                        <img
                          src={imageUrl}
                          alt={`Screen ${screenshot.step_number}`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>

                      {/* Card Footer */}
                      <div className="mt-3 flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          Screen {screenshot.step_number}
                        </span>

                        <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="bg-transparent border-none text-muted-foreground hover:text-foreground p-1 cursor-pointer flex items-center justify-center"
                                  onClick={(e) => handleCopyImage(imageUrl, e)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Copy</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="bg-transparent border-none text-muted-foreground hover:text-foreground p-1 cursor-pointer flex items-center justify-center"
                                  onClick={(e) => handleDownloadImage(imageUrl, screenshot.step_number, e)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Download</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              {project.status === 'processing'
                ? 'Screenshots are being generated...'
                : 'No screenshots available'}
            </div>
          )}
        </section>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            className="fixed bottom-8 right-8 z-40 h-11 w-11 rounded-full shadow-lg bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center border-none cursor-pointer transition-all"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}

        {/* Lightbox Modal */}
        {lightboxIndex !== null && screenshots[lightboxIndex] && (
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-background/98 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setLightboxIndex(null);
              }
            }}
          >
            {/* Modal Header */}
            <div className="flex-shrink-0 border-b bg-background/90 px-8 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {lightboxIndex + 1} / {screenshots.length}
              </div>

              <div className="hidden md:flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (screenshots[lightboxIndex].html_path) {
                            window.open(
                              `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${screenshots[lightboxIndex].html_path}`,
                              '_blank'
                            );
                          }
                        }}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        HTML
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View HTML source</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (screenshots[lightboxIndex].markdown_content) {
                            navigator.clipboard.writeText(screenshots[lightboxIndex].markdown_content);
                          }
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        MD
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Export as Markdown</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80"
                        onClick={(e) => handleCopyImage(getScreenshotImage(screenshots[lightboxIndex].screenshot_path), e)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Copy image</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80"
                        onClick={(e) => handleDownloadImage(getScreenshotImage(screenshots[lightboxIndex].screenshot_path), screenshots[lightboxIndex].step_number, e)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Download image</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <button
                className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 relative flex justify-center overflow-hidden">
              {/* Tap Zones for Mobile */}
              <div
                className="md:hidden absolute left-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
                }}
              />
              <div
                className="md:hidden absolute right-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lightboxIndex < screenshots.length - 1) setLightboxIndex(lightboxIndex + 1);
                }}
              />

              {/* Navigation Buttons Desktop */}
              {lightboxIndex > 0 && (
                <button
                  className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-foreground/5 hover:bg-foreground/15 border border-border/20 items-center justify-center cursor-pointer transition-all"
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Scrollable Image Container */}
              <ScrollArea className="flex-1 h-full">
                <div className="flex justify-center items-start py-8 px-4 md:px-0 min-h-full">
                  <img
                    src={getScreenshotImage(screenshots[lightboxIndex].screenshot_path)}
                    alt={`Screen ${screenshots[lightboxIndex].step_number}`}
                    className="w-full md:w-[280px] md:min-w-[280px] h-auto rounded-xl md:rounded-[20px] border border-border"
                    style={{ flexShrink: 0 }}
                  />
                </div>
              </ScrollArea>

              {lightboxIndex < screenshots.length - 1 && (
                <button
                  className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-foreground/5 hover:bg-foreground/15 border border-border/20 items-center justify-center cursor-pointer transition-all"
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ProjectDetailNew;
