import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CookingPot, Check, X, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function InstallPage() {
  const [checks, setChecks] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/install.php')
      .then(r => {
        if (r.status === 403) {
          // Already installed
          navigate('/login', { replace: true });
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          setChecks(data.checks);
          setReady(data.ready);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not reach the install endpoint. Make sure the API is running.');
        setLoading(false);
      });
  }, [navigate]);

  const handleInstall = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setInstalling(true);
    try {
      const res = await fetch('/api/install.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: username,
          admin_password: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Installation failed');
        setInstalling(false);
        return;
      }
      // Success — redirect to login
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Installation failed');
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-terracotta animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <CookingPot size={48} className="text-terracotta mx-auto mb-3" />
          <h1 className="text-3xl font-bold font-display text-brown">Cookslate</h1>
          <p className="text-warm-gray mt-1">Let's get you set up</p>
        </div>

        {/* Requirements */}
        {checks && (
          <div className="bg-surface rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-sm font-semibold text-brown mb-3">System Requirements</h2>
            <div className="space-y-2">
              {Object.values(checks).map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {check.ok ? (
                    <Check size={16} className="text-sage shrink-0" />
                  ) : (
                    <X size={16} className="text-red-500 shrink-0" />
                  )}
                  <span className={check.ok ? 'text-brown-light' : 'text-red-500'}>
                    {check.label}
                    {check.value ? ` (${check.value})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Install Form */}
        {ready ? (
          <div className="bg-surface rounded-2xl shadow-md p-6">
            <h2 className="text-sm font-semibold text-brown mb-4">Create Admin Account</h2>
            <form onSubmit={handleInstall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-light mb-1">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  minLength={3}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-light mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-light mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <X size={16} />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={installing}>
                {installing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Installing...
                  </>
                ) : (
                  'Create Account & Finish Setup'
                )}
              </Button>
            </form>
          </div>
        ) : checks ? (
          <div className="bg-surface rounded-2xl shadow-md p-6 text-center">
            <X size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-brown font-semibold mb-2">Requirements not met</p>
            <p className="text-sm text-warm-gray">Please fix the issues above and reload this page.</p>
          </div>
        ) : null}

        {error && !checks && (
          <div className="bg-surface rounded-2xl shadow-md p-6 text-center">
            <X size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
