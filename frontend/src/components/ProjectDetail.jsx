import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getScreenshotImage } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, FileCode, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
              <Badge variant={getStatusVariant(project.status)} className="self-start">
                {project.status}
              </Badge>
            </div>
          </CardHeader>
          {project.error && (
            <CardContent>
              <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
                <strong>Error:</strong> {project.error}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Screenshots Section */}
        {project.screenshots && project.screenshots.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Screenshots ({project.screenshots.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {project.screenshots.map((screenshot, index) => {
                const htmlPath = screenshot.html_path;
                const mdPath = screenshot.markdown_path;

                return (
                  <Card key={screenshot.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div
                      className="relative cursor-pointer bg-slate-100 overflow-hidden group"
                      style={{ aspectRatio: '9/19.5' }}
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={getScreenshotImage(screenshot.screenshot_path)}
                        alt={`Step ${screenshot.step_number}`}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                          🔍 Click to view
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          Step {screenshot.step_number}
                        </Badge>
                      </div>
                      {screenshot.url && (
                        <div className="text-xs text-muted-foreground mb-3 line-clamp-2 break-all">
                          {makeLinksClickable(screenshot.url)}
                        </div>
                      )}
                      {(htmlPath || mdPath) && (
                        <div className="flex flex-wrap gap-2">
                          {htmlPath && (
                            <a
                              href={`${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${htmlPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <FileCode className="h-3 w-3 mr-1" />
                                HTML
                              </Button>
                            </a>
                          )}
                          {mdPath && (
                            <a
                              href={`${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${mdPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Markdown
                              </Button>
                            </a>
                          )}
                          {screenshot.markdown_content && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const blob = new Blob([screenshot.markdown_content], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `step_${screenshot.step_number}.md`;
                                link.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              MD
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
          <Card className="mt-8 border-blue-200 bg-blue-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-blue-900 font-medium">
                🔄 Scraping in progress... This page will update automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && project.screenshots && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={prevImage}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {lightboxIndex < project.screenshots.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={nextImage}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path)}
              alt={`Step ${project.screenshots[lightboxIndex].step_number}`}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center text-white">
              <div className="text-lg font-medium">
                Step {project.screenshots[lightboxIndex].step_number} of {project.screenshots.length}
              </div>
              {project.screenshots[lightboxIndex].url && (
                <div className="text-sm text-white/80 mt-2 break-all">
                  {makeLinksClickable(project.screenshots[lightboxIndex].url)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
