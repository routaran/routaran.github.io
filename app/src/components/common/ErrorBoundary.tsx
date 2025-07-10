import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { logger } from "../../lib/logger";
import { monitor } from "../../lib/monitoring";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Log the error with our logging system
    logger.error(
      "React Error Boundary caught an error",
      {
        component: "ErrorBoundary",
        action: "componentDidCatch",
        metadata: {
          errorId: this.state.errorId,
          errorName: error.name,
          errorMessage: error.message,
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      },
      error
    );

    // Record error in monitoring system
    monitor.recordError(error, {
      component: "ErrorBoundary",
      metadata: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <div className="mt-4 text-center">
              <h1 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Please try
                refreshing the page.
              </p>
              {this.state.errorId && (
                <p className="mt-1 text-xs text-gray-500">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-red-600 font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  logger.info("User clicked refresh after error", {
                    component: "ErrorBoundary",
                    action: "refresh",
                    metadata: { errorId: this.state.errorId },
                  });
                  window.location.reload();
                }}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  logger.info("User clicked go home after error", {
                    component: "ErrorBoundary",
                    action: "goHome",
                    metadata: { errorId: this.state.errorId },
                  });
                  window.location.href = "/";
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
