import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicProject, getScreenshotImage } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { X, ChevronLeft, ChevronRight, AlertCircle, Copy, FileCode, FileText } from 'lucide-react';

function PublicProject() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await getPublicProject(id);
      setProject(response.data);
    } catch (err) {
      setError('Project not found or not public');
    } finally {
      setLoading(false);
    }
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
        <header className="w-full border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center px-4 max-w-7xl">
            <Skeleton className="h-8 w-40" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
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
      <header className="w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
          <div>
            <h1 className="text-xl font-bold">FunnelSaver</h1>
            <p className="text-xs text-muted-foreground">
              Shared by {project.owner_username}
            </p>
          </div>
          <Badge variant="outline">Public</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
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
              <Badge variant={getStatusVariant(project.status)}>
                {project.status}
              </Badge>
            </div>
          </CardHeader>
          {project.error && (
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{project.error}</AlertDescription>
              </Alert>
            </CardContent>
          )}
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
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && project.screenshots && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-medium">
              Step {project.screenshots[lightboxIndex].step_number} of {project.screenshots.length}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setLightboxIndex(null)}>
              <X className="h-5 w-5" />
            </Button>
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

export default PublicProject;
