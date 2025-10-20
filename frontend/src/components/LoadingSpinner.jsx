// frontend/src/components/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css'; // We'll create this CSS file

/**
 * LoadingSpinner Component
 * 
 * @param {Object} props
 * @param {string} props.message - Loading message to display
 * @param {string} props.size - Size of spinner: 'small', 'medium', 'large'
 * @param {string} props.variant - Spinner style: 'dots', 'ring', 'bars', 'pulse'
 * @param {string} props.color - Custom color for spinner
 * @param {boolean} props.overlay - Whether to show as overlay
 * @param {boolean} props.fullScreen - Whether to cover entire screen
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({
  message = "Loading...",
  size = "medium",
  variant = "dots",
  color,
  overlay = false,
  fullScreen = false,
  className = ""
}) => {
  const spinnerClass = `
    loading-spinner 
    loading-spinner--${size}
    loading-spinner--${variant}
    ${overlay ? 'loading-spinner--overlay' : ''}
    ${fullScreen ? 'loading-spinner--fullscreen' : ''}
    ${className}
  `.trim();

  const spinnerStyle = color ? { '--spinner-color': color } : {};

  return (
    <div className={spinnerClass} style={spinnerStyle}>
      <div className="loading-spinner__animation">
        {renderSpinner(variant)}
      </div>
      {message && (
        <div className="loading-spinner__message">
          {message}
        </div>
      )}
    </div>
  );
};

// Helper function to render different spinner variants
const renderSpinner = (variant) => {
  switch (variant) {
    case 'dots':
      return (
        <div className="dots-spinner">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      );
    
    case 'ring':
      return (
        <div className="ring-spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      );
    
    case 'bars':
      return (
        <div className="bars-spinner">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      );
    
    case 'pulse':
      return <div className="pulse-spinner"></div>;
    
    default:
      return renderSpinner('dots');
  }
};

export default LoadingSpinner;
