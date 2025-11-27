import { useState, useCallback } from 'react';
import { InputArea } from './components/InputArea';
import { ResponseArea } from './components/ResponseArea';
import { SetupScreen } from './components/SetupScreen';
import { ScreenshotOverlay } from './components/ScreenshotOverlay';
import { useStore } from './hooks/useStore';
import { useAI } from './hooks/useAI';
import { Message, AttachedImage, AttachedFile, AttachedTable, MessageContent } from './types';

function App() {
  const { hasValidApiKey, getCurrentApiKey, saveApiKey, provider, isLoading: isStoreLoading } = useStore();
  const { sendMessage, isLoading: isAILoading, error: aiError } = useAI();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(false);
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);

  const handleSend = useCallback(
    async (
      text: string,
      images: AttachedImage[],
      files: AttachedFile[],
      tables: AttachedTable[]
    ) => {
      const apiKey = getCurrentApiKey();
      if (!apiKey) {
        setLocalError('No API key found');
        return;
      }

      setLocalError(null);

      // Build message content
      let messageContent: string | MessageContent[];

      // Combine text with file contents and tables
      let fullText = text;
      
      if (files.length > 0) {
        const fileContents = files
          .map((f) => `File: ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
          .join('\n\n');
        fullText = fullText ? `${fullText}\n\n${fileContents}` : fileContents;
      }

      if (tables.length > 0) {
        const tableContents = tables.map((t) => t.markdown).join('\n\n');
        fullText = fullText ? `${fullText}\n\n${tableContents}` : tableContents;
      }

      // If we have images, create multimodal content
      if (images.length > 0) {
        messageContent = [];
        
        if (fullText) {
          messageContent.push({ type: 'text', text: fullText });
        }
        
        images.forEach((img) => {
          messageContent.push({
            type: 'image_url',
            image_url: { url: img.dataUrl },
          });
        });
      } else {
        messageContent = fullText;
      }

      // Create user message
      const userMessage: Message = {
        role: 'user',
        content: messageContent,
      };

      // Add to messages history
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      try {
        // Send to AI and get response
        const response = await sendMessage(newMessages, provider, apiKey);
        
        // Update current response (replaces previous)
        setCurrentResponse(response);
        
        // Add assistant message to history
        setMessages([...newMessages, { role: 'assistant', content: response }]);
      } catch (err) {
        console.error('Error sending message:', err);
        setLocalError(err instanceof Error ? err.message : 'Failed to get response');
      }
    },
    [messages, provider, getCurrentApiKey, sendMessage]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setCurrentResponse(null);
    setLocalError(null);
  }, []);

  const handleScreenshot = useCallback(() => {
    setShowScreenshotOverlay(true);
  }, []);

  const handleScreenshotCapture = useCallback((dataUrl: string) => {
    setPendingScreenshot(dataUrl);
    setShowScreenshotOverlay(false);
  }, []);

  const handleScreenshotCancel = useCallback(() => {
    setShowScreenshotOverlay(false);
  }, []);

  const handleScreenshotConsumed = useCallback(() => {
    setPendingScreenshot(null);
  }, []);

  // Show loading state while store initializes
  if (isStoreLoading) {
    return (
      <div className="app-container">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-indicator">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  // Show setup screen if no API key
  if (!hasValidApiKey()) {
    return (
      <div className="app-container">
        <SetupScreen onSave={saveApiKey} />
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="app-container">
      {showScreenshotOverlay && (
        <ScreenshotOverlay
          onCapture={handleScreenshotCapture}
          onCancel={handleScreenshotCancel}
        />
      )}
      <InputArea
        onSend={handleSend}
        isLoading={isAILoading}
        disabled={false}
        onClearChat={handleClearChat}
        onScreenshot={handleScreenshot}
        pendingScreenshot={pendingScreenshot}
        onScreenshotConsumed={handleScreenshotConsumed}
      />
      <ResponseArea
        response={currentResponse}
        isLoading={isAILoading}
        error={localError || aiError}
      />
    </div>
  );
}

export default App;
