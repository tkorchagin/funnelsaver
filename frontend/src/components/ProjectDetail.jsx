import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getScreenshotImage, togglePublic, cancelProject } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';
import {
  ArrowLeft,
  AlertCircle,
  Globe,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileCode,
  FileText
} from 'lucide-react';

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
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      case 'queued': return 'outline';
      default: return 'outline';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center">
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="container py-6">
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[9/19.5] rounded-3xl" />
            ))}
          </div>
        </main>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">Project Details</h1>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="mb-2 break-all">{project.url}</CardTitle>
                <CardDescription>
                  Created {formatDate(project.created_at)}
                  {project.completed_at && ` • Completed ${formatDate(project.completed_at)}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
          <CardContent className="space-y-4">
            {/* Public Sharing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="public-toggle" className="cursor-pointer font-medium">
                    Share publicly
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view
                  </p>
                </div>
              </div>
              <Switch
                id="public-toggle"
                checked={project.is_public}
                onCheckedChange={handleTogglePublic}
              />
            </div>

            {project.is_public && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </>
                  )}
                </Button>
              </div>
            )}

            <Separator />

            {project.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{project.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Screenshots */}
        {project.screenshots && project.screenshots.length > 0 ? (
          <div>
            <h2 className="mb-4 text-lg font-semibold">
              Screenshots ({project.screenshots.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {project.screenshots.map((screenshot, index) => {
                const imageUrl = getScreenshotImage(screenshot.screenshot_path);
                return (
                  <div key={screenshot.id} className="group">
                    <div
                      className="relative aspect-[9/19.5] cursor-pointer overflow-hidden rounded-3xl shadow-md transition-shadow hover:shadow-xl"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Step ${screenshot.step_number}`}
                        className="h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-12 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 bg-white/90 px-2 text-xs hover:bg-white"
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
                            <Copy className="mr-1 h-3 w-3" />
                            PNG
                          </Button>
                          {screenshot.markdown_content && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 bg-white/90 px-2 text-xs hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(screenshot.markdown_content);
                              }}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              MD
                            </Button>
                          )}
                          {screenshot.html_path && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 bg-white/90 px-2 text-xs hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${screenshot.html_path}`,
                                  '_blank'
                                );
                              }}
                            >
                              <FileCode className="mr-1 h-3 w-3" />
                              HTML
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {project.status === 'processing'
                  ? 'Screenshots are being generated...'
                  : 'No screenshots available'}
              </p>
            </CardContent>
          </Card>
        )}

        {project.status === 'processing' && (
          <Card className="mt-6 bg-muted/50">
            <CardContent className="py-4 text-center">
              <p className="font-medium">
                🔄 Scraping in progress... This page will update automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && project.screenshots && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium">
                Step {project.screenshots[lightboxIndex].step_number}
              </h2>
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(
                      getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path)
                    );
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
              {project.screenshots[lightboxIndex].markdown_content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(project.screenshots[lightboxIndex].markdown_content);
                  }}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  MD
                </Button>
              )}
              {project.screenshots[lightboxIndex].html_path && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `${process.env.REACT_APP_API_URL || 'https://b.hugmediary.com'}/static/uploads/${project.screenshots[lightboxIndex].html_path}`,
                      '_blank'
                    );
                  }}
                >
                  <FileCode className="mr-1 h-4 w-4" />
                  HTML
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setLightboxIndex(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-y-auto bg-muted/30 p-8">
            {lightboxIndex > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 shadow-lg"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <img
              src={getScreenshotImage(project.screenshots[lightboxIndex].screenshot_path)}
              alt={`Step ${project.screenshots[lightboxIndex].step_number}`}
              className="max-h-full w-full max-w-md rounded-lg object-contain shadow-lg"
            />

            {lightboxIndex < project.screenshots.length - 1 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 shadow-lg"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {project.screenshots[lightboxIndex].url && (
            <div className="border-t bg-background p-4 text-center">
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
