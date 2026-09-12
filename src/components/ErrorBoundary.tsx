import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[var(--neu-bg)] text-slate-800 dark:text-slate-100 transition-colors duration-300">
          <div className="text-3xl font-black italic uppercase text-blue-500 mb-6 tracking-tight">BunkCalc</div>
          
          <div className="neu-card rounded-3xl border border-[var(--neu-shadow-dark)]/15 p-6 sm:p-8 w-full max-w-md text-center flex flex-col items-center">
            
            <div className="w-14 h-14 rounded-2xl neu-inset text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            
            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-6">
              The app encountered an unexpected error and needs to be restarted.
            </p>

            {this.state.error && (
              <div className="w-full neu-inset rounded-2xl p-4 mb-6 overflow-x-auto text-left">
                <pre className="text-xs text-rose-600 dark:text-rose-400 font-mono whitespace-pre-wrap break-words">
                  <code>{this.state.error.message}</code>
                </pre>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="neu-btn-primary w-full py-3.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
