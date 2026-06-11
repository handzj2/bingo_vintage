'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;   // e.g. "Payments page" — appears in error message
}

interface State {
  hasError:  boolean;
  errorMsg:  string;
}

/**
 * React Error Boundary — catches unhandled JS errors during render.
 *
 * Pattern: Sentry / Vercel recommended error boundary.
 * Use: Wrap every major dashboard section. A white screen with no
 * message is the worst UX failure — this ensures users always see
 * a recoverable error state with a retry action.
 *
 * Usage:
 *   <ErrorBoundary context="Payments">
 *     <PaymentsPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production: replace with Sentry.captureException(error, { extra: info })
    console.error(`[ErrorBoundary:${this.props.context ?? 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Something went wrong</h3>
            <p className="text-sm text-gray-500 mt-1">
              {this.props.context
                ? `The ${this.props.context} section encountered an error.`
                : 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Convenience HOC — wraps a component in an ErrorBoundary. */
export function withErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  context: string,
) {
  return function WithErrorBoundaryWrapper(props: T) {
    return (
      <ErrorBoundary context={context}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
