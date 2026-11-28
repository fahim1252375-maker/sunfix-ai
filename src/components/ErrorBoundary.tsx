import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { TOKENS } from '../theme/tokens';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Client-side render failures do not appear in Vercel serverless logs.
    // Record a privacy-safe diagnostic in the browser console for support.
    console.error('[SunFix] UI render failed', {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  private reloadLatestBuild = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) =>
          registration.update().catch(() => undefined),
        ));
      }
    } catch {
      // Reload still works when service-worker APIs are unavailable.
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('_sunfix_refresh', String(Date.now()));
    window.location.replace(nextUrl.toString());
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: TOKENS.ink, color: TOKENS.bone }}
        >
          <div
            className="max-w-lg w-full border rounded-xl p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
          >
            <div className="flex items-center gap-3" style={{ color: TOKENS.terracotta }}>
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-display">Application Recovery</h1>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              SunFix Field could not render this screen because an unexpected error occurred.
              Refresh the app version and try again. Your locally stored workspace is not cleared by this action.
            </p>
            <button
              type="button"
              onClick={() => void this.reloadLatestBuild()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              <RotateCcw className="w-4 h-4" />
              Refresh SunFix
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
