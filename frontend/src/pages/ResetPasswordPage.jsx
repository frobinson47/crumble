import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import CookslateLogo from '../components/ui/CookslateLogo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import * as api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset Password');

  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.consumeResetToken(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <CookslateLogo className="mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-brown">Reset Password</h1>
          <p className="text-brown-light text-sm mt-1">Choose a new password for your account</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-md p-6">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-600" />
              <p className="text-brown font-medium">Password reset successfully!</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <KeyRound size={16} />
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
              <p className="text-center text-sm text-brown-light">
                <Link to="/login" className="text-terracotta hover:underline">Back to Sign In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
