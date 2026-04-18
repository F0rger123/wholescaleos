import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center p-6 text-[var(--t-text)]">
          <div className="max-w-md w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <AlertTriangle size={120} />
            </div>
            
            <div className="w-20 h-20 rounded-3xl bg-[var(--t-error-dim)] flex items-center justify-center text-[var(--t-error)] mx-auto mb-6 shadow-lg shadow-[var(--t-error)]/10">
              <AlertTriangle size={40} />
            </div>
            
            <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">System Error Detected</h1>
            <p className="text-[var(--t-text-muted)] text-sm mb-8 leading-relaxed font-medium">
              We encountered an unexpected error in the neural uplink. The issue has been logged for tactical remediation.
            </p>

            <div className="bg-black/20 rounded-2xl p-4 mb-8 text-left overflow-auto max-h-32 border border-[var(--t-border)]">
              <code className="text-[10px] text-[var(--t-error)] font-mono opacity-80">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--t-surface-hover)] hover:bg-[var(--t-surface)] border border-[var(--t-border)] font-bold text-xs uppercase tracking-widest transition-all"
                style={{ color: 'var(--t-text)' }}
              >
                <RefreshCw size={14} /> Reboot
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--t-primary)] hover:opacity-90 font-bold text-xs text-white shadow-lg shadow-[var(--t-primary)]/20 transition-all uppercase tracking-widest"
              >
                <Home size={14} /> Mission Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
