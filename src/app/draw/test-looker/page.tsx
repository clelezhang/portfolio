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
  d?: string;
}

interface PanelState {
  asciiBlocks: AsciiBlock[];
  shapes: Shape[];
  isLoading: boolean;
  responseTime?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

type RoleType = 'forms' | 'details' | 'combined';

const ROLES: { id: RoleType; label: string; color: string; description: string }[] = [
  { id: 'forms', label: 'Forms', color: '#8b5cf6', description: 'Main shapes' },
  { id: 'details', label: 'Details', color: '#f472b6', description: 'Fine elements' },
  { id: 'combined', label: 'Combined', color: '#22c55e', description: 'Both merged' },
];

export default function RoleComparisonPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    ROLES.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false }))
  );
  const [filterSeed, setFilterSeed] = useState(1);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(3);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Canvas dimensions (set dynamically)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });

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

  // Set up canvas sizes dynamically based on container
  useEffect(() => {
    const updateSizes = () => {
      canvasRefs.current.forEach((canvas, i) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (i === 0) {
          setCanvasSize({ width: rect.width, height: rect.height });
        }
        redrawPanel(i);
      });
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, [redrawPanel]);

  // Redraw when panels change
  useEffect(() => {
    panels.forEach((_, index) => redrawPanel(index));
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
    const firstCanvas = canvasRefs.current[0];
    if (!firstCanvas) return;
    const point = getPoint(e, firstCanvas);
    setIsDrawing(true);
    lastPoint.current = point;
    setCurrentStroke({
      d: `M ${point.x} ${point.y}`,
      color: strokeColor,
      strokeWidth: strokeSize,
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

  const captureCanvas = (): string => {
    const canvas = canvasRefs.current[0];
    if (!canvas) return '';

    // Create temp canvas to render strokes
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    [...humanStrokes, currentStroke].filter(Boolean).forEach((stroke) => {
      if (!stroke) return;
      const path = new Path2D(stroke.d);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });

    return tempCanvas.toDataURL('image/jpeg', 0.7);
  };

  const handleCompare = async () => {
    // Reset state
    setPanels(ROLES.map(() => ({ asciiBlocks: [], shapes: [], isLoading: true })));

    // Render strokes to all canvases
    canvasRefs.current.forEach((canvas) => {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        renderStrokesToCanvas(canvas);
      }
    });

    const image = captureCanvas();
    if (!image) return;

    const canvas = canvasRefs.current[0];
    if (!canvas) return;

    // Collect results for merging
    let formsShapes: Shape[] = [];
    let formsBlocks: AsciiBlock[] = [];
    let detailsShapes: Shape[] = [];
    let detailsBlocks: AsciiBlock[] = [];

    // Helper to process streaming response
    const processStream = async (
      role: 'forms' | 'details',
      panelIndex: number
    ) => {
      const startTime = Date.now();

      try {
        const response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawMode: 'all',
            sayEnabled: false,
            temperature: 1.0,
            maxTokens: 1024,
            streaming: true,
            model: 'sonnet', // Use Sonnet for both
            drawingRole: role,
          }),
        });

        if (!response.ok) throw new Error('Failed');

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
                if (event.type === 'block') {
                  const block = event.data as AsciiBlock;
                  if (role === 'forms') formsBlocks.push(block);
                  else detailsBlocks.push(block);

                  setPanels((prev) => {
                    const newPanels = [...prev];
                    newPanels[panelIndex] = {
                      ...newPanels[panelIndex],
                      asciiBlocks: [...newPanels[panelIndex].asciiBlocks, block],
                    };
                    // Update combined panel too
                    newPanels[2] = {
                      ...newPanels[2],
                      asciiBlocks: [...formsBlocks, ...detailsBlocks],
                    };
                    return newPanels;
                  });
                } else if (event.type === 'shape') {
                  const shape = event.data as Shape;
                  if (role === 'forms') formsShapes.push(shape);
                  else detailsShapes.push(shape);

                  setPanels((prev) => {
                    const newPanels = [...prev];
                    newPanels[panelIndex] = {
                      ...newPanels[panelIndex],
                      shapes: [...newPanels[panelIndex].shapes, shape],
                    };
                    // Update combined panel - forms first, then details on top
                    newPanels[2] = {
                      ...newPanels[2],
                      shapes: [...formsShapes, ...detailsShapes],
                    };
                    return newPanels;
                  });
                } else if (event.type === 'usage') {
                  setPanels((prev) => {
                    const newPanels = [...prev];
                    newPanels[panelIndex] = {
                      ...newPanels[panelIndex],
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
          newPanels[panelIndex] = { ...newPanels[panelIndex], responseTime };
          return newPanels;
        });
      } catch (error) {
        console.error(`Error for ${role}:`, error);
      } finally {
        setPanels((prev) => {
          const newPanels = [...prev];
          newPanels[panelIndex] = { ...newPanels[panelIndex], isLoading: false };
          return newPanels;
        });
      }
    };

    // Run both in parallel
    await Promise.all([
      processStream('forms', 0),
      processStream('details', 1),
    ]);

    // Mark combined as done
    setPanels((prev) => {
      const newPanels = [...prev];
      newPanels[2] = {
        ...newPanels[2],
        isLoading: false,
        inputTokens: (newPanels[0].inputTokens || 0) + (newPanels[1].inputTokens || 0),
        outputTokens: (newPanels[0].outputTokens || 0) + (newPanels[1].outputTokens || 0),
      };
      return newPanels;
    });
  };

  const handleClear = () => {
    setHumanStrokes([]);
    setCurrentStroke(null);
    setPanels(ROLES.map(() => ({ asciiBlocks: [], shapes: [], isLoading: false })));
    canvasRefs.current.forEach((canvas) => {
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
  };

  return (
    <div className="h-dvh w-screen flex flex-col bg-gray-100">
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
      <div className="p-3 border-b border-gray-300 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-gray-700">Forms + Details: Parallel specialized Claudes</h1>
          <p className="text-xs text-gray-400">
            <span style={{ color: ROLES[0].color }}>Forms</span> draws main shapes |
            <span style={{ color: ROLES[1].color }}> Details</span> adds fine elements |
            <span style={{ color: ROLES[2].color }}> Combined</span> merges both
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCompare}
            disabled={panels.some(p => p.isLoading)}
            className="px-4 py-1.5 bg-black text-white rounded-full text-xs hover:bg-gray-800 disabled:opacity-50"
          >
            {panels.some(p => p.isLoading) ? '✏️ Drawing...' : '▶️ Draw'}
          </button>
          <button onClick={handleClear} className="px-3 py-1.5 border border-gray-300 rounded-full text-xs hover:bg-gray-100">
            Clear
          </button>
        </div>
      </div>

      {/* Main content - 3 canvases side by side */}
      <div className="flex-1 flex">
        {ROLES.map((role, index) => (
          <div key={role.id} className="flex-1 flex flex-col border-r border-gray-300 last:border-r-0">
            {/* Role header */}
            <div className="p-2 bg-white border-b border-gray-200 flex items-center justify-between" style={{ borderTopWidth: 3, borderTopColor: role.color }}>
              <div>
                <span className="text-xs font-medium" style={{ color: role.color }}>{role.label}</span>
                <span className="text-xs text-gray-400 ml-2">{role.description}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {panels[index].isLoading && <span className="animate-pulse">drawing...</span>}
                {panels[index].responseTime && <span>{(panels[index].responseTime / 1000).toFixed(1)}s</span>}
                {panels[index].inputTokens !== undefined && (
                  <span>{panels[index].inputTokens}→{panels[index].outputTokens}</span>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div
              className="flex-1 relative bg-white cursor-crosshair"
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
              {/* Human strokes overlay (SVG for wobble) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} style={{ filter: 'url(#wobbleFilter)' }}>
                {humanStrokes.map((stroke, i) => (
                  <path key={i} d={stroke.d} stroke={stroke.color} strokeWidth={stroke.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {index === 0 && currentStroke && (
                  <path d={currentStroke.d} stroke={currentStroke.color} strokeWidth={currentStroke.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {/* Drawing indicator */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 text-xs text-gray-400">Draw here</div>
              )}
            </div>

            {/* Stats */}
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              {panels[index].shapes.length} shapes, {panels[index].asciiBlocks.length} blocks
            </div>
          </div>
        ))}
      </div>

      {/* Drawing tools */}
      <div className="p-2 bg-white border-t border-gray-300 flex items-center gap-3">
        <div className="flex items-center gap-1">
          {['#000000', '#EF4444', '#3B82F6', '#22C55E', '#8B5CF6'].map((color) => (
            <button
              key={color}
              onClick={() => setStrokeColor(color)}
              className={`w-5 h-5 rounded-full ${strokeColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {[2, 5, 10].map((size) => (
            <button
              key={size}
              onClick={() => setStrokeSize(size)}
              className={`rounded-full bg-current ${strokeSize === size ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
              style={{ width: size + 4, height: size + 4, color: strokeColor }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
