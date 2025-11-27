import React, { useState } from 'react';
import { login, register } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Zap, Eye, FileText, ArrowRight } from 'lucide-react';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Landing */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">FunnelSaver</h1>
          <Badge variant="outline" className="text-white border-white/20">
            Web-to-App Funnel Parser
          </Badge>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              Парсер web-to-app воронок
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Кидаешь ссылку на воронку web-to-app и получаешь скриншоты всей воронки
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Автоматизация</h3>
                <p className="text-slate-400">
                  Не нужно кликать самому - закинь ссылки конкурентов и посмотри все разом
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Полная воронка</h3>
                <p className="text-slate-400">
                  Получаешь скриншоты каждого шага от начала до конца
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Экспорт текстовок</h3>
                <p className="text-slate-400">
                  Вытаскивает текстовки в Markdown на каждом экране - можно скормить GPT и попросить воронку под себя сделать
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          © 2025 FunnelSaver. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">FunnelSaver</h1>
            <p className="text-muted-foreground">Web-to-App Funnel Parser</p>
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
                  <label className="text-sm font-medium" htmlFor="username">
                    Email
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="your@email.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Loading...' : (isRegister ? 'Create Account' : 'Sign In')}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 text-center">
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

          {/* Mobile features */}
          <div className="lg:hidden mt-8 space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-4">Why FunnelSaver?</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Автоматически парсит web-to-app воронки конкурентов
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <Eye className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Скриншоты каждого шага воронки
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Экспорт текстовок в Markdown для GPT
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
