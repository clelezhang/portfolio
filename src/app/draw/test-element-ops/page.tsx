'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { simplifyPath } from '../utils/simplifyPath';

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

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

// Tracked element with stable ID
interface TrackedElement {
  id: string;
  source: 'human' | 'claude';
  type: 'stroke' | 'shape' | 'block';
  d?: string;
  shapeType?: string;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  points?: number[][];
  block?: string;
  turnCreated: number;
  turnModified?: number;
}

interface ElementDiff {
  created: TrackedElement[];
  modified: { id: string; changes: Partial<TrackedElement> }[];
  deleted: string[];
}

interface PanelState {
  // Current hybrid (add-only)
  shapes: Shape[];
  blocks: AsciiBlock[];
  // Element-based
  elements: TrackedElement[];
  // Shared
  isLoading: boolean;
  responseTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  observation?: string;
  intention?: string;
}

type FormatMode = 'full' | 'compact-summary' | 'compact-bounds' | 'diff-only';
type ApproachType = 'main' | 'diff-only';

const APPROACHES: { id: ApproachType; label: string; color: string; description: string; format?: FormatMode }[] = [
  { id: 'main', label: 'MAIN', color: '#3b82f6', description: 'Current production (image + SVG)' },
  { id: 'diff-only', label: 'DIFF', color: '#22c55e', description: 'Element IDs + diff only', format: 'diff-only' },
];

