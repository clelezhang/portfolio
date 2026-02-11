'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

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

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
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
  responseTime?: number;
  firstShapeTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  observation?: string;
  intention?: string;
  narrationChunks?: number;
}

type ApproachType = 'tool-calls' | 'legacy-json';

const APPROACHES: { id: ApproachType; label: string; color: string; description: string }[] = [
  { id: 'tool-calls', label: 'TOOL CALLS', color: '#3b82f6', description: 'Claude calls draw() tool with structured input' },
  { id: 'legacy-json', label: 'LEGACY JSON', color: '#f59e0b', description: 'Claude outputs JSON in text response' },
];

export default function ToolCallsTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    APPROACHES.map(() => ({ shapes: [], blocks: [], isLoading: false }))
  );
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(3);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [showSettings, setShowSettings] = useState(false);
  const [filterSeed, setFilterSeed] = useState(1);

  // Turn tracking
  const [turnCount, setTurnCount] = useState(0);

  // Aggregate stats
  const [aggregateStats, setAggregateStats] = useState<{
    toolCalls: { count: number; avgFirstShape: number; avgCompletion: number; avgInputTokens: number; avgOutputTokens: number };
    legacy: { count: number; avgFirstShape: number; avgCompletion: number; avgInputTokens: number; avgOutputTokens: number };
  }>({
    toolCalls: { count: 0, avgFirstShape: 0, avgCompletion: 0, avgInputTokens: 0, avgOutputTokens: 0 },
    legacy: { count: 0, avgFirstShape: 0, avgCompletion: 0, avgInputTokens: 0, avgOutputTokens: 0 },
  });

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

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw human strokes first (so Claude draws on top)
    humanStrokes.forEach((stroke) => {
      const path = new Path2D(stroke.d);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });

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

    // Draw ASCII blocks
    panel.blocks.forEach((block) => {
      ctx.font = '14px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 16);
      });
    });
  }, [panels, humanStrokes]);

  // Set up canvases - only on mount and resize (not on every panel change)
  useEffect(() => {
    const updateSizes = () => {
      canvasRefs.current.forEach((canvas) => {
        if (canvas) {
          const container = canvas.parentElement;
          if (container) {
            const rect = container.getBoundingClientRect();
            // Only update if size actually changed (avoid clearing canvas)
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
              canvas.width = rect.width;
              canvas.height = rect.height;
            }
          }
        }
      });
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Redraw panels when shapes/blocks change
  useEffect(() => {
    panels.forEach((_, index) => redrawPanel(index));
  }, [panels, redrawPanel]);

  // Drawing handlers
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRefs.current[0];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };

    setIsDrawing(true);
    lastPoint.current = point;
    setCurrentStroke({
      d: `M ${point.x} ${point.y}`,
      color: tool === 'erase' ? '#ffffff' : strokeColor,
      strokeWidth: tool === 'erase' ? strokeSize * 3 : strokeSize,
    });
  }, [strokeColor, strokeSize, tool]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke) return;

    const canvas = canvasRefs.current[0];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };

    const last = lastPoint.current;
    if (last) {
      const midX = (last.x + point.x) / 2;
      const midY = (last.y + point.y) / 2;
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: prev.d + ` Q ${last.x} ${last.y} ${midX} ${midY}`,
      } : null);
    }

    lastPoint.current = point;
  }, [isDrawing, currentStroke]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && currentStroke) {
      setHumanStrokes(prev => [...prev, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
    lastPoint.current = null;
  }, [isDrawing, currentStroke]);

  // Prepare canvas for API call
  const prepareCanvasForCapture = useCallback((canvas: HTMLCanvasElement, index: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    redrawPanel(index);

    // Draw human strokes
    humanStrokes.forEach((stroke) => {
      const path = new Path2D(stroke.d);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });
  }, [humanStrokes, redrawPanel]);

  // Handle Claude's turn
  const handleYourTurn = async () => {
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    setPanels(prev => prev.map(p => ({ ...p, isLoading: true, responseTime: undefined, firstShapeTime: undefined, narrationChunks: 0 })));

    // Prepare canvases
    canvasRefs.current.forEach((canvas, i) => {
      if (canvas) prepareCanvasForCapture(canvas, i);
    });

    // Run approaches SEQUENTIALLY to avoid prompt caching interference
    // Legacy first (index 1), then tool calls (index 0)
    const runOrder = [1, 0]; // legacy first to ensure fair comparison

    for (const index of runOrder) {
      const approach = APPROACHES[index];
      const canvas = canvasRefs.current[index];
      if (!canvas) continue;

      const startTime = Date.now();
      let firstShapeTime: number | undefined;
      let narrationChunks = 0;

      try {
        const image = canvas.toDataURL('image/jpeg', 0.7);
        const useToolCalls = approach.id === 'tool-calls';

        const response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            streaming: true,
            useToolCalls,
            drawMode: 'all',
            sayEnabled: false,
            turnCount: newTurnCount,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

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

                if (event.type === 'shape') {
                  if (firstShapeTime === undefined) {
                    firstShapeTime = Date.now() - startTime;
                  }
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[index] = { ...newPanels[index], shapes: [...newPanels[index].shapes, event.data] };
                    return newPanels;
                  });
                } else if (event.type === 'block') {
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[index] = { ...newPanels[index], blocks: [...newPanels[index].blocks, event.data] };
                    return newPanels;
                  });
                } else if (event.type === 'narration') {
                  narrationChunks++;
                } else if (event.type === 'observation') {
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[index] = { ...newPanels[index], observation: event.data };
                    return newPanels;
                  });
                } else if (event.type === 'intention') {
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[index] = { ...newPanels[index], intention: event.data };
                    return newPanels;
                  });
                } else if (event.type === 'usage') {
                  const responseTime = Date.now() - startTime;
                  setPanels(prev => {
                    const newPanels = [...prev];
                    newPanels[index] = {
                      ...newPanels[index],
                      inputTokens: event.input_tokens,
                      outputTokens: event.output_tokens,
                      responseTime,
                      firstShapeTime,
                      narrationChunks,
                    };
                    return newPanels;
                  });

                  // Update aggregate stats
                  setAggregateStats(prev => {
                    const key = approach.id === 'tool-calls' ? 'toolCalls' : 'legacy';
                    const stats = prev[key];
                    const newCount = stats.count + 1;
                    return {
                      ...prev,
                      [key]: {
                        count: newCount,
                        avgFirstShape: (stats.avgFirstShape * stats.count + (firstShapeTime || 0)) / newCount,
                        avgCompletion: (stats.avgCompletion * stats.count + responseTime) / newCount,
                        avgInputTokens: (stats.avgInputTokens * stats.count + event.input_tokens) / newCount,
                        avgOutputTokens: (stats.avgOutputTokens * stats.count + event.output_tokens) / newCount,
                      },
                    };
                  });
                }
              } catch { /* skip invalid */ }
            }
          }
        }
      } catch (error) {
        console.error(`Error for ${approach.label}:`, error);
      } finally {
        setPanels(prev => {
          const newPanels = [...prev];
          newPanels[index] = { ...newPanels[index], isLoading: false };
          return newPanels;
        });
      }
    }
  };

  // Clear all
  const clearAll = useCallback(() => {
    setHumanStrokes([]);
    setCurrentStroke(null);
    setPanels(APPROACHES.map(() => ({ shapes: [], blocks: [], isLoading: false })));
    setTurnCount(0);
    canvasRefs.current.forEach((canvas) => {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    });
  }, []);

  // Calculate comparison stats
  const tokenDiff = aggregateStats.toolCalls.count > 0 && aggregateStats.legacy.count > 0
    ? ((aggregateStats.toolCalls.avgInputTokens - aggregateStats.legacy.avgInputTokens) / aggregateStats.legacy.avgInputTokens * 100).toFixed(1)
    : null;
  const timeDiff = aggregateStats.toolCalls.count > 0 && aggregateStats.legacy.count > 0
    ? ((aggregateStats.toolCalls.avgCompletion - aggregateStats.legacy.avgCompletion) / aggregateStats.legacy.avgCompletion * 100).toFixed(1)
    : null;

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

      {/* Header with stats */}
      <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium">TOOL CALLS vs LEGACY JSON</span>
          <span className="text-gray-400">Turn {turnCount}</span>
        </div>
        <div className="flex items-center gap-4">
          {tokenDiff !== null && (
            <span className={`font-medium ${parseFloat(tokenDiff) < 0 ? 'text-green-600' : 'text-red-600'}`}>
              Input tokens: {tokenDiff}%
            </span>
          )}
          {timeDiff !== null && (
            <span className={`font-medium ${parseFloat(timeDiff) < 0 ? 'text-green-600' : 'text-red-600'}`}>
              Time: {timeDiff}%
            </span>
          )}
          {aggregateStats.toolCalls.count > 0 && (
            <span className="text-gray-400">
              Tool calls: {aggregateStats.toolCalls.count} runs
            </span>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Aggregate Stats</div>

          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Metric</th>
                <th className="text-right py-1">Tool Calls</th>
                <th className="text-right py-1">Legacy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">First Shape</td>
                <td className="text-right">{aggregateStats.toolCalls.avgFirstShape.toFixed(0) || '-'}ms</td>
                <td className="text-right">{aggregateStats.legacy.avgFirstShape.toFixed(0) || '-'}ms</td>
              </tr>
              <tr>
                <td className="py-1">Completion</td>
                <td className="text-right">{aggregateStats.toolCalls.avgCompletion.toFixed(0) || '-'}ms</td>
                <td className="text-right">{aggregateStats.legacy.avgCompletion.toFixed(0) || '-'}ms</td>
              </tr>
              <tr>
                <td className="py-1">Input Tokens</td>
                <td className="text-right">{aggregateStats.toolCalls.avgInputTokens.toFixed(0) || '-'}</td>
                <td className="text-right">{aggregateStats.legacy.avgInputTokens.toFixed(0) || '-'}</td>
              </tr>
              <tr>
                <td className="py-1">Output Tokens</td>
                <td className="text-right">{aggregateStats.toolCalls.avgOutputTokens.toFixed(0) || '-'}</td>
                <td className="text-right">{aggregateStats.legacy.avgOutputTokens.toFixed(0) || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Two panels - TOOL CALLS vs LEGACY */}
      <div className="flex-1 flex">
        {APPROACHES.map((approach, index) => (
          <div key={approach.id} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Approach label */}
            <div
              className="p-2 border-b border-gray-100 text-center text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-1"
              style={{ color: approach.color }}
            >
              <div className="flex items-center gap-2">
                {approach.label}
                {panels[index].isLoading && <span className="animate-pulse">...</span>}
                {panels[index].responseTime && (
                  <span className="text-gray-400 font-normal">{(panels[index].responseTime! / 1000).toFixed(1)}s</span>
                )}
              </div>
              <div className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">
                {approach.description}
              </div>
              {(panels[index].inputTokens || panels[index].outputTokens) && (
                <div className="text-gray-500 font-normal normal-case tracking-normal">
                  {panels[index].inputTokens} in / {panels[index].outputTokens} out
                  {panels[index].firstShapeTime && (
                    <span className="ml-2 text-gray-400">
                      (first: {panels[index].firstShapeTime}ms)
                    </span>
                  )}
                </div>
              )}
              {approach.id === 'tool-calls' && panels[index].narrationChunks !== undefined && panels[index].narrationChunks! > 0 && (
                <div className="text-gray-400 font-normal text-[10px]">
                  {panels[index].narrationChunks} narration chunks
                </div>
              )}
            </div>

            {/* Observation/Intention */}
            {(panels[index].observation || panels[index].intention) && (
              <div className="px-2 py-1 border-b border-gray-50 text-[10px] text-gray-500 bg-gray-50">
                {panels[index].observation && <div>Sees: {panels[index].observation}</div>}
                {panels[index].intention && <div>Intends: {panels[index].intention}</div>}
              </div>
            )}

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
              {/* Canvas for Claude's drawings */}
              <canvas
                ref={(el) => { canvasRefs.current[index] = el; }}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ filter: 'url(#wobbleFilter)' }}
              />
              {/* SVG layer for human strokes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'url(#wobbleFilter)' }}>
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
          {/* Actions */}
          <button
            onClick={handleYourTurn}
            disabled={panels.some((p) => p.isLoading)}
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {panels.some((p) => p.isLoading) ? '...' : "Claude's Turn"}
          </button>
          <button
            onClick={clearAll}
            disabled={panels.some((p) => p.isLoading)}
            className="px-3 py-2 text-gray-500 text-sm hover:text-black disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-2 text-sm rounded-full ${showSettings ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            stats
          </button>
        </div>
      </div>
    </div>
  );
}
