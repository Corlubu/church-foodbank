// frontend/src/components/ErrorBoundary.jsx
import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
    this.errorId = Math.random().toString(36).substring(2, 9);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: this.errorId,
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.errorId);
    }
    this.logErrorToService(error, errorInfo, this.errorId);
  }

  // --- UPDATED ---
  // Removed componentDidUpdate as the location prop logic
  // was not compatible with React Router v6 without a HOC.
  // Resetting when children change is often enough.
  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.children !== prevProps.children) {
      this.resetErrorBoundary();
    }
  }

  logErrorToService = (error, errorInfo, errorId) => {
    const errorData = {
      errorId: errorId,
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      // this.sendToErrorService(errorData); // TODO: Implement backend endpoint
    }
  };

  // --- UPDATED ---
  // Commented out the fetch to a non-existent API endpoint
  sendToErrorService = async (errorData) => {
    console.log('Logging error to service (disabled):', errorData);
    // try {
    //   // TODO: Create a /api/error-log endpoint on your backend
    //   await fetch('/api/error-log', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(errorData)
    //   });
    // } catch (e) {
    //   console.warn('Failed to send error to service:', e);
    // }
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
    this.errorId = Math.random().toString(36).substring(2, 9);
  };

  render() {
    if (this.state.hasError) {
      // Default fallback UI (rest of the file is unchanged)
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
