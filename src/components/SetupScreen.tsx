import { useState } from 'react';
import { Provider } from '../types';
import './SetupScreen.css';

interface SetupScreenProps {
  onSave: (key: string, provider: Provider) => Promise<boolean>;
}

export function SetupScreen({ onSave }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<Provider>('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation
    if (provider === 'openai' && !trimmedKey.startsWith('sk-')) {
      setError('OpenAI API keys should start with "sk-"');
      return;
    }

    if (provider === 'anthropic' && !trimmedKey.startsWith('sk-ant-')) {
      setError('Anthropic API keys should start with "sk-ant-"');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await onSave(trimmedKey, provider);

    if (!success) {
      setError('Failed to save API key');
    }

    setIsLoading(false);
  };

  return (
    <div className="setup-screen">
      <div className="setup-icon">🔑</div>
      <h2>Setup Your API Key</h2>
      <p>Choose a provider and enter your API key to get started</p>

      <div className="provider-selector">
        <button
          className={`provider-btn ${provider === 'openai' ? 'active' : ''}`}
          onClick={() => setProvider('openai')}
        >
          OpenAI
        </button>
        <button
          className={`provider-btn ${provider === 'anthropic' ? 'active' : ''}`}
          onClick={() => setProvider('anthropic')}
        >
          Anthropic
        </button>
      </div>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={provider === 'openai' ? 'sk-proj-...' : 'sk-ant-...'}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />

      {error && <div className="setup-error">{error}</div>}

      <button
        className="save-btn"
        onClick={handleSave}
        disabled={isLoading || !apiKey.trim()}
      >
        {isLoading ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}
