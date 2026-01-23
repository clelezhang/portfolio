'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface PanelState {
  asciiBlocks: AsciiBlock[];
  isLoading: boolean;
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

export default function AsciiTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>([
    { asciiBlocks: [], isLoading: false },
    { asciiBlocks: [], isLoading: false },
    { asciiBlocks: [], isLoading: false },
  ]);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [prompt, setPrompt] = useState(
    `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`
  );
  const [showSettings, setShowSettings] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(2);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
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

    // Start a new SVG stroke
    setCurrentStroke({
      d: `M ${point.x} ${point.y}`,
      color: tool === 'erase' ? '#ffffff' : strokeColor,
      strokeWidth: tool === 'erase' ? strokeSize * 5 : strokeSize,
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    // Get point from first canvas only
    const firstCanvas = canvasRefs.current[0];
    if (!firstCanvas) return;
    const point = getPoint(e, firstCanvas);

    // Extend the current SVG stroke
    setCurrentStroke(prev => prev ? {
      ...prev,
      d: `${prev.d} L ${point.x} ${point.y}`,
    } : null);

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    // Save the completed stroke
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

  const handleYourTurn = async () => {
    // Set all panels to loading
    setPanels((prev) => prev.map((p) => ({ ...p, isLoading: true })));

    // Render human strokes to all canvases before taking snapshot
    canvasRefs.current.forEach((canvas) => {
      if (canvas) renderStrokesToCanvas(canvas);
    });

    // Send requests in parallel for each panel with same temperature
    const requests = panels.map(async (_, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      try {
        const image = canvas.toDataURL('image/png');
        const response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode: 'ascii',
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
                  setPanels((prev) => {
                    const newPanels = [...prev];
                    newPanels[index] = {
                      ...newPanels[index],
                      asciiBlocks: [...newPanels[index].asciiBlocks, event.data],
                    };
                    return newPanels;
                  });
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch (error) {
        console.error(`Error for panel ${index}:`, error);
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
    setPanels((prev) => prev.map((p) => ({ ...p, asciiBlocks: [] })));
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

      {/* Three panels */}
      <div className="flex-1 flex">
        {panels.map((panel, index) => (
          <div key={index} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Panel header */}
            <div className="p-2 border-b border-gray-100 text-center text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center justify-center gap-2">
              {index + 1}
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
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar - matches main draw page */}
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
          {/* Temperature */}
          <div className="flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-full">
            <span className="text-xs text-gray-500">temp</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-16 h-1 accent-black"
            />
            <span className="text-xs font-mono w-6 text-gray-600">{temperature.toFixed(1)}</span>
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
        <p className="text-xs text-gray-400">ASCII mode • 3 parallel responses at same temperature</p>
      </div>
    </div>
  );
}
