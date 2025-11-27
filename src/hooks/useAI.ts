import { useState, useCallback } from 'react';
import { Message, Provider, MessageContent } from '../types';

const MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

const SYSTEM_PROMPT = `You are a helpful assistant for data analysts. Help with SQL, Python, data analysis questions, and best practices. When analyzing screenshots, extract any text, tables, code, or diagrams and provide detailed analysis. Keep responses concise and practical.`;

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      provider: Provider,
      apiKey: string
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        if (provider === 'openai') {
          return await sendOpenAI(messages, apiKey);
        } else {
          return await sendAnthropic(messages, apiKey);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}

async function sendOpenAI(messages: Message[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELS.openai,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Unexpected response format from OpenAI');
}

async function sendAnthropic(messages: Message[], apiKey: string): Promise<string> {
  // Convert messages to Anthropic format
  const anthropicMessages = messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // Handle multimodal content
    const content = (msg.content as MessageContent[]).map((item) => {
      if (item.type === 'text') {
        return { type: 'text', text: item.text };
      } else if (item.type === 'image_url' && item.image_url) {
        // Extract base64 data from data URL
        const dataUrl = item.image_url.url;
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: matches[1],
              data: matches[2],
            },
          };
        }
      }
      return null;
    }).filter(Boolean);

    return {
      role: msg.role,
      content,
    };
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODELS.anthropic,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (data.content?.[0]?.text) {
    return data.content[0].text;
  }

  throw new Error('Unexpected response format from Anthropic');
}
