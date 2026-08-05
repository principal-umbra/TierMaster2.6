import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Algo no salió como esperábamos</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                La aplicación detectó un error inesperado. Hemos registrado el incidente para solucionarlo.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-left">
                <span className="font-mono text-xs text-rose-300 block mb-1">Detalles del Error:</span>
                <p className="font-mono text-xs text-slate-400 break-all overflow-auto max-h-32">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-error-reload"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Aplicación
              </button>
              
              <button
                id="btn-error-reset"
                onClick={this.handleResetCache}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition active:scale-95"
              >
                Limpiar Caché
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
