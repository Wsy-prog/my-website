"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl font-bold mb-2">出错了</h1>
          <p className="text-muted-foreground mb-4">页面发生了意外错误，请刷新重试</p>
          <button onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            刷新页面
          </button>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-6 text-xs text-left max-w-xl overflow-auto bg-muted p-4 rounded-xl">{this.state.error?.message}</pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}