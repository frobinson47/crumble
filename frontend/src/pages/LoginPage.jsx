import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, Github, Shield } from 'lucide-react';
import CookslateLogo from '../components/ui/CookslateLogo';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import * as api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Sign In');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if app needs initial setup (install wizard)
    fetch('/api/install.php')
      .then(r => {
        if (r.ok) {
          // Install endpoint is accessible and returned requirements — needs setup
          navigate('/install', { replace: true });
        }
        // 403 = already installed, continue to login
      })
      .catch(() => {
        // Install endpoint not available, continue to login
      });

    // Check if SSO is configured
    api.getSsoConfig()
      .then(data => setSsoEnabled(data.enabled))
      .catch(() => setSsoEnabled(false));

    // Check for OAuth error in URL params
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login('demo', 'demo');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <CookslateLogo size={64} className="text-terracotta" />
          </div>
          <h1 className="text-3xl font-bold text-brown font-display">Cookslate</h1>
          <p className="text-warm-gray mt-1">Your cozy recipe manager</p>
        </div>

        {/* Login form */}
        <div className="bg-surface rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-brown mb-6 text-center">Sign In</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ssoEnabled && (
            <>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
                onClick={() => { window.location.href = '/api/auth/oauth/redirect'; }}
              >
                <Shield size={18} />
                Log in with Authentik
              </Button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-cream-dark" />
                <span className="text-xs text-warm-gray">or</span>
                <div className="flex-1 h-px bg-cream-dark" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              autoFocus={!ssoEnabled}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-cream-dark">
            <Button
              variant="outline"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
              onClick={handleDemo}
            >
              <Eye size={18} />
              Try Demo
            </Button>
            <p className="text-xs text-warm-gray text-center mt-2">
              Browse recipes in read-only mode
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-warm-gray">
          <Github size={14} />
          <span>Open source on</span>
          <a
            href="https://github.com/frobinson47/cookslate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:underline"
          >
            GitHub
          </a>
        </div>

        <p className="text-center text-xs text-warm-gray/60 mt-4">
          Cookslate is a product of <a href="https://www.fmrdigital.dev" className="hover:text-warm-gray">FMR Digital LLC</a> &middot; &copy; 2026 FMR Digital LLC &middot; All rights reserved.
        </p>
      </div>
    </div>
  );
}
