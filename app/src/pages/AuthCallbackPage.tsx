import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Card } from "../components/common/Card";
import { handleAuthCallback } from "../lib/supabase/auth";
import { logger } from "../lib/logger";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      logger.info("Processing auth callback", {
        component: "AuthCallbackPage",
        action: "handleCallback",
      });

      const { error } = await handleAuthCallback();

      if (error) {
        throw error;
      }

      // Give Supabase client time to update with the new session
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.info("Auth callback successful, redirecting to login", {
        component: "AuthCallbackPage",
        action: "handleCallback",
      });

      // Redirect to login page which will handle the rest
      navigate("/login", { replace: true });
    } catch (error) {
      logger.error(
        "Auth callback failed",
        {
          component: "AuthCallbackPage",
          action: "handleCallback",
        },
        error as Error
      );

      setError(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Authentication failed
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Back to login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
