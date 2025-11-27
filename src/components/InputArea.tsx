import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { AttachedImage, AttachedFile, AttachedTable } from '../types';
import './InputArea.css';

interface InputAreaProps {
  onSend: (
    text: string,
    images: AttachedImage[],
    files: AttachedFile[],
    tables: AttachedTable[]
  ) => void;
  isLoading: boolean;
  disabled: boolean;
  onClearChat: () => void;
  onScreenshot: () => void;
  pendingScreenshot: string | null;
  onScreenshotConsumed: () => void;
}

export function InputArea({ onSend, isLoading, disabled, onClearChat, onScreenshot, pendingScreenshot, onScreenshotConsumed }: InputAreaProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [tables, setTables] = useState<AttachedTable[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add pending screenshot to images when it's available
  useEffect(() => {
    if (pendingScreenshot) {
      setImages((prev) => [...prev, { dataUrl: pendingScreenshot }]);
      onScreenshotConsumed();
    }
  }, [pendingScreenshot, onScreenshotConsumed]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if ((!text.trim() && images.length === 0 && files.length === 0 && tables.length === 0) || isLoading || disabled) {
      return;
    }

    onSend(text, images, files, tables);
    setText('');
    setImages([]);
    setFiles([]);
    setTables([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    for (const file of Array.from(selectedFiles)) {
      if (file.size > 1024 * 1024) {
        alert('File is too large. Maximum size is 1MB.');
        continue;
      }

      const content = await file.text();
      setFiles((prev) => [
        ...prev,
        { name: file.name, content, type: file.type },
      ]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeTable = (index: number) => {
    setTables((prev) => prev.filter((_, i) => i !== index));
  };

  const hasAttachments = images.length > 0 || files.length > 0 || tables.length > 0;

  return (
    <div className="input-area">
      {/* Attachments Preview */}
      {hasAttachments && (
        <div className="attachments-preview">
          {images.map((img, i) => (
            <div key={`img-${i}`} className="attachment-thumb" onClick={() => removeImage(i)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              <span className="remove-badge">×</span>
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`file-${i}`} className="attachment-thumb" onClick={() => removeFile(i)} title={file.name}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              <span className="remove-badge">×</span>
            </div>
          ))}
          {tables.map((_, i) => (
            <div key={`table-${i}`} className="attachment-thumb" onClick={() => removeTable(i)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" />
              </svg>
              <span className="remove-badge">×</span>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything..."
        disabled={disabled || isLoading}
        rows={1}
      />

      {/* Action Buttons */}
      <div className="input-actions">
        {/* Screenshot Button */}
        <button
          className="action-btn"
          title="Take screenshot"
          onClick={onScreenshot}
          disabled={disabled || isLoading}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
          </svg>
        </button>

        {/* File Upload Button */}
        <button
          className="action-btn"
          title="Upload file"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.json,.md"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          multiple
        />

        {/* Table Button - placeholder for Phase 2 */}
        <button
          className="action-btn"
          title="Create table (Coming soon)"
          disabled={true}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" />
          </svg>
        </button>

        {/* Clear Button */}
        <button
          className="action-btn"
          title="Clear chat"
          onClick={onClearChat}
          disabled={disabled || isLoading}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>

        {/* Send Button */}
        <button
          className="action-btn send-btn"
          title="Send message"
          onClick={handleSend}
          disabled={disabled || isLoading || (!text.trim() && !hasAttachments)}
        >
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
