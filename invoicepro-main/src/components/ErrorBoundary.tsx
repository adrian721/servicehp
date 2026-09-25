import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalData = () => {
    if (window.confirm('Reset data lokal (localStorage) untuk mengatasi potensi cache data yang rusak? Data tidak dapat dipulihkan jika belum tersinkron ke cloud.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h1 className="text-xl font-bold text-slate-100 mb-2">
              Terjadi Kendala Memuat Aplikasi
            </h1>
            
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Aplikasi mendeteksi error pada sistem rendering. Anda dapat mencoba memuat ulang halaman atau mereset cache lokal.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-left mb-6 max-h-36 overflow-y-auto font-mono text-xs text-rose-300">
                <span className="font-bold text-slate-300 block mb-1">Error Message:</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleResetLocalData}
                className="w-full flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all text-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Reset Cache & Data Lokal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
