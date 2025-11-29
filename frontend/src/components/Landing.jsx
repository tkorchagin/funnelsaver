import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import {
  Layers,
  Link as LinkIcon,
  Check,
  DownloadCloud,
  Smartphone
} from 'lucide-react';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="h-[70px] flex items-center justify-between">
            <a href="/" className="font-bold text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              FunnelSaver
            </a>

            <div className="hidden md:flex gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="/public/1" className="hover:text-foreground transition-colors">Showcase</a>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Login
              </a>
              <Button onClick={() => navigate('/register')} className="rounded-lg">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 relative">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          {/* Glow effect */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10" />

          <Badge variant="outline" className="mb-6 gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            v2.0 is now live
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Stop taking screenshots.<br />
            Save <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">entire funnels</span> in seconds.
          </h1>

          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto mb-12">
            Enter a URL and get a beautiful, scrollable gallery of the mobile user flow. Export to HTML, PNG, or Figma.
          </p>

          {/* Input Mock */}
          <div className="max-w-[500px] mx-auto mb-16 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <LinkIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="https://betterme.world/..."
              className="w-full bg-muted border border-border rounded-xl pl-12 pr-32 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg">
              Save Funnel
            </Button>
          </div>

          {/* Hero Visual - Abstract Gallery */}
          <div className="max-w-[1000px] mx-auto border border-border rounded-3xl bg-muted/30 overflow-hidden shadow-2xl">
            <div className="aspect-[2/1] flex items-center justify-center p-8">
              <div className="grid grid-cols-3 gap-4 w-full max-w-[700px]">
                {/* Card 1 */}
                <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                  <div className="h-2 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                  <div className="h-32 bg-muted/50 rounded-lg" />
                  <div className="h-8 bg-foreground rounded-full" />
                </div>
                {/* Card 2 */}
                <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                  <div className="h-2 bg-muted rounded w-3/4" />
                  <div className="h-32 bg-muted/50 rounded-lg" />
                  <div className="h-8 bg-muted rounded-full" />
                </div>
                {/* Card 3 */}
                <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                  <div className="h-32 bg-muted/50 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Built for obsessive designers</h2>
            <p className="text-lg text-muted-foreground">Don't let inspiration get lost in your camera roll.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Full Page Capture */}
            <div className="md:col-span-2 bg-muted/30 border border-border rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Full Page Capture</h3>
                <p className="text-muted-foreground">We scroll the page for you. Captures sticky headers, long copy, and every pixel of the footer.</p>
              </div>
              <div className="flex flex-col gap-2 items-center mt-4">
                <div className="w-4/5 h-3 bg-muted rounded-full" />
                <div className="w-3/5 h-3 bg-muted rounded-full" />
              </div>
            </div>

            {/* Mobile First */}
            <div className="bg-muted/30 border border-border rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Mobile First</h3>
                <p className="text-muted-foreground">Emulates iPhone viewport to capture the real mobile experience.</p>
              </div>
              <div className="flex justify-center items-end mt-4">
                <Smartphone className="h-24 w-24 text-muted-foreground/30" />
              </div>
            </div>

            {/* One-click Export */}
            <div className="bg-muted/30 border border-border rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold mb-2">One-click Export</h3>
                <p className="text-muted-foreground">Download funnels as high-res PNGs or raw HTML.</p>
              </div>
              <div className="flex justify-center items-center mt-4">
                <DownloadCloud className="h-16 w-16 text-muted-foreground/30" />
              </div>
            </div>

            {/* Organized Projects */}
            <div className="md:col-span-2 bg-muted/30 border border-border rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Organized Projects</h3>
                <p className="text-muted-foreground">Keep your swipes organized by industry, style, or competitor.</p>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="w-24 h-20 bg-muted rounded-xl" />
                <div className="w-24 h-20 bg-muted rounded-xl" />
                <div className="w-24 h-20 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-b border-border">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="relative pl-8">
              <span className="absolute left-0 top-0 text-6xl font-extrabold text-foreground/5 leading-none">1</span>
              <h3 className="text-xl font-semibold mb-2">Paste URL</h3>
              <p className="text-muted-foreground">Copy the link of any landing page or web app you want to save.</p>
            </div>
            <div className="relative pl-8">
              <span className="absolute left-0 top-0 text-6xl font-extrabold text-foreground/5 leading-none">2</span>
              <h3 className="text-xl font-semibold mb-2">We Scrape</h3>
              <p className="text-muted-foreground">Our bots navigate the page, screenshotting every step of the viewport.</p>
            </div>
            <div className="relative pl-8">
              <span className="absolute left-0 top-0 text-6xl font-extrabold text-foreground/5 leading-none">3</span>
              <h3 className="text-xl font-semibold mb-2">You Keep</h3>
              <p className="text-muted-foreground">It's added to your library forever. Even if the original site goes down.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto max-w-[1000px] px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Simple pricing</h2>
            <p className="text-lg text-muted-foreground">Pay as you go. No monthly subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-muted/30 border border-border rounded-3xl p-8 flex flex-col">
              <div className="mb-8">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Starter</div>
                <div className="text-5xl font-bold mb-2">$0</div>
                <p className="text-sm text-muted-foreground">Perfect for testing.</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  3 Funnels / month
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  Standard Quality
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  Public links
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-lg" onClick={() => navigate('/register')}>
                Start Free
              </Button>
            </div>

            {/* Pro - Featured */}
            <div className="bg-gradient-to-b from-muted/50 to-muted/30 border-2 border-foreground/20 rounded-3xl p-8 flex flex-col transform md:scale-105 shadow-xl">
              <div className="mb-8">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Credit Pack</div>
                <div className="text-5xl font-bold mb-2">
                  $29 <span className="text-base font-normal text-muted-foreground">/ once</span>
                </div>
                <p className="text-sm text-muted-foreground">Best for designers.</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  50 Credits
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  High-Res Retina Capture
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  HTML Export
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  Private Projects
                </li>
              </ul>
              <Button className="w-full rounded-lg" asChild>
                <a href="https://t.me/tkorchain" target="_blank" rel="noopener noreferrer">
                  Buy Credits
                </a>
              </Button>
            </div>

            {/* Agency */}
            <div className="bg-muted/30 border border-border rounded-3xl p-8 flex flex-col">
              <div className="mb-8">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Agency</div>
                <div className="text-5xl font-bold mb-2">
                  $99 <span className="text-base font-normal text-muted-foreground">/ once</span>
                </div>
                <p className="text-sm text-muted-foreground">Volume scraping.</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  250 Credits
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  All Pro features
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4" />
                  Priority Support
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-lg" asChild>
                <a href="https://t.me/tkorchain" target="_blank" rel="noopener noreferrer">
                  Buy Credits
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 text-center text-sm text-muted-foreground">
        <div className="container mx-auto max-w-[1200px] px-6">
          <p>&copy; 2024 FunnelSaver. Built for creators.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
