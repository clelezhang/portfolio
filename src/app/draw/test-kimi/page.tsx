'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path';
  color?: string;
  fill?: string;
  strokeWidth?: number;
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
  d?: string;
}

interface PanelState {
  asciiBlocks: AsciiBlock[];
  shapes: Shape[];
  isLoading: boolean;
  responseTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

type ProviderType = 'claude' | 'openai';

const PROVIDERS: { id: ProviderType; label: string; color: string; model: string; endpoint: string }[] = [
  { id: 'claude', label: 'Claude', color: '#D97706', model: 'opus', endpoint: '/api/draw' },
  { id: 'openai', label: 'GPT-4o', color: '#10a37f', model: 'gpt-4o', endpoint: '/api/draw-kimi' },
];

export default function KimiComparisonPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    PROVIDERS.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false }))
  );
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [prompt, setPrompt] = useState(
    `You are an AI able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`
  );
  const [showSettings, setShowSettings] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(2);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [drawMode, setDrawMode] = useState<'all' | 'shapes' | 'ascii'>('all');
  const [sayEnabled, setSayEnabled] = useState(false);
  const [filterSeed, setFilterSeed] = useState(1);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Wobble animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, 270);
    return () => clearInterval(interval);
  }, []);

  // Redraw a panel's content
  const redrawPanel = useCallback((index: number) => {
    const canvas = canvasRefs.current[index];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const panel = panels[index];

    // Draw shapes
    panel.shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color || '#3b82f6';
      ctx.lineWidth = shape.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (shape.type === 'path' && shape.d) {
        const path = new Path2D(shape.d);
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fill(path);
        }
        if (shape.color || !shape.fill) {
          ctx.stroke(path);
        }
      } else if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fill();
        }
        ctx.stroke();
      } else if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      } else if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'curve' && shape.points && shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0][0], shape.points[0][1]);
        if (shape.points.length === 3) {
          ctx.quadraticCurveTo(shape.points[1][0], shape.points[1][1], shape.points[2][0], shape.points[2][1]);
        } else if (shape.points.length === 4) {
          ctx.bezierCurveTo(shape.points[1][0], shape.points[1][1], shape.points[2][0], shape.points[2][1], shape.points[3][0], shape.points[3][1]);
        }
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fill();
        }
        ctx.stroke();
      }
    });

    // Draw ASCII blocks
    panel.asciiBlocks.forEach((block) => {
      if (!block.block) return;
      ctx.font = '16px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 18);
      });
    });
  }, [panels]);

  // Set up canvases
  useEffect(() => {
    const updateSizes = () => {
      canvasRefs.current.forEach((canvas, i) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawPanel(i);
      });
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, [redrawPanel]);

  useEffect(() => {
    panels.forEach((_, i) => redrawPanel(i));
  }, [panels, redrawPanel]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
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
    const canvas = canvasRefs.current[0];
    if (!canvas) return;
    setIsDrawing(true);
    const point = getPoint(e, canvas);
    lastPoint.current = point;

    setCurrentStroke({
      d: `M ${point.x} ${point.y}`,
      color: tool === 'erase' ? '#ffffff' : strokeColor,
      strokeWidth: tool === 'erase' ? strokeSize * 5 : strokeSize,
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    const firstCanvas = canvasRefs.current[0];
    if (!firstCanvas) return;
    const point = getPoint(e, firstCanvas);

    setCurrentStroke(prev => prev ? {
      ...prev,
      d: `${prev.d} L ${point.x} ${point.y}`,
    } : null);

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const renderStrokesToCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    humanStrokes.forEach((stroke) => {
      const path = new Path2D(stroke.d);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });
  };

  const handleYourTurn = async () => {
    // Set all panels to loading
    setPanels((prev) => prev.map((p) => ({ ...p, isLoading: true, responseTime: undefined, error: undefined })));

    // Render human strokes to all canvases before taking snapshot
    canvasRefs.current.forEach((canvas) => {
      if (canvas) renderStrokesToCanvas(canvas);
    });

    // Send requests in parallel for each provider
    const requests = PROVIDERS.map(async (provider, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const startTime = Date.now();

      try {
        const image = canvas.toDataURL('image/png');
        const isStreaming = provider.id === 'claude';

        const response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode,
            sayEnabled,
            temperature,
            maxTokens,
            prompt,
            streaming: isStreaming,
            model: provider.model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }

        if (isStreaming) {
          // Claude uses SSE streaming
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader available');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));

                  if (event.type === 'block') {
                    setPanels((prev) => {
                      const newPanels = [...prev];
                      newPanels[index] = {
                        ...newPanels[index],
                        asciiBlocks: [...newPanels[index].asciiBlocks, event.data],
                      };
                      return newPanels;
                    });
                  } else if (event.type === 'shape') {
                    setPanels((prev) => {
                      const newPanels = [...prev];
                      newPanels[index] = {
                        ...newPanels[index],
                        shapes: [...newPanels[index].shapes, event.data],
                      };
                      return newPanels;
                    });
                  } else if (event.type === 'done' && event.usage) {
                    setPanels((prev) => {
                      const newPanels = [...prev];
                      newPanels[index] = {
                        ...newPanels[index],
                        inputTokens: event.usage.input_tokens,
                        outputTokens: event.usage.output_tokens,
                      };
                      return newPanels;
                    });
                  }
                } catch { /* skip */ }
              }
            }
          }
        } else {
          // Kimi uses direct JSON response
          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          setPanels((prev) => {
            const newPanels = [...prev];
            newPanels[index] = {
              ...newPanels[index],
              asciiBlocks: data.blocks || [],
              shapes: data.shapes || [],
              inputTokens: data.inputTokens,
              outputTokens: data.outputTokens,
            };
            return newPanels;
          });
        }

        const responseTime = Date.now() - startTime;
        setPanels((prev) => {
          const newPanels = [...prev];
          newPanels[index] = { ...newPanels[index], responseTime };
          return newPanels;
        });
      } catch (error) {
        console.error(`Error for ${provider.label}:`, error);
        setPanels((prev) => {
          const newPanels = [...prev];
          newPanels[index] = {
            ...newPanels[index],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          return newPanels;
        });
      } finally {
        setPanels((prev) => {
          const newPanels = [...prev];
          newPanels[index] = { ...newPanels[index], isLoading: false };
          return newPanels;
        });
      }
    });

    await Promise.all(requests);
  };

  const handleClear = () => {
    canvasRefs.current.forEach((canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    setPanels(PROVIDERS.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false })));
    setHumanStrokes([]);
    setCurrentStroke(null);
  };

  return (
    <div className="h-dvh w-screen flex flex-col bg-white">
      {/* Wobble filter */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="wobbleFilter">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={3}
              seed={filterSeed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Settings</div>

          {/* Draw Mode */}
          <div className="mb-4">
            <label className="text-gray-600 mb-2 block">Draw Mode</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'shapes', 'ascii'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDrawMode(mode)}
                  className={`px-2 py-1 text-xs rounded ${
                    drawMode === mode
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'shapes' ? 'Shapes' : 'ASCII'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {drawMode === 'shapes' && 'SVG paths and geometric shapes'}
              {drawMode === 'ascii' && 'Text-based ASCII art characters'}
              {drawMode === 'all' && 'All drawing methods available'}
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sayEnabled}
                onChange={(e) => setSayEnabled(e.target.checked)}
                className="rounded"
              />
              <span>Comments</span>
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
              <p className="text-xs text-gray-400 mt-1">+ comment instructions</p>
            )}
          </div>
        </div>
      )}

      {/* Two panels - Claude vs Kimi */}
      <div className="flex-1 flex">
        {PROVIDERS.map((provider, index) => (
          <div key={provider.id} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Provider label */}
            <div
              className="p-2 border-b border-gray-100 text-center text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-1"
              style={{ color: provider.color }}
            >
              <div className="flex items-center gap-2">
                {provider.label}
                {panels[index].isLoading && <span className="animate-pulse">...</span>}
                {panels[index].responseTime && (
                  <span className="text-gray-400 font-normal">
                    {(panels[index].responseTime! / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {(panels[index].inputTokens || panels[index].outputTokens) && (
                <div className="text-gray-400 font-normal normal-case tracking-normal">
                  {panels[index].inputTokens}→{panels[index].outputTokens} tokens
                </div>
              )}
              {panels[index].error && (
                <div className="text-red-500 font-normal normal-case tracking-normal text-xs">
                  {panels[index].error}
                </div>
              )}
            </div>
            {/* Canvas container with SVG overlay */}
            <div
              className={`flex-1 relative ${index === 0 ? 'cursor-crosshair' : 'pointer-events-none'}`}
              onMouseDown={index === 0 ? startDrawing : undefined}
              onMouseMove={index === 0 ? draw : undefined}
              onMouseUp={index === 0 ? stopDrawing : undefined}
              onMouseLeave={index === 0 ? stopDrawing : undefined}
              onTouchStart={index === 0 ? startDrawing : undefined}
              onTouchMove={index === 0 ? draw : undefined}
              onTouchEnd={index === 0 ? stopDrawing : undefined}
            >
              {/* Canvas for AI drawings and capturing snapshot */}
              <canvas
                ref={(el) => { canvasRefs.current[index] = el; }}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ filter: 'url(#wobbleFilter)' }}
              />
              {/* SVG layer for human strokes */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ filter: 'url(#wobbleFilter)' }}
              >
                {humanStrokes.map((stroke, i) => (
                  <path
                    key={i}
                    d={stroke.d}
                    stroke={stroke.color}
                    strokeWidth={stroke.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentStroke && (
                  <path
                    d={currentStroke.d}
                    stroke={currentStroke.color}
                    strokeWidth={currentStroke.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col items-center gap-2 p-4 border-t border-gray-100">
        <div className="flex gap-2 items-center">
          {/* Color palette */}
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            {['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'].map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  strokeColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          {/* Size selector */}
          <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full">
            {[2, 6, 12].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeSize(size)}
                className={`rounded-full bg-current transition-transform ${
                  strokeSize === size ? 'ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-125'
                }`}
                style={{
                  width: `${size + 4}px`,
                  height: `${size + 4}px`,
                  color: strokeColor,
                }}
                title={`${size}px`}
              />
            ))}
          </div>
          {/* Tool selector */}
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            <button
              onClick={() => setTool('draw')}
              className={`px-2 py-1 text-xs rounded-full ${tool === 'draw' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              draw
            </button>
            <button
              onClick={() => setTool('erase')}
              className={`px-2 py-1 text-xs rounded-full ${tool === 'erase' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              erase
            </button>
          </div>
          {/* Draw mode toggle */}
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            {(['all', 'shapes', 'ascii'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDrawMode(mode)}
                className={`px-2 py-1 text-xs rounded-full ${drawMode === mode ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* Actions */}
          <button
            onClick={handleYourTurn}
            disabled={panels.some((p) => p.isLoading)}
            className="px-3 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {panels.some((p) => p.isLoading) ? '...' : '🫱'}
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            🧹
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ⚙
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Provider comparison: <span style={{ color: '#D97706' }}>Claude Opus</span> vs <span style={{ color: '#10a37f' }}>GPT-4o</span>
        </p>
      </div>
    </div>
  );
}
