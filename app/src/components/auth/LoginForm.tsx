import { useState, type FormEvent } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Form';
import { auth } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useToast } from '../../hooks/useToast';

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      logger.info('Attempting to send magic link', {
        component: 'LoginForm',
        action: 'sendMagicLink',
        metadata: { email },
      });

      const { error } = await auth.signIn(email);

      if (error) {
        throw error;
      }

      logger.info('Magic link sent successfully', {
        component: 'LoginForm',
        action: 'sendMagicLink',
        metadata: { email },
      });

      setIsEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a login link. Click the link in your email to sign in.',
        variant: 'success',
      });

      // Call onSuccess after a delay to allow user to see the message
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      logger.error('Failed to send magic link', {
        component: 'LoginForm',
        action: 'sendMagicLink',
        metadata: { email },
      }, error as Error);

      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Unable to send login email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We've sent a magic link to <span className="font-medium">{email}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Click the link in your email to sign in.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              setIsEmailSent(false);
              setEmail('');
            }}
            className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Sign in with email
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
              className="w-full"
              aria-label="Email address"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading || !email.trim()}
            loading={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            We'll send you a secure link to sign in. No password needed.
          </p>
        </div>
      </div>
    </form>
  );
}