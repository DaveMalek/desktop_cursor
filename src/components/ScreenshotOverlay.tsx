import { useState, useRef, useEffect, MouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './ScreenshotOverlay.css';

interface RedactionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotOverlayProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export function ScreenshotOverlay({ onCapture, onCancel }: ScreenshotOverlayProps) {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [redactionMode, setRedactionMode] = useState(false);
  const [redactions, setRedactions] = useState<RedactionRect[]>([]);
  const [redactionStart, setRedactionStart] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Capture full screenshot on mount
  useEffect(() => {
    const captureFullScreen = async () => {
      try {
        const dataUrl = await invoke<string>('capture_screenshot');
        setScreenshotDataUrl(dataUrl);
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        onCancel();
      }
    };
    captureFullScreen();
  }, [onCancel]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (redactionMode && selectedArea) {
      // Start redaction
      setRedactionStart({ x, y });
    } else if (!selectedArea) {
      // Start selection
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting && selectionStart) {
      setSelectionEnd({ x, y });
    } else if (redactionMode && redactionStart) {
      // Show redaction preview
      setSelectionEnd({ x, y });
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting && selectionStart) {
      setIsSelecting(false);
      const width = Math.abs(x - selectionStart.x);
      const height = Math.abs(y - selectionStart.y);
      const finalX = Math.min(selectionStart.x, x);
      const finalY = Math.min(selectionStart.y, y);

      if (width > 10 && height > 10) {
        setSelectedArea({ x: finalX, y: finalY, width, height });
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    } else if (redactionMode && redactionStart) {
      // Complete redaction
      const width = Math.abs(x - redactionStart.x);
      const height = Math.abs(y - redactionStart.y);
      const finalX = Math.min(redactionStart.x, x);
      const finalY = Math.min(redactionStart.y, y);

      if (width > 5 && height > 5) {
        setRedactions([...redactions, { x: finalX, y: finalY, width, height }]);
      }
      setRedactionStart(null);
      setSelectionEnd(null);
    }
  };

  const handleConfirm = async () => {
    if (!selectedArea || !screenshotDataUrl) return;

    try {
      // Load the screenshot image
      const img = new Image();
      img.src = screenshotDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate scale factor between displayed size and actual image size
      const scaleX = img.width / canvas.offsetWidth;
      const scaleY = img.height / canvas.offsetHeight;

      // Create a canvas for the cropped area
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = selectedArea.width * scaleX;
      cropCanvas.height = selectedArea.height * scaleY;
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return;

      // Draw the selected area
      ctx.drawImage(
        img,
        selectedArea.x * scaleX,
        selectedArea.y * scaleY,
        selectedArea.width * scaleX,
        selectedArea.height * scaleY,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      // Apply redactions
      if (redactions.length > 0) {
        ctx.fillStyle = 'black';
        redactions.forEach((redaction) => {
          const relX = (redaction.x - selectedArea.x) * scaleX;
          const relY = (redaction.y - selectedArea.y) * scaleY;
          const relWidth = redaction.width * scaleX;
          const relHeight = redaction.height * scaleY;
          ctx.fillRect(relX, relY, relWidth, relHeight);
        });
      }

      const finalDataUrl = cropCanvas.toDataURL('image/png');
      onCapture(finalDataUrl);
    } catch (error) {
      console.error('Failed to process screenshot:', error);
      onCancel();
    }
  };

  const getSelectionRect = () => {
    if (selectedArea) return selectedArea;
    if (!selectionStart || !selectionEnd) return null;

    return {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };
  };

  const getCurrentRedaction = () => {
    if (!redactionStart || !selectionEnd) return null;

    return {
      x: Math.min(redactionStart.x, selectionEnd.x),
      y: Math.min(redactionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - redactionStart.x),
      height: Math.abs(selectionEnd.y - redactionStart.x),
    };
  };

  const selectionRect = getSelectionRect();
  const currentRedaction = getCurrentRedaction();

  return (
    <div className="screenshot-overlay">
      <div
        className="screenshot-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {screenshotDataUrl && (
          <canvas
            ref={canvasRef}
            className="screenshot-canvas"
            style={{
              backgroundImage: `url(${screenshotDataUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Selection rectangle */}
        {selectionRect && (
          <div
            className="selection-rect"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}

        {/* Redaction rectangles */}
        {redactions.map((redaction, i) => (
          <div
            key={i}
            className="redaction-rect"
            style={{
              left: redaction.x,
              top: redaction.y,
              width: redaction.width,
              height: redaction.height,
            }}
          />
        ))}

        {/* Current redaction being drawn */}
        {currentRedaction && (
          <div
            className="redaction-rect redaction-preview"
            style={{
              left: currentRedaction.x,
              top: currentRedaction.y,
              width: currentRedaction.width,
              height: currentRedaction.height,
            }}
          />
        )}
      </div>

      <div className="screenshot-controls">
        <div className="screenshot-instructions">
          {!selectedArea && 'Drag to select an area'}
          {selectedArea && !redactionMode && 'Click Redact to black out sensitive info, or Confirm to capture'}
          {selectedArea && redactionMode && 'Drag to add black redaction boxes'}
        </div>

        <div className="screenshot-buttons">
          {!selectedArea && (
            <button onClick={onCancel} className="screenshot-btn cancel-btn">
              Cancel
            </button>
          )}

          {selectedArea && !redactionMode && (
            <>
              <button onClick={() => setSelectedArea(null)} className="screenshot-btn">
                Reselect
              </button>
              <button onClick={() => setRedactionMode(true)} className="screenshot-btn">
                Redact
              </button>
              <button onClick={handleConfirm} className="screenshot-btn confirm-btn">
                Confirm
              </button>
            </>
          )}

          {selectedArea && redactionMode && (
            <>
              <button onClick={() => setRedactions([])} className="screenshot-btn">
                Clear Redactions
              </button>
              <button onClick={() => setRedactionMode(false)} className="screenshot-btn">
                Done Redacting
              </button>
              <button onClick={handleConfirm} className="screenshot-btn confirm-btn">
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
