import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getScreenshotImage, togglePublic, cancelProject } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { ArrowLeft, Download, FileCode, FileText, X, ChevronLeft, ChevronRight, Globe, Copy, Check } from 'lucide-react';

function ProjectDetail({ token, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    loadProject();

    // Set up Server-Sent Events for real-time updates
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(
      `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/api/projects/${id}/events?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE event received:', data);

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

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
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
      // Status update will come via SSE or next poll
    } catch (err) {
      console.error('Failed to stop project', err);
      alert('Failed to stop project');
    } finally {
      setStopping(false);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/public/${id}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'queued':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const makeLinksClickable = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <div className="text-destructive">{error || 'Project not found'}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Project Details</h1>
          </div>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Project Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="break-all mb-2">
                  {makeLinksClickable(project.url)}
                </CardTitle>
                <CardDescription>
                  Created {formatDate(project.created_at)}
                  {project.completed_at && ` • Completed ${formatDate(project.completed_at)}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start">
                {(project.status === 'queued' || project.status === 'processing') && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleStopProject}
                    disabled={stopping}
                  >
                    {stopping ? 'Stopping...' : 'Stop'}
                  </Button>
                )}
                <Badge variant={getStatusVariant(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Public Sharing Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <label htmlFor="public-toggle" className="text-sm font-medium cursor-pointer">
                    Share publicly
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view
                  </p>
                </div>
                <Switch
                  id="public-toggle"
                  checked={project.is_public}
                  onCheckedChange={handleTogglePublic}
                />
              </div>
              {project.is_public && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="sm:ml-auto"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy link
                    </>
                  )}
                </Button>
              )}
            </div>

            {project.error && (
              <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
                <strong>Error:</strong> {project.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screenshots Section */}
        {project.screenshots && project.screenshots.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Screenshots ({project.screenshots.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {project.screenshots.map((screenshot, index) => {
                const htmlPath = screenshot.html_path;
                const imageUrl = getScreenshotImage(screenshot.screenshot_path);

                return (
                  <div key={screenshot.id} className="group relative">
                    {/* iPhone-style screenshot card */}
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-[1.5rem] shadow-lg hover:shadow-xl transition-all duration-300"
                      style={{ aspectRatio: '9/19.5' }}
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Step ${screenshot.step_number}`}
                        className="w-full h-full object-cover object-top"
                      />
                      
                      {/* Gradient overlay with buttons - show on hover */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {/* Copy Image */}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs bg-white/90 hover:bg-white px-2"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(imageUrl);
                                const blob = await response.blob();
                                await navigator.clipboard.write([
                                  new ClipboardItem({ [blob.type]: blob })
                                ]);
                              } catch (err) {
                                console.error('Failed to copy image:', err);
                              }
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            PNG
                          </Button>

                          {/* Copy MD */}
                          {screenshot.markdown_content && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs bg-white/90 hover:bg-white px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(screenshot.markdown_content);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              MD
                            </Button>
                          )}

                          {/* Open HTML */}
                          {htmlPath && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs bg-white/90 hover:bg-white px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${htmlPath}`, '_blank');
                              }}
                            >
                              <FileCode className="h-3 w-3 mr-1" />
                              HTML
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step badge */}
                    <div className="mt-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        Step {screenshot.step_number}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {project.status === 'processing' ? 'Screenshots are being generated...' : 'No screenshots available'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Processing Message */}
        {project.status === 'processing' && (
          <Card className="mt-8 border-slate-200 bg-slate-50">
            <CardContent className="py-4 text-center">
              <p className="font-medium">
                🔄 Scraping in progress... This page will update automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && project.screenshots && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium">
                Step {project.screenshots[lightboxIndex].step_number}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Save button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path);
                  link.download = `step_${project.screenshots[lightboxIndex].step_number}.png`;
                  link.click();
                }}
              >
                Save
              </Button>

              {/* Copy button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path));
                    const blob = await response.blob();
                    await navigator.clipboard.write([
                      new ClipboardItem({ [blob.type]: blob })
                    ]);
                  } catch (err) {
                    console.error('Failed to copy image:', err);
                  }
                }}
              >
                Copy
              </Button>

              {/* Copy MD button */}
              {project.screenshots[lightboxIndex].markdown_content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(project.screenshots[lightboxIndex].markdown_content);
                  }}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  MD
                </Button>
              )}

              {/* Open HTML button */}
              {project.screenshots[lightboxIndex].html_path && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${project.screenshots[lightboxIndex].html_path}`, '_blank');
                  }}
                >
                  <FileCode className="h-4 w-4 mr-1" />
                  HTML
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Scrollable image container - fit to window */}
          <div 
            className="flex-1 overflow-y-auto flex items-center justify-center p-8 bg-slate-50 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left arrow */}
            {lightboxIndex > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg"
                onClick={prevImage}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <img
              src={getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path)}
              alt={`Step ${project.screenshots[lightboxIndex].step_number}`}
              className="max-h-full max-w-md w-full object-contain rounded-lg shadow-lg"
            />

            {/* Right arrow */}
            {lightboxIndex < project.screenshots.length - 1 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg"
                onClick={nextImage}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Footer info */}
          {project.screenshots[lightboxIndex].url && (
            <div className="p-4 border-t text-center bg-white">
              <div className="text-sm text-muted-foreground">
                {project.screenshots[lightboxIndex].url}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
