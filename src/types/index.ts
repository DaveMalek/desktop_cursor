export type Provider = 'openai' | 'anthropic';

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ApiKeys {
  openai: string | null;
  anthropic: string | null;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface Settings {
  provider: Provider;
  model: string;
  apiKeys: ApiKeys;
}

export interface AttachedFile {
  name: string;
  content: string;
  type: string;
}

export interface AttachedImage {
  dataUrl: string;
}

export interface AttachedTable {
  markdown: string;
}
