'use client';

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('[Enhanced Error Boundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, {
        context: 'React Error Boundary',
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    console.log('[Enhanced Error Boundary] Retrying after error');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReload = () => {
    console.log('[Enhanced Error Boundary] Reloading page after error');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <motion.div
            className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              ⚠️
            </motion.div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-bold text-gray-800 mb-2">Error Details:</h3>
              <p className="text-sm text-gray-600 mb-2">
                <strong>ID:</strong> {this.state.errorId}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Message:</strong> {this.state.error?.message || 'Unknown error'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Time:</strong> {new Date().toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <motion.button
                onClick={this.handleRetry}
                className="w-full bg-primary text-white py-3 px-6 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔄 Try Again
              </motion.button>
              
              <motion.button
                onClick={this.handleReload}
                className="w-full bg-gray-500 text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔃 Reload Page
              </motion.button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If this problem persists, please contact support with Error ID: {this.state.errorId}
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;