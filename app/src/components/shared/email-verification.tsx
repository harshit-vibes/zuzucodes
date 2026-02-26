'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailVerificationProps {
  email: string;
  onVerified?: () => void;
}

export function EmailVerification({ email, onVerified }: EmailVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccessMessage('');

    try {
      await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });

      setSuccessMessage('Email verified successfully! Redirecting...');

      // Call the onVerified callback or redirect
      if (onVerified) {
        onVerified();
      } else {
        // Default: redirect to dashboard after a brief delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setSuccessMessage('');

    try {
      await authClient.sendVerificationEmail({ email });
      setSuccessMessage('Verification code sent! Check your email.');
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Verify Your Email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We sent a verification code to <strong>{email}</strong>
        </p>
      </div>

      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={6}
          autoFocus
          disabled={isVerifying}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={handleVerify}
          disabled={isVerifying || !code.trim()}
          className="w-full"
        >
          {isVerifying ? 'Verifying...' : 'Verify Email'}
        </Button>

        <Button
          variant="ghost"
          onClick={handleResend}
          disabled={isResending}
          className="w-full"
        >
          {isResending ? 'Sending...' : 'Resend Code'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Didn&apos;t receive the code? Check your spam folder or click &quot;Resend Code&quot;
      </p>
    </div>
  );
}
