import './ResponseArea.css';

interface ResponseAreaProps {
  response: string | null;
  isLoading: boolean;
  error: string | null;
}

export function ResponseArea({ response, isLoading, error }: ResponseAreaProps) {
  if (error) {
    return (
      <div className="response-area error">
        <div className="error-icon">⚠️</div>
        <div className="error-text">{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="response-area loading">
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <span>Analyzing...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-area empty">
        <div className="welcome-message">
          Hey! I'm your data analyst assistant.
        </div>
      </div>
    );
  }

  return (
    <div className="response-area">
      <div className="response-content fade-in">
        {response}
      </div>
      <div className="response-timestamp">
        {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
}