export default function ElementOpsTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panels, setPanels] = useState<PanelState[]>(
    APPROACHES.map(() => ({ shapes: [], blocks: [], elements: [], isLoading: false }))
  );
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(3);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [showSettings, setShowSettings] = useState(false);
  const [simplifyEpsilon, setSimplifyEpsilon] = useState(2);
  const [syncInterval, setSyncInterval] = useState(5);

  // Turn tracking
  const [turnCount, setTurnCount] = useState(0);
  const [lastSyncTurn, setLastSyncTurn] = useState(0);
  const [lastSyncContext, setLastSyncContext] = useState<{ observation: string; turn: number } | null>(null);

  // Element ID counters
  const humanIdCounter = useRef(0);
  const claudeIdCounter = useRef(0);

  // Track elements for the element-ops panel (with IDs)
  const [trackedHumanElements, setTrackedHumanElements] = useState<TrackedElement[]>([]);
  const [lastTurnElements, setLastTurnElements] = useState<TrackedElement[]>([]);

  // Wobble effect
  const [filterSeed, setFilterSeed] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => setFilterSeed(p => (p % 100) + 1), 270);
    return () => clearInterval(interval);
  }, []);

  // Redraw panel
  const redrawPanel = useCallback((index: number) => {
    const canvas = canvasRefs.current[index];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const panel = panels[index];

    if (APPROACHES[index].id === 'main') {
      // Draw shapes (add-only mode)
      panel.shapes.forEach(shape => drawShape(ctx, shape));
      panel.blocks.forEach(block => drawBlock(ctx, block));
    } else {
      // Draw tracked elements
      panel.elements.forEach(el => {
        if (el.type === 'stroke' && el.d) {
          const path = new Path2D(el.d);
          ctx.strokeStyle = el.color || '#000';
          ctx.lineWidth = el.strokeWidth || 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(path);
        } else if (el.type === 'shape') {
          drawTrackedShape(ctx, el);
        } else if (el.type === 'block' && el.block) {
          ctx.font = '14px monospace';
          ctx.fillStyle = el.color || '#3b82f6';
          el.block.split('\n').forEach((line, i) => {
            ctx.fillText(line, el.x || 0, (el.y || 0) + i * 16);
          });
        }
      });
    }
  }, [panels]);

  function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
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
    } else if (shape.type === 'circle' && shape.cx !== undefined) {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy!, shape.r!, 0, Math.PI * 2);
      if (shape.fill) { ctx.fillStyle = shape.fill; ctx.fill(); }
      ctx.stroke();
    } else if (shape.type === 'ellipse' && shape.cx !== undefined) {
      ctx.beginPath();
      ctx.ellipse(shape.cx, shape.cy!, shape.rx || 10, shape.ry || 10, 0, 0, Math.PI * 2);
      if (shape.fill) { ctx.fillStyle = shape.fill; ctx.fill(); }
      ctx.stroke();
    } else if (shape.type === 'rect' && shape.x !== undefined) {
      if (shape.fill) { ctx.fillStyle = shape.fill; ctx.fillRect(shape.x, shape.y!, shape.width!, shape.height!); }
      ctx.strokeRect(shape.x, shape.y!, shape.width!, shape.height!);
    } else if (shape.type === 'line' && shape.x1 !== undefined) {
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1!);
      ctx.lineTo(shape.x2!, shape.y2!);
      ctx.stroke();
    } else if (shape.type === 'polygon' && shape.points?.length) {
      ctx.beginPath();
      ctx.moveTo(shape.points[0][0], shape.points[0][1]);
      shape.points.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      if (shape.fill) { ctx.fillStyle = shape.fill; ctx.fill(); }
      ctx.stroke();
    }
  }

  function drawTrackedShape(ctx: CanvasRenderingContext2D, el: TrackedElement) {
    ctx.strokeStyle = el.color || '#3b82f6';
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.shapeType === 'path' && el.d) {
      const path = new Path2D(el.d);
      if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(path); }
      if (el.color || !el.fill) ctx.stroke(path);
    } else if (el.shapeType === 'circle' && el.cx !== undefined) {
      ctx.beginPath();
      ctx.arc(el.cx, el.cy!, el.r!, 0, Math.PI * 2);
      if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(); }
      ctx.stroke();
    } else if (el.shapeType === 'ellipse' && el.cx !== undefined) {
      ctx.beginPath();
      ctx.ellipse(el.cx, el.cy!, el.rx || 10, el.ry || 10, 0, 0, Math.PI * 2);
      if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(); }
      ctx.stroke();
    } else if (el.shapeType === 'rect' && el.x !== undefined) {
      if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(el.x, el.y!, el.width!, el.height!); }
      ctx.strokeRect(el.x, el.y!, el.width!, el.height!);
    } else if (el.shapeType === 'line' && el.x1 !== undefined) {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1!);
      ctx.lineTo(el.x2!, el.y2!);
      ctx.stroke();
    } else if (el.shapeType === 'polygon' && el.points?.length) {
      ctx.beginPath();
      ctx.moveTo(el.points[0][0], el.points[0][1]);
      el.points.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(); }
      ctx.stroke();
    }
  }

  function drawBlock(ctx: CanvasRenderingContext2D, block: AsciiBlock) {
    ctx.font = '14px monospace';
    ctx.fillStyle = block.color || '#3b82f6';
    block.block.split('\n').forEach((line, i) => {
      ctx.fillText(line, block.x, block.y + i * 16);
    });
  }

  // Setup canvases
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
    const canvas = canvasRefs.current[0];
    if (!canvas) return;
    const point = getPoint(e, canvas);
    setCurrentStroke(prev => prev ? { ...prev, d: `${prev.d} L ${point.x} ${point.y}` } : null);
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes(prev => [...prev, currentStroke]);

      // Also add as tracked element for element-ops panel
      const newId = `h-${++humanIdCounter.current}`;
      const newElement: TrackedElement = {
        id: newId,
        source: 'human',
        type: 'stroke',
        d: currentStroke.d,
        color: currentStroke.color,
        strokeWidth: currentStroke.strokeWidth,
        turnCreated: turnCount,
      };
      setTrackedHumanElements(prev => [...prev, newElement]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPoint.current = null;
  };

  // Compute diff between current and last turn elements
  const computeDiff = useCallback((): ElementDiff => {
    const lastIds = new Set(lastTurnElements.map(e => e.id));
    const created = trackedHumanElements.filter(e => !lastIds.has(e.id));
    const currentHumanIds = new Set(trackedHumanElements.map(e => e.id));
    const deleted = lastTurnElements.filter(e => e.source === 'human' && !currentHumanIds.has(e.id)).map(e => e.id);

    return { created, modified: [], deleted };
  }, [trackedHumanElements, lastTurnElements]);

  // Prepare canvas for image capture
  const prepareCanvasForCapture = (canvas: HTMLCanvasElement, panelIndex: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const panel = panels[panelIndex];
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw existing content
    if (APPROACHES[panelIndex].id === 'main') {
      // Current hybrid uses shapes/blocks arrays
      panel.shapes.forEach(shape => drawShape(ctx, shape));
      panel.blocks.forEach(block => drawBlock(ctx, block));
    } else {
      // IDs-addonly and element-ops both use elements array
      panel.elements.forEach(el => {
        if (el.source === 'claude') {
          if (el.type === 'shape') drawTrackedShape(ctx, el);
          else if (el.type === 'block' && el.block) drawBlock(ctx, { block: el.block, x: el.x || 0, y: el.y || 0, color: el.color });
        }
      });
    }

    // Draw human strokes
    humanStrokes.forEach(stroke => {
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
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    const shouldSync = newTurnCount === 1 || (newTurnCount - lastSyncTurn) >= syncInterval;
    if (shouldSync) setLastSyncTurn(newTurnCount);

    // Save current state for diff computation (use panel 1 as reference)
    setLastTurnElements([...trackedHumanElements, ...(panels[1]?.elements || [])]);

    setPanels(prev => prev.map(p => ({ ...p, isLoading: true, responseTime: undefined })));

    // Prepare canvases
    canvasRefs.current.forEach((canvas, i) => {
      if (canvas) prepareCanvasForCapture(canvas, i);
    });

    const simplifiedStrokes = humanStrokes.map(stroke => ({
      ...stroke,
      d: simplifyPath(stroke.d, simplifyEpsilon),
    }));

    // Run both approaches in parallel
    const requests = APPROACHES.map(async (approach, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const startTime = Date.now();

      try {
        if (approach.id === 'main') {
          // Current hybrid: /api/draw-svg
          const image = shouldSync ? canvas.toDataURL('image/jpeg', 0.7) : undefined;

          const response = await fetch('/api/draw-svg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              humanStrokes: simplifiedStrokes,
              claudeShapes: panels[index].shapes,
              claudeBlocks: panels[index].blocks,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              drawMode: 'shapes',
              temperature: 0.8,
              maxTokens: 768,
              streaming: true,
              model: 'sonnet',
              image,
              lastSyncContext: shouldSync ? undefined : lastSyncContext,
            }),
          });

          await processCurrentHybridStream(response, index, startTime, shouldSync, newTurnCount);
        } else {
          // Element-based formats: /api/draw-elements with different format modes
          const image = shouldSync ? canvas.toDataURL('image/jpeg', 0.7) : undefined;
          const diff = computeDiff();
          const allElements = [...trackedHumanElements, ...panels[index].elements.filter(e => e.source === 'claude')];

          const response = await fetch('/api/draw-elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              elements: allElements,
              diff: diff.created.length > 0 || diff.deleted.length > 0 ? diff : undefined,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              turnCount: newTurnCount,
              temperature: 0.8,
              maxTokens: 768,
              streaming: true,
              model: 'sonnet',
              image,
              lastSyncContext: shouldSync ? undefined : lastSyncContext,
              allowOperations: false, // All formats use add-only mode
              format: approach.format, // 'diff-only', 'compact-summary', or 'compact-bounds'
            }),
          });

          await processAddOnlyStream(response, index, startTime, shouldSync, newTurnCount);
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
    });

    await Promise.all(requests);
  };

  const processCurrentHybridStream = async (
    response: Response,
    index: number,
    startTime: number,
    isSyncTurn: boolean,
    turnNumber: number
  ) => {
    if (!response.ok) throw new Error('Failed');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';
    let capturedObservation: string | undefined;

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
            } else if (event.type === 'observation') {
              capturedObservation = event.data;
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
            } else if (event.type === 'done' && event.usage) {
              setPanels(prev => {
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
    setPanels(prev => {
      const newPanels = [...prev];
      newPanels[index] = { ...newPanels[index], responseTime };
      return newPanels;
    });

    if (isSyncTurn && capturedObservation) {
      setLastSyncContext({ observation: capturedObservation, turn: turnNumber });
    }
  };

  // Add-only mode with IDs - receives shapes/blocks like current hybrid
  // but stores them as tracked elements with IDs
  const processAddOnlyStream = async (
    response: Response,
    index: number,
    startTime: number,
    isSyncTurn: boolean,
    turnNumber: number
  ) => {
    if (!response.ok) throw new Error('Failed');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';
    let capturedObservation: string | undefined;

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
              // Convert shape to tracked element with ID
              const newId = `c-${++claudeIdCounter.current}`;
              const shape = event.data;
              const newElement: TrackedElement = {
                id: newId,
                source: 'claude',
                type: 'shape',
                shapeType: shape.type,
                d: shape.d,
                color: shape.color,
                fill: shape.fill,
                strokeWidth: shape.strokeWidth,
                cx: shape.cx,
                cy: shape.cy,
                r: shape.r,
                rx: shape.rx,
                ry: shape.ry,
                x: shape.x,
                y: shape.y,
                x1: shape.x1,
                y1: shape.y1,
                x2: shape.x2,
                y2: shape.y2,
                width: shape.width,
                height: shape.height,
                points: shape.points,
                turnCreated: turnNumber,
              };
              setPanels(prev => {
                const newPanels = [...prev];
                newPanels[index] = { ...newPanels[index], elements: [...newPanels[index].elements, newElement] };
                return newPanels;
              });
            } else if (event.type === 'block') {
              const newId = `c-${++claudeIdCounter.current}`;
              const block = event.data;
              const newElement: TrackedElement = {
                id: newId,
                source: 'claude',
                type: 'block',
                block: block.block,
                x: block.x,
                y: block.y,
                color: block.color,
                turnCreated: turnNumber,
              };
              setPanels(prev => {
                const newPanels = [...prev];
                newPanels[index] = { ...newPanels[index], elements: [...newPanels[index].elements, newElement] };
                return newPanels;
              });
            } else if (event.type === 'observation') {
              capturedObservation = event.data;
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
            } else if (event.type === 'done' && event.usage) {
              setPanels(prev => {
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
    setPanels(prev => {
      const newPanels = [...prev];
      newPanels[index] = { ...newPanels[index], responseTime };
      return newPanels;
    });

    if (isSyncTurn && capturedObservation) {
      setLastSyncContext({ observation: capturedObservation, turn: turnNumber });
    }
  };

  const handleClear = () => {
    canvasRefs.current.forEach(canvas => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    setPanels(APPROACHES.map(() => ({ shapes: [], blocks: [], elements: [], isLoading: false })));
    setHumanStrokes([]);
    setCurrentStroke(null);
    setTrackedHumanElements([]);
    setLastTurnElements([]);
    setTurnCount(0);
    setLastSyncTurn(0);
    setLastSyncContext(null);
    humanIdCounter.current = 0;
    claudeIdCounter.current = 0;
  };

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
        <div className="flex items-center gap-3">
          <span className="font-medium">MAIN vs DIFF</span>
          <span className="text-gray-400">Turn {turnCount} | Sync every {syncInterval}</span>
          {turnCount > 0 && (
            <span className={`px-2 py-0.5 rounded text-[10px] ${(turnCount === 1 || (turnCount - lastSyncTurn) === 0) ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {(turnCount === 1 || turnCount === lastSyncTurn) ? 'SYNC TURN' : 'DIFF ONLY'}
            </span>
          )}
        </div>
        {panels[0].inputTokens && panels[1].inputTokens && (
          <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${panels[1].inputTokens < panels[0].inputTokens ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            DIFF: {panels[1].inputTokens < panels[0].inputTokens ? '' : '+'}{Math.round((1 - panels[1].inputTokens / panels[0].inputTokens) * -100)}% tokens
          </div>
        )}
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Settings</div>
          <div className="mb-4">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Sync interval</span>
              <span>every {syncInterval} turns</span>
            </label>
            <input
              type="range" min="2" max="10" step="1"
              value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
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
        </div>
      )}

      {/* Panels */}
      <div className="flex-1 flex">
        {APPROACHES.map((approach, index) => (
          <div key={approach.id} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Label */}
            <div
              className="p-2 border-b border-gray-100 text-center text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-1"
              style={{ color: approach.color }}
            >
              <div className="flex items-center gap-2">
                {approach.label}
                {panels[index].isLoading && <span className="animate-pulse">...</span>}
                {panels[index].responseTime && (
                  <span className="text-gray-400 font-normal">{(panels[index].responseTime / 1000).toFixed(1)}s</span>
                )}
              </div>
              <div className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">
                {approach.description}
              </div>
              {(panels[index].inputTokens || panels[index].outputTokens) && (
                <div className="text-gray-500 font-normal normal-case tracking-normal">
                  {panels[index].inputTokens} in / {panels[index].outputTokens} out
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

            {/* Canvas */}
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
                ref={el => { canvasRefs.current[index] = el; }}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ filter: 'url(#wobbleFilter)' }}
              />
              {/* Human strokes overlay */}
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

              {/* Element ID labels for element-based panels */}
              {index > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {panels[index].elements.filter(e => e.source === 'claude').slice(-3).map(el => (
                    <div
                      key={el.id}
                      className="absolute text-[8px] px-1 rounded"
                      style={{
                        left: (el.cx || el.x || 0) + 10,
                        top: (el.cy || el.y || 0) - 10,
                        backgroundColor: `${APPROACHES[index].color}20`,
                        color: APPROACHES[index].color,
                      }}
                    >
                      {el.id}
                    </div>
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
          {/* Colors */}
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full">
            {['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'].map(color => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-5 h-5 rounded-full transition-transform ${strokeColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {/* Size */}
          <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full">
            {[2, 6, 12].map(size => (
              <button
                key={size}
                onClick={() => setStrokeSize(size)}
                className={`rounded-full bg-current transition-transform ${strokeSize === size ? 'ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-125'}`}
                style={{ width: `${size + 4}px`, height: `${size + 4}px`, color: strokeColor }}
              />
            ))}
          </div>
          {/* Tool */}
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
            disabled={panels.some(p => p.isLoading)}
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {panels.some(p => p.isLoading) ? '...' : "Claude's Turn"}
          </button>
          <button onClick={handleClear} className="px-3 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50">
            Clear
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
          >
            Settings
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Draw on left panel. MAIN = current production, DIFF = element IDs with diff-only format.
        </p>
      </div>
    </div>
  );
}
