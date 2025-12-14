import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
        window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900 text-white p-6">
            <div className="max-w-md w-full bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="text-slate-400 text-sm mb-6">
                    An unexpected error occurred in the game engine. We've logged this issue.
                </p>
                <div className="bg-black/30 p-3 rounded text-left text-xs font-mono text-red-300 mb-6 overflow-auto max-h-32 border border-white/5">
                    {this.state.error?.message || "Unknown Error"}
                </div>
                <button 
                    onClick={this.handleReset}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg"
                >
                    Reload Round
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}