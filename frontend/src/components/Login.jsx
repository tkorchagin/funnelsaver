import React, { useState, useEffect } from 'react';
import { login, register } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Layers } from 'lucide-react';
import { updatePageMeta } from '../utils/seo';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    updatePageMeta({
      title: isRegister ? 'Sign Up - FunnelSaver' : 'Login - FunnelSaver',
      description: isRegister
        ? 'Create your FunnelSaver account to start parsing mobile app funnels automatically.'
        : 'Sign in to your FunnelSaver account to manage your funnel scraping projects.',
      url: window.location.href,
      image: `${window.location.origin}/og-image.png`
    });
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password);
        setIsRegister(false);
        setError('');
        alert('Account created! Please login.');
      } else {
        const response = await login(username, password);
        localStorage.setItem('userInfo', JSON.stringify({
          username: response.data.username,
          is_admin: response.data.is_admin,
          credits: response.data.credits
        }));
        onLogin(response.data.access_token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <a href="/" className="inline-flex items-center gap-2 text-4xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity no-underline">
            <Layers className="h-8 w-8" />
            FunnelSaver
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Web-to-App Funnel Parser
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? 'Create Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isRegister
                ? 'Sign up to start parsing funnels'
                : 'Enter your credentials to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="your@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Loading...' : (isRegister ? 'Create Account' : 'Sign In')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isRegister
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          © 2025 FunnelSaver. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default Login;
