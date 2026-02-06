'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import '../draw.css';

// Types
import { AsciiBlock, Shape, DrawMode, HumanStroke, Point, Tool } from '../types';

// Constants
import { COLOR_PALETTES, DEFAULT_STROKE_SIZE, DEFAULT_PROMPT } from '../constants';

// Components
import { DrawToolbar } from '../components/DrawToolbar';

interface PanelState {
  asciiBlocks: AsciiBlock[];
  shapes: Shape[];
  isLoading: boolean;
  responseTime?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface OpusModel {
  id: string;
  label: string;
  color: string;
}

const OPUS_MODELS: OpusModel[] = [
  { id: 'opus-4', label: 'Opus 4', color: '#3b82f6' },
  { id: 'opus-4.1', label: 'Opus 4.1', color: '#8b5cf6' },
  { id: 'opus-4.5', label: 'Opus 4.5', color: '#f59e0b' },
  { id: 'opus-4.6', label: 'Opus 4.6', color: '#ef4444' },
];

export default function OpusTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    OPUS_MODELS.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false }))
  );
  const [filterSeed, setFilterSeed] = useState(1);

  // Drawing state
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const lastPoint = useRef<Point | null>(null);

  // Tool state
  const [tool, setTool] = useState<Tool>('draw');
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeSize, setStrokeSize] = useState(DEFAULT_STROKE_SIZE);
  const [strokeColor, setStrokeColor] = useState<string>(COLOR_PALETTES[4][0]);
  const [paletteIndex, setPaletteIndex] = useState(4);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [drawMode, setDrawMode] = useState<DrawMode>('all');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(10000);

  // Wobble animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, 270);
    return () => clearInterval(interval);
  }, []);

  // Redraw a panel's Claude content
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
    setPanels((prev) => prev.map((p) => ({ ...p, isLoading: true, responseTime: undefined })));

    // Render human strokes to all canvases before taking snapshot
    canvasRefs.current.forEach((canvas) => {
      if (canvas) renderStrokesToCanvas(canvas);
    });

    // Send requests in parallel for each model
    const requests = OPUS_MODELS.map(async (model, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const startTime = Date.now();

      try {
        const image = canvas.toDataURL('image/png');
        const response = await fetch('/api/draw', {
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
            streaming: true,
            model: model.id,
            thinkingEnabled,
            thinkingBudget,
          }),
        });

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
                } else if (event.type === 'usage') {
                  setPanels((prev) => {
                    const newPanels = [...prev];
                    newPanels[index] = {
                      ...newPanels[index],
                      inputTokens: event.input_tokens,
                      outputTokens: event.output_tokens,
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
      } catch (error) {
        console.error(`Error for ${model.label}:`, error);
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
    setPanels(OPUS_MODELS.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false })));
    setHumanStrokes([]);
    setCurrentStroke(null);
  };

  const handleSave = () => {
    // Download first canvas as image
    const canvas = canvasRefs.current[0];
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'opus-test.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="draw-page">
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
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg text-sm z-50 w-80">
          <div className="font-medium mb-3 text-gray-700">Settings</div>

          {/* Draw Mode */}
          <div className="mb-4">
            <label className="text-gray-600 mb-2 block text-xs font-medium">Draw Mode</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'shapes', 'ascii'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDrawMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    drawMode === mode
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'shapes' ? 'Shapes' : 'ASCII'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sayEnabled}
                onChange={(e) => setSayEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span className="text-gray-600 text-xs">Enable comments</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => setThinkingEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span className="text-gray-600 text-xs">Extended thinking</span>
            </label>
          </div>

          {/* Temperature */}
          <div className="mb-4">
            <label className="flex justify-between text-gray-600 mb-1 text-xs font-medium">
              <span>Temperature</span>
              <span className="text-gray-400">{thinkingEnabled ? 'N/A' : temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full draw-settings-slider"
              disabled={thinkingEnabled}
            />
          </div>

          {/* Thinking Budget (when enabled) */}
          {thinkingEnabled && (
            <div className="mb-4">
              <label className="flex justify-between text-gray-600 mb-1 text-xs font-medium">
                <span>Thinking budget</span>
                <span className="text-gray-400">{thinkingBudget.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="5000"
                max="32000"
                step="1000"
                value={thinkingBudget}
                onChange={(e) => setThinkingBudget(parseInt(e.target.value))}
                className="w-full draw-settings-slider"
              />
            </div>
          )}

          {/* Max Tokens */}
          <div className="mb-4">
            <label className="flex justify-between text-gray-600 mb-1 text-xs font-medium">
              <span>Max tokens</span>
              <span className="text-gray-400">{maxTokens}</span>
            </label>
            <input
              type="range"
              min="512"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
          </div>

          {/* Editable Prompt */}
          <div>
            <label className="text-gray-600 mb-1 block text-xs font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>
      )}

      {/* Main content - 2x2 grid */}
      <div className="draw-main">
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3" ref={containerRef}>
          {OPUS_MODELS.map((model, index) => (
            <div key={model.id} className="draw-canvas-container flex flex-col">
              {/* Panel header */}
              <div
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--draw-border)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-xs font-medium" style={{ color: model.color }}>
                    {model.label}
                  </span>
                  {panels[index].isLoading && (
                    <span className="text-xs text-gray-400 animate-pulse">...</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {panels[index].responseTime && (
                    <span>{(panels[index].responseTime! / 1000).toFixed(1)}s</span>
                  )}
                  {panels[index].inputTokens !== undefined && (
                    <span>{panels[index].inputTokens}→{panels[index].outputTokens}</span>
                  )}
                </div>
              </div>

              {/* Canvas area */}
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
                {/* Grid background */}
                <div className="absolute inset-0 draw-canvas-dots" />

                {/* Canvas for Claude's drawings */}
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
      </div>

      {/* Toolbar - using the actual DrawToolbar component */}
      <DrawToolbar
        tool={tool}
        setTool={setTool}
        asciiStroke={asciiStroke}
        setAsciiStroke={setAsciiStroke}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeSize={strokeSize}
        setStrokeSize={setStrokeSize}
        paletteIndex={paletteIndex}
        setPaletteIndex={setPaletteIndex}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isLoading={panels.some((p) => p.isLoading)}
        onYourTurn={handleYourTurn}
        onClear={handleClear}
        onSave={handleSave}
        animationType="slide"
      />
    </div>
  );
}
