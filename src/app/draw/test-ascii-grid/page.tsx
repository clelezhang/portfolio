'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { simplifyPath, getPathStats } from '../utils/simplifyPath';

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path' | 'ellipse' | 'polygon';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
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

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

interface PanelState {
  asciiBlocks: AsciiBlock[];
  shapes: Shape[];
  isLoading: boolean;
  responseTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  observation?: string;
  intention?: string;
}

type ApproachType = 'image' | 'svg' | 'ascii';

const APPROACHES: { id: ApproachType; label: string; color: string; description: string; endpoint: string }[] = [
  { id: 'image', label: 'IMAGE', color: '#ef4444', description: 'Canvas as JPEG image', endpoint: '/api/draw' },
  { id: 'svg', label: 'SVG PATHS', color: '#3b82f6', description: 'Actual SVG path data', endpoint: '/api/draw-svg' },
  { id: 'ascii', label: 'ASCII GRID', color: '#22c55e', description: 'ASCII art representation', endpoint: '/api/draw-ascii' },
];

export default function AsciiGridTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    APPROACHES.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false }))
  );
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(768);
  const [prompt, setPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(3);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [drawMode, setDrawMode] = useState<'all' | 'shapes' | 'ascii'>('shapes');
  const [filterSeed, setFilterSeed] = useState(1);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [simplifyEpsilon, setSimplifyEpsilon] = useState(2);
  const [asciiCellSize, setAsciiCellSize] = useState(20);
  const [strokeStats, setStrokeStats] = useState<{ original: number; simplified: number; reduction: number } | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Wobble animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, 270);
    return () => clearInterval(interval);
  }, []);

  // Calculate stroke stats
  useEffect(() => {
    if (humanStrokes.length === 0) {
      setStrokeStats(null);
      return;
    }

    let originalTotal = 0;
    let simplifiedTotal = 0;

    humanStrokes.forEach((stroke) => {
      const simplified = simplifyPath(stroke.d, simplifyEpsilon);
      const stats = getPathStats(stroke.d, simplified);
      originalTotal += stats.originalChars;
      simplifiedTotal += stats.simplifiedChars;
    });

    setStrokeStats({
      original: originalTotal,
      simplified: simplifiedTotal,
      reduction: Math.round((1 - simplifiedTotal / originalTotal) * 100),
    });
  }, [humanStrokes, simplifyEpsilon]);

  // Redraw a panel's Claude content
  const redrawPanel = useCallback((index: number) => {
    const canvas = canvasRefs.current[index];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const panel = panels[index];

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
      } else if (shape.type === 'ellipse' && shape.cx !== undefined && shape.cy !== undefined) {
        ctx.beginPath();
        ctx.ellipse(shape.cx, shape.cy, shape.rx || 10, shape.ry || 10, 0, 0, Math.PI * 2);
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
      } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0][0], shape.points[0][1]);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i][0], shape.points[i][1]);
        }
        ctx.closePath();
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fill();
        }
        ctx.stroke();
      }
    });

    panel.asciiBlocks.forEach((block) => {
      ctx.font = '14px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 16);
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
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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

    setCurrentStroke((prev) =>
      prev ? { ...prev, d: `${prev.d} L ${point.x} ${point.y}` } : null
    );

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPoint.current = null;
  };

  // Prepare canvas for image capture
  const prepareCanvasForCapture = (canvas: HTMLCanvasElement, panelIndex: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const panel = panels[panelIndex];

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Claude's shapes
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
        if (shape.color || !shape.fill) ctx.stroke(path);
      } else if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        if (shape.fill && shape.fill !== 'transparent') { ctx.fillStyle = shape.fill; ctx.fill(); }
        ctx.stroke();
      } else if (shape.type === 'line' && shape.x1 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1!);
        ctx.lineTo(shape.x2!, shape.y2!);
        ctx.stroke();
      } else if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined) {
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fillRect(shape.x, shape.y, shape.width!, shape.height!);
        }
        ctx.strokeRect(shape.x, shape.y, shape.width!, shape.height!);
      }
    });

    // Draw Claude's ASCII
    panel.asciiBlocks.forEach((block) => {
      ctx.font = '14px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      block.block.split('\n').forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 16);
      });
    });

    // Draw human strokes
    humanStrokes.forEach((stroke) => {
      const path = new Path2D(stroke.d);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });

    if (currentStroke) {
      const path = new Path2D(currentStroke.d);
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    }
  };

  const handleYourTurn = async () => {
    setPanels((prev) => prev.map((p) => ({ ...p, isLoading: true, responseTime: undefined })));

    // Prepare image canvas
    const imageCanvas = canvasRefs.current[0];
    if (imageCanvas) {
      prepareCanvasForCapture(imageCanvas, 0);
    }

    // Simplified strokes for SVG/ASCII approaches
    const simplifiedStrokes = humanStrokes.map((stroke) => ({
      ...stroke,
      d: simplifyPath(stroke.d, simplifyEpsilon),
    }));

    const requests = APPROACHES.map(async (approach, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const startTime = Date.now();

      try {
        let body: Record<string, unknown>;

        if (approach.id === 'image') {
          const image = canvas.toDataURL('image/jpeg', 0.7);
          body = {
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode,
            sayEnabled: false,
            temperature,
            maxTokens,
            prompt: prompt || undefined,
            streaming: true,
            model: 'sonnet',
          };
        } else if (approach.id === 'svg') {
          body = {
            humanStrokes: simplifiedStrokes,
            claudeShapes: panels[index].shapes,
            claudeBlocks: panels[index].asciiBlocks,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode,
            temperature,
            maxTokens,
            prompt: prompt || undefined,
            streaming: true,
            model: 'sonnet',
          };
        } else {
          // ASCII
          body = {
            humanStrokes: simplifiedStrokes,
            claudeShapes: panels[index].shapes,
            claudeBlocks: panels[index].asciiBlocks,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode,
            temperature,
            maxTokens,
            prompt: prompt || undefined,
            streaming: true,
            model: 'sonnet',
            cellSize: asciiCellSize,
          };
        }

        const response = await fetch(approach.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        await processStream(response, index, startTime);
      } catch (error) {
        console.error(`Error for ${approach.label}:`, error);
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

  const processStream = async (response: Response, index: number, startTime: number) => {
    if (!response.ok) throw new Error('Failed to get response');

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
                newPanels[index] = { ...newPanels[index], asciiBlocks: [...newPanels[index].asciiBlocks, event.data] };
                return newPanels;
              });
            } else if (event.type === 'shape') {
              setPanels((prev) => {
                const newPanels = [...prev];
                newPanels[index] = { ...newPanels[index], shapes: [...newPanels[index].shapes, event.data] };
                return newPanels;
              });
            } else if (event.type === 'observation') {
              setPanels((prev) => {
                const newPanels = [...prev];
                newPanels[index] = { ...newPanels[index], observation: event.data };
                return newPanels;
              });
            } else if (event.type === 'intention') {
              setPanels((prev) => {
                const newPanels = [...prev];
                newPanels[index] = { ...newPanels[index], intention: event.data };
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

    const responseTime = Date.now() - startTime;
    setPanels((prev) => {
      const newPanels = [...prev];
      newPanels[index] = { ...newPanels[index], responseTime };
      return newPanels;
    });
  };

  const handleClear = () => {
    canvasRefs.current.forEach((canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    setPanels(APPROACHES.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false })));
    setHumanStrokes([]);
    setCurrentStroke(null);
  };

  // Calculate token savings
  const baseTokens = panels[0].inputTokens;
  const svgSavings = baseTokens && panels[1].inputTokens ? Math.round((1 - panels[1].inputTokens / baseTokens) * 100) : null;
  const asciiSavings = baseTokens && panels[2].inputTokens ? Math.round((1 - panels[2].inputTokens / baseTokens) * 100) : null;

  return (
    <div className="h-dvh w-screen flex flex-col bg-white">
      {/* Wobble filter */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="wobbleFilter">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={3} seed={filterSeed} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs">
        <div className="font-medium">IMAGE vs SVG PATHS vs ASCII GRID</div>
        <div className="flex items-center gap-4">
          {strokeStats && (
            <div className="text-gray-500">
              Strokes: {humanStrokes.length} | Simplified: {strokeStats.reduction}% smaller
            </div>
          )}
          {svgSavings !== null && (
            <div className="text-blue-600">SVG: {svgSavings > 0 ? `-${svgSavings}%` : `+${-svgSavings}%`} tokens</div>
          )}
          {asciiSavings !== null && (
            <div className="text-green-600">ASCII: {asciiSavings > 0 ? `-${asciiSavings}%` : `+${-asciiSavings}%`} tokens</div>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Settings</div>

          <div className="mb-4">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Path simplification</span>
              <span>{simplifyEpsilon}px</span>
            </label>
            <input
              type="range" min="0.5" max="10" step="0.5"
              value={simplifyEpsilon}
              onChange={(e) => setSimplifyEpsilon(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>ASCII cell size</span>
              <span>{asciiCellSize}px</span>
            </label>
            <input
              type="range" min="10" max="40" step="5"
              value={asciiCellSize}
              onChange={(e) => setAsciiCellSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>detailed</span>
              <span>coarse</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-gray-600 mb-2 block">Draw Mode</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'shapes', 'ascii'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDrawMode(mode)}
                  className={`px-2 py-1 text-xs rounded ${drawMode === mode ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Temperature</span>
              <span>{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-gray-600 mb-1 block">Custom prompt (optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Leave empty for default..."
              className="w-full h-20 px-2 py-1 border border-gray-200 rounded text-xs resize-none"
            />
          </div>
        </div>
      )}

      {/* Three panels */}
      <div className="flex-1 flex">
        {APPROACHES.map((approach, index) => (
          <div key={approach.id} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            <div
              className="p-2 border-b border-gray-100 text-center text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-0.5"
              style={{ color: approach.color }}
            >
              <div className="flex items-center gap-2">
                {approach.label}
                {panels[index].isLoading && <span className="animate-pulse">...</span>}
                {panels[index].responseTime && (
                  <span className="text-gray-400 font-normal">{(panels[index].responseTime! / 1000).toFixed(1)}s</span>
                )}
              </div>
              <div className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">{approach.description}</div>
              {panels[index].inputTokens && (
                <div className="text-gray-500 font-normal normal-case">
                  {panels[index].inputTokens} in / {panels[index].outputTokens} out
                </div>
              )}
            </div>

            {(panels[index].observation || panels[index].intention) && (
              <div className="px-2 py-1 border-b border-gray-50 text-[10px] text-gray-500 bg-gray-50 max-h-16 overflow-auto">
                {panels[index].observation && <div><strong>Sees:</strong> {panels[index].observation}</div>}
                {panels[index].intention && <div><strong>Intends:</strong> {panels[index].intention}</div>}
              </div>
            )}

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
              <canvas
                ref={(el) => { canvasRefs.current[index] = el; }}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ filter: 'url(#wobbleFilter)' }}
              />
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'url(#wobbleFilter)' }}>
                {humanStrokes.map((stroke, i) => (
                  <path key={i} d={stroke.d} stroke={stroke.color} strokeWidth={stroke.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentStroke && (
                  <path d={currentStroke.d} stroke={currentStroke.color} strokeWidth={currentStroke.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col items-center gap-2 p-3 border-t border-gray-100">
        <div className="flex gap-2 items-center flex-wrap justify-center">
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            {['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'].map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-5 h-5 rounded-full transition-transform ${strokeColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full">
            {[2, 6, 12].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeSize(size)}
                className={`rounded-full bg-current ${strokeSize === size ? 'ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-125'}`}
                style={{ width: `${size + 4}px`, height: `${size + 4}px`, color: strokeColor }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            <button onClick={() => setTool('draw')} className={`px-2 py-1 text-xs rounded-full ${tool === 'draw' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>draw</button>
            <button onClick={() => setTool('erase')} className={`px-2 py-1 text-xs rounded-full ${tool === 'erase' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>erase</button>
          </div>
          <button
            onClick={handleYourTurn}
            disabled={panels.some((p) => p.isLoading)}
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {panels.some((p) => p.isLoading) ? '...' : "Claude's Turn"}
          </button>
          <button onClick={handleClear} className="px-3 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50">Clear</button>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm">Settings</button>
        </div>
        <p className="text-xs text-gray-400">Draw on the left panel. All three use the same input.</p>
      </div>
    </div>
  );
}
