import { useEffect, useState } from 'react';
import { useLocation, useRouter } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [location, navigate] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (!token) {
          setStatus('error');
          setError('Invalid verification link');
          return;
        }

        const response = await fetch(`/api/verify-email/${token}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        setStatus('success');
        // After successful verification, redirect to home page
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to verify email');
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-green-500">
                Your email has been successfully verified!
              </p>
              <p className="text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-destructive">
                {error || 'Failed to verify your email'}
              </p>
              <p className="text-muted-foreground">
                Please try registering again or contact support if the issue persists.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
