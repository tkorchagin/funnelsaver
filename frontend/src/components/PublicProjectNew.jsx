import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicProject, getScreenshotImage, getCurrentUser } from '../api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { ThemeToggle } from './ThemeToggle';
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
  ExternalLink
} from 'lucide-react';

function PublicProjectNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    loadProject();
    checkAuth();
    // eslint-disable-next-line
  }, [id]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      try {
        const response = await getCurrentUser();
        setUsername(response.data.username);
      } catch (err) {
        console.error('Failed to load user info', err);
        setIsLoggedIn(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUsername('');
  };

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
            <div className="flex items-center gap-3">
              <a href="/" className="flex text-muted-foreground hover:text-foreground transition-colors">
                <Layers className="h-5 w-5" />
              </a>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{projectName}</span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://t.me/tkorchagin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Get Pro
              </a>
              <ThemeToggle />
              {isLoggedIn ? (
                <>
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                >
                  Login
                </button>
              )}
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
            <h1 className="text-5xl font-bold leading-tight tracking-tight mb-2">
              {projectName}
            </h1>
            <h2 className="text-2xl text-muted-foreground leading-relaxed mb-8">
              {projectDescription}
            </h2>

            {/* PRO Banner - Full width */}
            <div className="bg-muted/50 rounded-lg p-5 flex items-center gap-4 mb-10 flex-wrap">
              <Badge variant="default" className="bg-foreground text-background font-extrabold text-xs px-2 py-0.5">
                PRO
              </Badge>
              <p className="text-sm text-muted-foreground flex-1">
                Upgrade for full access to all funnels —{' '}
                <a
                  href="https://t.me/tkorchagin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:no-underline"
                >
                  Get Pro
                </a>
              </p>
            </div>

            {/* Visit Button */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="outline"
                className="rounded-full px-6"
                asChild
              >
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit funnel
                </a>
              </Button>
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
          </div>
        </header>

        {/* Gallery */}
        <section className="container mx-auto max-w-[1400px] px-8 py-12">
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
                            <div className="flex items-center gap-1 bg-foreground text-background text-[10px] font-extrabold px-1 py-0">
                              PRO
                            </div>
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
                            <div className="flex items-center gap-1 bg-foreground text-background text-[10px] font-extrabold px-1 py-0">
                              PRO
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                      <button className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80">
                        <FileCode className="h-3.5 w-3.5" />
                        HTML
                        <span className="bg-foreground text-background text-[10px] px-1 py-0 rounded font-extrabold">PRO</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View HTML source</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="bg-muted border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80">
                        <FileText className="h-3.5 w-3.5" />
                        MD
                        <span className="bg-foreground text-background text-[10px] px-1 py-0 rounded font-extrabold">PRO</span>
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
                        <span className="bg-foreground text-background text-[10px] px-1 py-0 rounded font-extrabold">PRO</span>
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
                        <span className="bg-foreground text-background text-[10px] px-1 py-0 rounded font-extrabold">PRO</span>
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

export default PublicProjectNew;
