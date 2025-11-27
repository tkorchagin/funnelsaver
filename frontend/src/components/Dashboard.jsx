import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

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
      // Navigate to the new project
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              FunnelSaver
            </h1>
            {!isAdmin && (
              <Badge variant="secondary" className="text-sm">
                {credits} {credits === 1 ? 'credit' : 'credits'}
              </Badge>
            )}
            {isAdmin && (
              <Badge>
                Admin
              </Badge>
            )}
          </div>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Submit Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Funnel</CardTitle>
            <CardDescription>Enter a URL to start scraping the funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                placeholder="https://example.com/funnel"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="flex-1 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <Button type="submit" disabled={loading} className="sm:w-auto">
                {loading ? 'Creating...' : 'Submit Funnel'}
              </Button>
            </form>
            {error && (
              <div className="mt-4 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buy Credits - Always Visible */}
        {!isAdmin && (
          <Card className="mb-8 border-slate-200 bg-slate-50">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Need more credits?</p>
                  <p className="text-sm text-muted-foreground">Purchase additional credits to scrape more funnels</p>
                </div>
                <Button
                  variant="default"
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full sm:w-auto"
                >
                  Buy Credits
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">
            {isAdmin ? 'All Projects' : 'Your Projects'}
          </h2>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No projects yet. Submit a URL to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 break-all">
                      {project.url}
                    </CardTitle>
                    <Badge variant={getStatusVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isAdmin && project.username && (
                    <div className="text-sm text-muted-foreground">
                      👤 {project.username}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    📅 {formatDate(project.created_at)}
                  </div>
                  {project.screenshot_count !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      📸 {project.screenshot_count} {project.screenshot_count === 1 ? 'step' : 'steps'}
                    </div>
                  )}
                  {project.error && (
                    <div className="text-sm text-destructive line-clamp-2">
                      ⚠️ {project.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPaymentModal(false)}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Purchase Credits</CardTitle>
              <CardDescription>
                Get more credits to continue scraping funnels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Contact us on Telegram to purchase additional credits and unlock unlimited funnel scraping.
              </p>
              <a
                href="https://t.me/tkorchagin"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full">
                  Contact on Telegram
                </Button>
              </a>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPaymentModal(false)}
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
