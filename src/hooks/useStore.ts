import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiKeys, Provider } from '../types';

export function useStore() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai: null, anthropic: null });
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>('openai');

  // Load API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await invoke<ApiKeys>('get_api_keys');
      setApiKeys({
        openai: typeof keys.openai === 'string' ? keys.openai : null,
        anthropic: typeof keys.anthropic === 'string' ? keys.anthropic : null,
      });
      
      // Set default provider based on available keys
      if (keys.anthropic && typeof keys.anthropic === 'string') {
        setProvider('anthropic');
      } else if (keys.openai && typeof keys.openai === 'string') {
        setProvider('openai');
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = useCallback(async (key: string, type: Provider) => {
    try {
      if (type === 'openai') {
        await invoke('save_api_keys', { openaiKey: key, anthropicKey: null });
        setApiKeys((prev) => ({ ...prev, openai: key }));
      } else {
        await invoke('save_api_keys', { openaiKey: null, anthropicKey: key });
        setApiKeys((prev) => ({ ...prev, anthropic: key }));
      }
      setProvider(type);
      return true;
    } catch (err) {
      console.error('Failed to save API key:', err);
      return false;
    }
  }, []);

  const getCurrentApiKey = useCallback(() => {
    return provider === 'openai' ? apiKeys.openai : apiKeys.anthropic;
  }, [provider, apiKeys]);

  const hasValidApiKey = useCallback(() => {
    const key = getCurrentApiKey();
    return key !== null && key.length > 0;
  }, [getCurrentApiKey]);

  return {
    apiKeys,
    provider,
    setProvider,
    saveApiKey,
    getCurrentApiKey,
    hasValidApiKey,
    isLoading,
    reloadKeys: loadApiKeys,
  };
}
