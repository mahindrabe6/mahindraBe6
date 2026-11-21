import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendly = 'Something went wrong while syncing your fleet data.';
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string };
        if (parsed.error) {
          friendly = parsed.error;
        }
      } catch {
        if (this.state.message) friendly = this.state.message;
      }

      return (
        <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#090D16] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E8EE] dark:border-white/[0.08] p-6 shadow-sm space-y-4 text-center">
            <span className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <h1 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
              Mahindra BE6 Session Interrupted
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-[#E08E45] text-white dark:text-[#090D16] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
