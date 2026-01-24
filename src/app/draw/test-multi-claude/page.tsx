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

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

interface PanelState {
  shapes: Shape[];
  blocks: AsciiBlock[];
  isLoading: boolean;
  loadingCount: number; // For multi-claude: how many Claudes are still drawing
}

const CLAUDE_COUNT = 3;
const CLAUDE_COLORS = ['#3b82f6', '#ef4444', '#22c55e']; // Blue, Red, Green for each Claude

export default function MultiClaudeTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>([
    { shapes: [], blocks: [], isLoading: false, loadingCount: 0 },
    { shapes: [], blocks: [], isLoading: false, loadingCount: 0 },
  ]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(2);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [prompt, setPrompt] = useState(
    `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`
  );
  const [showSettings, setShowSettings] = useState(false);
  const [filterSeed, setFilterSeed] = useState(1);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Wobble animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, 168);
    return () => clearInterval(interval);
  }, []);

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
    panel.blocks.forEach((block) => {
      ctx.font = '16px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 18);
      });
    });
  }, [panels]);

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

  // Render human strokes to a canvas for snapshot
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

  // Single Claude turn for Panel 1
  const handleSingleClaudeTurn = async (panelIndex: number) => {
    setPanels(prev => {
      const newPanels = [...prev];
      newPanels[panelIndex] = { ...newPanels[panelIndex], isLoading: true, loadingCount: 1 };
      return newPanels;
    });

    const canvas = canvasRefs.current[panelIndex];
    if (!canvas) return;

    // Render human strokes to canvas before snapshot
    renderStrokesToCanvas(canvas);

    try {
      const image = canvas.toDataURL('image/png');
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          drawMode: 'shapes',
          temperature,
          maxTokens,
          prompt,
          streaming: true,
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
                setPanels(prev => {
                  const newPanels = [...prev];
                  newPanels[panelIndex] = {
                    ...newPanels[panelIndex],
                    blocks: [...newPanels[panelIndex].blocks, event.data],
                  };
                  return newPanels;
                });
              } else if (event.type === 'shape') {
                setPanels(prev => {
                  const newPanels = [...prev];
                  newPanels[panelIndex] = {
                    ...newPanels[panelIndex],
                    shapes: [...newPanels[panelIndex].shapes, event.data],
                  };
                  return newPanels;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (error) {
      console.error('Single Claude error:', error);
    } finally {
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[panelIndex] = { ...newPanels[panelIndex], isLoading: false, loadingCount: 0 };
        return newPanels;
      });
    }
  };

  // Multi-Claude PARALLEL for Panel 2 - all 3 see same canvas, draw at once
  const handleMultiClaudeParallel = async (panelIndex: number) => {
    const canvas = canvasRefs.current[panelIndex];
    if (!canvas) return;

    // Render human strokes to canvas before snapshot
    renderStrokesToCanvas(canvas);

    // Take ONE snapshot that all Claudes will see
    const image = canvas.toDataURL('image/png');

    // Set loading state for all 3 Claudes
    setPanels(prev => {
      const newPanels = [...prev];
      newPanels[panelIndex] = { ...newPanels[panelIndex], isLoading: true, loadingCount: CLAUDE_COUNT };
      return newPanels;
    });

    // Launch all 3 Claudes in parallel
    const claudePromises = Array.from({ length: CLAUDE_COUNT }, async (_, claudeIdx) => {
      const claudeColor = CLAUDE_COLORS[claudeIdx];

      try {
        const response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode: 'shapes',
            temperature,
            maxTokens,
            prompt: `${prompt}\n\nNote: You are one of ${CLAUDE_COUNT} Claudes drawing simultaneously on this canvas. Each Claude draws independently.`,
            streaming: true,
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
                  const taggedBlock = { ...event.data, color: event.data.color || claudeColor };
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[panelIndex] = {
                      ...newPanels[panelIndex],
                      blocks: [...newPanels[panelIndex].blocks, taggedBlock],
                    };
                    return newPanels;
                  });
                } else if (event.type === 'shape') {
                  const taggedShape = { ...event.data, color: event.data.color || claudeColor };
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[panelIndex] = {
                      ...newPanels[panelIndex],
                      shapes: [...newPanels[panelIndex].shapes, taggedShape],
                    };
                    return newPanels;
                  });
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch (error) {
        console.error(`Claude ${claudeIdx + 1} error:`, error);
      } finally {
        // Decrement loading count when this Claude finishes
        setPanels(prev => {
          const newPanels = [...prev];
          const newCount = newPanels[panelIndex].loadingCount - 1;
          newPanels[panelIndex] = {
            ...newPanels[panelIndex],
            loadingCount: newCount,
            isLoading: newCount > 0,
          };
          return newPanels;
        });
      }
    });

    await Promise.all(claudePromises);
  };

  const handleYourTurn = async () => {
    // Run both panels in parallel
    await Promise.all([
      handleSingleClaudeTurn(0),
      handleMultiClaudeParallel(1),
    ]);
  };

  const handleClear = () => {
    canvasRefs.current.forEach((canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    setPanels([
      { shapes: [], blocks: [], isLoading: false, loadingCount: 0 },
      { shapes: [], blocks: [], isLoading: false, loadingCount: 0 },
    ]);
    setHumanStrokes([]);
    setCurrentStroke(null);
  };

  const getPanelLabel = (index: number, panel: PanelState) => {
    if (index === 0) {
      return panel.isLoading ? 'Single Claude...' : 'Single Claude';
    }
    if (panel.isLoading) {
      return `${CLAUDE_COUNT} Claudes (${panel.loadingCount} drawing)...`;
    }
    return `${CLAUDE_COUNT} Claudes Parallel`;
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
          </div>
        </div>
      )}

      {/* Two panels */}
      <div className="flex-1 flex">
        {panels.map((panel, index) => (
          <div key={index} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Mode label */}
            <div className="p-2 border-b border-gray-100 text-center text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center justify-center gap-2">
              {getPanelLabel(index, panel)}
              {panel.isLoading && <span className="animate-pulse">...</span>}
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
              {/* Canvas for Claude's drawings and capturing snapshot */}
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
              {/* Claude color legend for multi-claude panel */}
              {index === 1 && (
                <div className="absolute top-2 right-2 flex gap-2 items-center bg-white/80 rounded-full px-2 py-1">
                  {CLAUDE_COLORS.map((color, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${panel.isLoading ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: color }}
                      title={`Claude ${i + 1}`}
                    />
                  ))}
                </div>
              )}
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
        <p className="text-xs text-gray-400">Single Claude vs {CLAUDE_COUNT} Claudes in parallel (same canvas, simultaneous)</p>
      </div>
    </div>
  );
}
