// components/monitoring/MonitoringErrorBoundary.tsx
// =========================================================
// Error Boundary spécifique au monitoring
// Affiche un fallback propre et permet le retry
// =========================================================

'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class MonitoringErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MonitoringErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <h3 className="text-lg font-bold text-red-800 mb-1">
            {this.props.fallbackMessage || 'Erreur du module monitoring'}
          </h3>
          <p className="text-sm text-red-600 mb-4 max-w-md mx-auto">
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🔄 Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
