'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase';
  color?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][];
}

interface Turn {
  who: 'human' | 'claude';
  description?: string;
}

interface Bubble {
  id: number;
  text: string;
  from: 'human' | 'claude';
  opacity: number;
}

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [asciiBlocks, setAsciiBlocks] = useState<AsciiBlock[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [humanHasDrawn, setHumanHasDrawn] = useState(false);
  const [wish, setWish] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(false);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [prompt, setPrompt] = useState(
    `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can use ASCII art and/or shapes. You can draw wherever and however you want.`
  );
  const bubbleIdRef = useRef(0);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleYourTurnRef = useRef<() => void>(() => {});

  // Add a bubble that fades away
  const addBubble = useCallback((text: string, from: 'human' | 'claude') => {
    const id = bubbleIdRef.current++;
    setBubbles((prev) => [...prev, { id, text, from, opacity: 1 }]);

    // Start fading after 3 seconds
    setTimeout(() => {
      const fadeInterval = setInterval(() => {
        setBubbles((prev) => {
          const updated = prev.map((b) =>
            b.id === id ? { ...b, opacity: b.opacity - 0.1 } : b
          );
          // Remove when fully faded
          const bubble = updated.find((b) => b.id === id);
          if (!bubble || bubble.opacity <= 0) {
            clearInterval(fadeInterval);
            return updated.filter((b) => b.id !== id);
          }
          return updated;
        });
      }, 100);
    }, 3000);
  }, []);

  // Set up canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Redraw ASCII blocks and shapes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Draw shapes
    shapes.forEach((shape) => {
      if (shape.type === 'erase' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        // Erase a rectangular area
        ctx.clearRect(shape.x, shape.y, shape.width, shape.height);
        return;
      }

      ctx.strokeStyle = shape.color || '#3b82f6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      } else if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'curve' && shape.points && shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0][0], shape.points[0][1]);
        if (shape.points.length === 3) {
          // Quadratic curve
          ctx.quadraticCurveTo(shape.points[1][0], shape.points[1][1], shape.points[2][0], shape.points[2][1]);
        } else if (shape.points.length === 4) {
          // Bezier curve
          ctx.bezierCurveTo(shape.points[1][0], shape.points[1][1], shape.points[2][0], shape.points[2][1], shape.points[3][0], shape.points[3][1]);
        } else {
          // Just connect points
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i][0], shape.points[i][1]);
          }
        }
        ctx.stroke();
      }
    });

    // Draw ASCII blocks
    asciiBlocks.forEach((block) => {
      ctx.font = '16px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 18);
      });
    });
  }, [asciiBlocks, shapes]);

  useEffect(() => {
    redraw();
  }, [asciiBlocks, shapes, redraw]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHumanHasDrawn(true);
    lastPoint.current = getPoint(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const point = getPoint(e);
    if (!point) return;

    if (tool === 'erase') {
      // Erase mode: clear pixels along the path
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    } else {
      // Draw mode: normal black strokes
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
    if (autoDrawEnabled && humanHasDrawn) {
      triggerAutoDraw();
    }
  };

  const handleYourTurn = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);

    // Build updated history
    const newHistory = [...history];
    if (humanHasDrawn) {
      newHistory.push({ who: 'human' });
    }

    try {
      const image = canvas.toDataURL('image/png');
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          previousDrawings: asciiBlocks,
          history: newHistory,
          humanMessages: pendingMessages.length > 0 ? pendingMessages : undefined,
          sayEnabled,
          temperature,
          maxTokens,
          prompt: prompt || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      let description = '';

      if (data.blocks && data.blocks.length > 0) {
        setAsciiBlocks((prev) => [...prev, ...data.blocks]);
        description += data.blocks.map((b: AsciiBlock) => b.block).join('\n---\n');
      }
      if (data.shapes && data.shapes.length > 0) {
        setShapes((prev) => [...prev, ...data.shapes]);
        const shapeDesc = data.shapes.map((s: Shape) => `${s.type}`).join(', ');
        description += (description ? '\n' : '') + `[shapes: ${shapeDesc}]`;
      }
      if (description) {
        newHistory.push({ who: 'claude', description });
        setHistory(newHistory);
        setHumanHasDrawn(false);
      }
      if (data.say) {
        addBubble(data.say, 'claude');
      }
      if (data.wish) {
        setWish(data.wish);
        console.log('claude wishes:', data.wish);
      }
      // Clear pending messages after successful send
      setPendingMessages([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep ref in sync for auto-draw
  handleYourTurnRef.current = handleYourTurn;

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAsciiBlocks([]);
    setShapes([]);
    setHistory([]);
    setHumanHasDrawn(false);
    setWish(null);
    setBubbles([]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim()) return;
    addBubble(userMessage.trim(), 'human');
    setPendingMessages((prev) => [...prev, userMessage.trim()]);
    setUserMessage('');
  };

  // Auto-draw: trigger Claude after user stops drawing
  const triggerAutoDraw = useCallback(() => {
    if (autoDrawTimeoutRef.current) {
      clearTimeout(autoDrawTimeoutRef.current);
    }
    autoDrawTimeoutRef.current = setTimeout(() => {
      handleYourTurnRef.current();
    }, 2000); // 2 second pause triggers Claude
  }, []);

  return (
    <div className="h-dvh w-screen flex flex-col bg-white relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`flex-1 touch-none ${tool === 'erase' ? 'cursor-cell' : 'cursor-crosshair'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Settings panel - shows above bottom bar */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Settings</div>

          {/* Toggles */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sayEnabled}
                onChange={(e) => setSayEnabled(e.target.checked)}
                className="rounded"
              />
              <span>Say bubble</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDrawEnabled}
                onChange={(e) => setAutoDrawEnabled(e.target.checked)}
                className="rounded"
              />
              <span>Auto-draw (2s)</span>
            </label>
          </div>

          {/* Temperature */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Temperature</span>
              <span>{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>predictable</span>
              <span>creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Max tokens</span>
              <span>{maxTokens}</span>
            </label>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>short</span>
              <span>long</span>
            </div>
          </div>

          {/* Editable Prompt */}
          <div>
            <label className="text-gray-600 mb-1 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 px-2 py-1 border border-gray-200 rounded text-xs resize-none focus:outline-none focus:border-gray-400"
            />
            {sayEnabled && (
              <p className="text-xs text-gray-400 mt-1">+ say bubble instructions</p>
            )}
          </div>
        </div>
      )}

      {/* Speech bubbles */}
      <div className="absolute bottom-24 left-4 flex flex-col gap-2 pointer-events-none">
        {bubbles.filter(b => b.from === 'human').map((bubble) => (
          <div
            key={bubble.id}
            className="bg-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm text-sm max-w-48"
            style={{ opacity: bubble.opacity }}
          >
            {bubble.text}
          </div>
        ))}
      </div>
      <div className="absolute bottom-24 right-4 flex flex-col gap-2 items-end pointer-events-none">
        {bubbles.filter(b => b.from === 'claude').map((bubble) => (
          <div
            key={bubble.id}
            className="bg-blue-500 text-white px-3 py-2 rounded-2xl rounded-br-sm text-sm max-w-48"
            style={{ opacity: bubble.opacity }}
          >
            {bubble.text}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 p-4 border-t border-gray-100">
        {wish && (
          <p className="text-sm text-gray-500 italic">&quot;{wish}&quot;</p>
        )}
        <div className="flex gap-2 items-center">
          <div className="flex border border-gray-200 rounded-full overflow-hidden">
            <button
              onClick={() => setTool('draw')}
              className={`px-3 py-2 text-sm ${tool === 'draw' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
            >
              draw
            </button>
            <button
              onClick={() => setTool('erase')}
              className={`px-3 py-2 text-sm ${tool === 'erase' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
            >
              erase
            </button>
          </div>
          {sayEnabled && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="say something..."
                className="px-3 py-2 border border-gray-200 rounded-full text-sm w-32 focus:outline-none focus:border-gray-400"
              />
            </form>
          )}
          {!autoDrawEnabled && (
            <button
              onClick={handleYourTurn}
              disabled={isLoading}
              className="px-6 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'your turn'}
            </button>
          )}
          {autoDrawEnabled && isLoading && (
            <span className="text-sm text-gray-400">drawing...</span>
          )}
          <button
            onClick={handleClear}
            className="px-6 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            clear
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ⚙
          </button>
        </div>
      </div>
    </div>
  );
}
