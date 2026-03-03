"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-xl shadow-card text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[var(--color-error)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Something went wrong
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          We encountered an unexpected error. Please try again or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[var(--color-brand-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-brand-hover)] transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-border-subtle)] transition-colors"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
