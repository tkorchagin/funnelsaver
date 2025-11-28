import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, getCurrentUser } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertCircle, Plus } from 'lucide-react';

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
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await getCurrentUser();
      setCredits(response.data.credits);
      setIsAdmin(response.data.is_admin);
    } catch (err) {
      console.error('Failed to load user info', err);
    }
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
      if (response.data.id) {
        navigate(`/project/${response.data.id}`);
      }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="mr-4 flex">
            <h1 className="text-xl font-bold">FunnelSaver</h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="flex items-center gap-2">
              {!isAdmin && (
                <Badge variant="secondary">
                  {credits} {credits === 1 ? 'credit' : 'credits'}
                </Badge>
              )}
              {isAdmin && <Badge>Admin</Badge>}
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Submit Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Funnel</CardTitle>
            <CardDescription>Enter a URL to start scraping the funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/funnel"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </form>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Buy Credits */}
        {!isAdmin && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-medium">Need more credits?</p>
                <p className="text-sm text-muted-foreground">
                  Purchase additional credits to scrape more funnels
                </p>
              </div>
              <Button onClick={() => setShowPaymentModal(true)}>
                Buy Credits
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {isAdmin ? 'All Projects' : 'Your Projects'}
          </h2>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No projects yet. Submit a URL to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base break-all">
                      {project.url}
                    </CardTitle>
                    <Badge variant={getStatusVariant(project.status)} className="shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="space-y-1">
                    {isAdmin && project.username && (
                      <div className="text-xs">User: {project.username}</div>
                    )}
                    <div className="text-xs">{formatDate(project.created_at)}</div>
                    {project.screenshot_count !== undefined && (
                      <div className="text-xs">
                        {project.screenshot_count} {project.screenshot_count === 1 ? 'step' : 'steps'}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                {project.error && (
                  <CardContent>
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="line-clamp-2">
                        {project.error}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Credits</DialogTitle>
            <DialogDescription>
              Get more credits to continue scraping funnels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Contact us on Telegram to purchase additional credits and unlock unlimited funnel scraping.
            </p>
            <Button asChild className="w-full">
              <a
                href="https://t.me/tkorchagin"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact on Telegram
              </a>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;
