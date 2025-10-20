// frontend/src/components/ErrorBoundary.jsx
import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary Component
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components to wrap
 * @param {ReactNode|Function} props.fallback - Custom fallback UI or function that returns JSX
 * @param {Function} props.onError - Callback when error is caught
 * @param {boolean} props.resetOnRouteChange - Reset error when route changes
 * @param {string} props.className - Additional CSS classes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
    
    // Generate a unique error ID for tracking
    this.errorId = Math.random().toString(36).substring(2, 9);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: this.errorId
    });

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.errorId);
    }

    // You can also log errors to an error reporting service here
    this.logErrorToService(error, errorInfo, this.errorId);
  }

  componentDidUpdate(prevProps) {
    // Reset error boundary when route changes (if enabled)
    if (this.props.resetOnRouteChange && 
        this.props.location !== prevProps.location) {
      this.resetErrorBoundary();
    }

    // Reset error boundary when children change
    if (this.props.children !== prevProps.children) {
      this.resetErrorBoundary();
    }
  }

  logErrorToService = (error, errorInfo, errorId) => {
    // In a real app, you would send this to an error reporting service
    // like Sentry, LogRocket, etc.
    
    const errorData = {
      errorId: errorId,
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Example: Send to your backend API
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(errorData);
    }
  };

  sendToErrorService = async (errorData) => {
    try {
      // You can implement your error reporting service here
      await fetch('/api/error-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
    } catch (e) {
      console.warn('Failed to send error to service:', e);
    }
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
    
    // Generate a new error ID for next error
    this.errorId = Math.random().toString(36).substring(2, 9);
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: this.state.error,
            errorInfo: this.state.errorInfo,
            errorId: this.state.errorId,
            resetErrorBoundary: this.resetErrorBoundary
          });
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className={`error-boundary ${this.props.className || ''}`}>
          <div className="error-boundary__content">
            <div className="error-boundary__icon">⚠️</div>
            
            <h1 className="error-boundary__title">
              Something went wrong
            </h1>
            
            <p className="error-boundary__message">
              We're sorry, but something went wrong. Our team has been notified.
            </p>

            {this.state.errorId && (
              <p className="error-boundary__error-id">
                Error ID: <code>{this.state.errorId}</code>
              </p>
            )}

            <div className="error-boundary__actions">
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.resetErrorBoundary}
              >
                Try Again
              </button>
              
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>

            {/* Error details - only shown in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error Details (Development)</summary>
                <div className="error-boundary__error-info">
                  <h4>Error:</h4>
                  <pre>{this.state.error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
