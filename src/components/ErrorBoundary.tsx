import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { TOKENS } from '../theme/tokens';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
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
              SunFix Field caught a runtime error while rendering this view. Your offline records in IndexedDB remain preserved.
            </p>
            <pre
              className="text-xs font-mono-tech border rounded-lg p-3 overflow-auto max-h-40"
              style={{
                backgroundColor: TOKENS.mossDeep,
                borderColor: TOKENS.hairline,
                color: TOKENS.amberWarn,
              }}
            >
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
