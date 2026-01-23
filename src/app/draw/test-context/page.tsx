'use client';

import { useRef, useState, useEffect } from 'react';

// Types
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

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface CanvasSnapshot {
  imageDataUrl: string;
  timestamp: number;
}

interface DrawingTurn {
  turnNumber: number;
  who: 'human' | 'claude';
  snapshot?: CanvasSnapshot;
  shapes?: Shape[];
  blocks?: AsciiBlock[];
  claudeResponse?: string; // Raw JSON response for multi-turn
}

interface TokenUsage {
  input: number;
  output: number;
}

// Panel 1: Structured Memory
interface Panel1State {
  shapes: Shape[];
  blocks: AsciiBlock[];
  turnHistory: string;
  tokenUsage: TokenUsage;
  isLoading: boolean;
}

// Panel 2: Full Multi-turn
interface Panel2State {
  turns: DrawingTurn[];
  shapes: Shape[];
  blocks: AsciiBlock[];
  tokenUsage: TokenUsage;
  isLoading: boolean;
}

// Panel 3: Sliding Window + Summary
interface Panel3State {
  summary: string;
  recentTurns: DrawingTurn[];
  shapes: Shape[];
  blocks: AsciiBlock[];
  tokenUsage: TokenUsage;
  isLoading: boolean;
  isSummarizing: boolean;
}

const APPROACH_LABELS = [
  'Structured Memory',
  'Full Multi-turn',
];

// Token cost rates (per 1K tokens)
const OPUS_INPUT_RATE = 0.015;
const OPUS_OUTPUT_RATE = 0.075;
const HAIKU_INPUT_RATE = 0.00025;
const HAIKU_OUTPUT_RATE = 0.00125;

function formatCost(usage: TokenUsage, includeHaiku = false): string {
  const opusCost = (usage.input * OPUS_INPUT_RATE / 1000) + (usage.output * OPUS_OUTPUT_RATE / 1000);
  return `$${opusCost.toFixed(4)}`;
}

export default function ContextTestPage() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(2);
  const [turnCount, setTurnCount] = useState(0);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Panel states
  const [panel1, setPanel1] = useState<Panel1State>({
    shapes: [],
    blocks: [],
    turnHistory: '',
    tokenUsage: { input: 0, output: 0 },
    isLoading: false,
  });

  const [panel2, setPanel2] = useState<Panel2State>({
    turns: [],
    shapes: [],
    blocks: [],
    tokenUsage: { input: 0, output: 0 },
    isLoading: false,
  });

  const [panel3, setPanel3] = useState<Panel3State>({
    summary: '',
    recentTurns: [],
    shapes: [],
    blocks: [],
    tokenUsage: { input: 0, output: 0 },
    isLoading: false,
    isSummarizing: false,
  });

  // Debug state
  const [showDebug, setShowDebug] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [drawMode, setDrawMode] = useState<'all' | 'shapes' | 'ascii'>('all');
  const [prompt, setPrompt] = useState(
    `You are claude, drawing collaboratively with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`
  );

  // Canvas setup
  useEffect(() => {
    const updateSizes = () => {
      canvasRefs.current.forEach((canvas) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Note: User strokes on canvas are lost on resize, but that's acceptable
        // Claude's shapes are in SVG overlays and resize automatically
      });
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Claude's shapes are now rendered in SVG overlays, not on the canvas
  // This means canvas snapshots only capture user strokes (the human's drawings)

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
    lastPoint.current = getPoint(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    const firstCanvas = canvasRefs.current[0];
    if (!firstCanvas) return;
    const point = getPoint(e, firstCanvas);

    // Draw on all canvases
    canvasRefs.current.forEach((canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  // Capture canvas snapshot
  const captureSnapshot = (canvasIndex: number): CanvasSnapshot => {
    const canvas = canvasRefs.current[canvasIndex];
    if (!canvas) throw new Error('Canvas not found');
    return {
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.8),
      timestamp: Date.now(),
    };
  };

  // Panel 1: Structured Memory approach
  const handlePanel1Turn = async (snapshot: CanvasSnapshot, turnNum: number) => {
    setPanel1(prev => ({ ...prev, isLoading: true }));

    const newHistory = panel1.turnHistory + `Turn ${turnNum}: Human drew.\n`;
    const streamedShapes: Shape[] = [];
    const streamedBlocks: AsciiBlock[] = [];

    console.log('[Panel 1] Starting turn', turnNum);
    console.log('[Panel 1] Previous shapes:', panel1.shapes.length, 'blocks:', panel1.blocks.length);

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: snapshot.imageDataUrl,
          canvasWidth: canvasRefs.current[0]?.width,
          canvasHeight: canvasRefs.current[0]?.height,
          previousShapes: panel1.shapes,
          previousDrawings: panel1.blocks.map(b => ({ block: b.block, x: b.x, y: b.y })),
          history: newHistory,
          streaming: true,
          drawMode,
          temperature,
          maxTokens,
          prompt,
        }),
      });

      console.log('[Panel 1] Response status:', response.status, response.ok);

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
              console.log('[Panel 1] Event:', event.type, event.data || event.usage);
              if (event.type === 'shape') {
                streamedShapes.push(event.data);
                setPanel1(prev => ({ ...prev, shapes: [...prev.shapes, event.data] }));
              } else if (event.type === 'block') {
                streamedBlocks.push(event.data);
                setPanel1(prev => ({ ...prev, blocks: [...prev.blocks, event.data] }));
              } else if (event.type === 'done' && event.usage) {
                setPanel1(prev => ({
                  ...prev,
                  tokenUsage: {
                    input: prev.tokenUsage.input + event.usage.input_tokens,
                    output: prev.tokenUsage.output + event.usage.output_tokens,
                  },
                }));
              }
            } catch { /* skip */ }
          }
        }
      }

      // Update history with what Claude drew
      const shapeTypes = streamedShapes.map(s => s.type as string);
      const blockTypes = streamedBlocks.map(() => 'text');
      const claudeDesc = [...shapeTypes, ...blockTypes].join(', ');
      setPanel1(prev => ({
        ...prev,
        turnHistory: newHistory + `Turn ${turnNum}: Claude drew ${claudeDesc || 'nothing'}.\n`,
        isLoading: false,
      }));

    } catch (error) {
      console.error('[Panel 1] Error:', error);
      setPanel1(prev => ({ ...prev, isLoading: false }));
    }

    console.log('[Panel 1] Complete. Shapes:', streamedShapes.length, 'Blocks:', streamedBlocks.length);
  };

  // Panel 2: Full Multi-turn approach
  const handlePanel2Turn = async (snapshot: CanvasSnapshot, turnNum: number) => {
    setPanel2(prev => ({ ...prev, isLoading: true }));

    // Build multi-turn messages
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];

    for (const turn of panel2.turns) {
      if (turn.who === 'human' && turn.snapshot) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: turn.snapshot.imageDataUrl.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            { type: 'text', text: `Turn ${turn.turnNumber}: The human drew something new (in black). Your turn to draw.` },
          ],
        });
      } else if (turn.who === 'claude' && turn.claudeResponse) {
        messages.push({
          role: 'assistant',
          content: turn.claudeResponse,
        });
      }
    }

    // Add current turn
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: snapshot.imageDataUrl.replace(/^data:image\/\w+;base64,/, ''),
          },
        },
        { type: 'text', text: `Turn ${turnNum}: The human drew something new (in black). Your turn to draw.` },
      ],
    });

    const streamedShapes: Shape[] = [];
    const streamedBlocks: AsciiBlock[] = [];
    let fullResponse = '';

    try {
      const response = await fetch('/api/draw/multi-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          canvasWidth: canvasRefs.current[1]?.width,
          canvasHeight: canvasRefs.current[1]?.height,
          streaming: true,
          drawMode,
          temperature,
          maxTokens,
        }),
      });

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
                streamedShapes.push(event.data);
                setPanel2(prev => ({ ...prev, shapes: [...prev.shapes, event.data] }));
              } else if (event.type === 'block') {
                streamedBlocks.push(event.data);
                setPanel2(prev => ({ ...prev, blocks: [...prev.blocks, event.data] }));
              } else if (event.type === 'done' && event.usage) {
                setPanel2(prev => ({
                  ...prev,
                  tokenUsage: {
                    input: prev.tokenUsage.input + event.usage.input_tokens,
                    output: prev.tokenUsage.output + event.usage.output_tokens,
                  },
                }));
              }
            } catch { /* skip */ }
          }
        }
      }

      // Build Claude's response for future turns
      fullResponse = JSON.stringify({ shapes: streamedShapes, blocks: streamedBlocks });

      // Add turns to history
      setPanel2(prev => ({
        ...prev,
        turns: [
          ...prev.turns,
          { turnNumber: turnNum, who: 'human', snapshot },
          { turnNumber: turnNum, who: 'claude', shapes: streamedShapes, blocks: streamedBlocks, claudeResponse: fullResponse },
        ],
        isLoading: false,
      }));

    } catch (error) {
      console.error('Panel 2 error:', error);
      setPanel2(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Panel 3: Sliding Window + Summary approach
  const handlePanel3Turn = async (snapshot: CanvasSnapshot, turnNum: number) => {
    setPanel3(prev => ({ ...prev, isLoading: true }));

    // Check if we need to summarize (more than 3 recent turns)
    if (panel3.recentTurns.length >= 4) {
      triggerBackgroundSummarization();
    }

    // Build messages with summary + recent turns
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];

    // Get only last 2 human-claude pairs from recent turns
    const recentPairs = panel3.recentTurns.slice(-4);

    // First message includes summary if available
    let isFirst = true;
    for (const turn of recentPairs) {
      if (turn.who === 'human' && turn.snapshot) {
        const textContent = isFirst && panel3.summary
          ? `Previous session summary: ${panel3.summary}\n\nTurn ${turn.turnNumber}: The human drew something new (in black). Your turn to draw.`
          : `Turn ${turn.turnNumber}: The human drew something new (in black). Your turn to draw.`;
        isFirst = false;

        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: turn.snapshot.imageDataUrl.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            { type: 'text', text: textContent },
          ],
        });
      } else if (turn.who === 'claude' && turn.claudeResponse) {
        messages.push({
          role: 'assistant',
          content: turn.claudeResponse,
        });
      }
    }

    // Add current turn
    const currentText = isFirst && panel3.summary
      ? `Previous session summary: ${panel3.summary}\n\nTurn ${turnNum}: The human drew something new (in black). Your turn to draw.`
      : `Turn ${turnNum}: The human drew something new (in black). Your turn to draw.`;

    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: snapshot.imageDataUrl.replace(/^data:image\/\w+;base64,/, ''),
          },
        },
        { type: 'text', text: currentText },
      ],
    });

    const streamedShapes: Shape[] = [];
    const streamedBlocks: AsciiBlock[] = [];
    let fullResponse = '';

    try {
      const response = await fetch('/api/draw/multi-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          canvasWidth: canvasRefs.current[2]?.width,
          canvasHeight: canvasRefs.current[2]?.height,
          streaming: true,
          drawMode,
          temperature,
          maxTokens,
        }),
      });

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
                streamedShapes.push(event.data);
                setPanel3(prev => ({ ...prev, shapes: [...prev.shapes, event.data] }));
              } else if (event.type === 'block') {
                streamedBlocks.push(event.data);
                setPanel3(prev => ({ ...prev, blocks: [...prev.blocks, event.data] }));
              } else if (event.type === 'done' && event.usage) {
                setPanel3(prev => ({
                  ...prev,
                  tokenUsage: {
                    input: prev.tokenUsage.input + event.usage.input_tokens,
                    output: prev.tokenUsage.output + event.usage.output_tokens,
                  },
                }));
              }
            } catch { /* skip */ }
          }
        }
      }

      fullResponse = JSON.stringify({ shapes: streamedShapes, blocks: streamedBlocks });

      setPanel3(prev => ({
        ...prev,
        recentTurns: [
          ...prev.recentTurns,
          { turnNumber: turnNum, who: 'human', snapshot },
          { turnNumber: turnNum, who: 'claude', shapes: streamedShapes, blocks: streamedBlocks, claudeResponse: fullResponse },
        ],
        isLoading: false,
      }));

    } catch (error) {
      console.error('Panel 3 error:', error);
      setPanel3(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Background summarization for Panel 3
  const triggerBackgroundSummarization = async () => {
    if (panel3.isSummarizing) return;

    setPanel3(prev => ({ ...prev, isSummarizing: true }));

    // Get turns to summarize (all except last 4)
    const turnsToSummarize = panel3.recentTurns.slice(0, -4).map(turn => ({
      turnNumber: turn.turnNumber,
      who: turn.who,
      shapes: turn.shapes?.map(s => ({ type: s.type })),
      blocks: turn.blocks,
    }));

    if (turnsToSummarize.length === 0) {
      setPanel3(prev => ({ ...prev, isSummarizing: false }));
      return;
    }

    try {
      const response = await fetch('/api/draw/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turns: turnsToSummarize,
          existingSummary: panel3.summary,
        }),
      });

      const { summary, usage } = await response.json();

      setPanel3(prev => ({
        ...prev,
        summary,
        recentTurns: prev.recentTurns.slice(-4), // Keep only last 4 turns
        isSummarizing: false,
        tokenUsage: {
          input: prev.tokenUsage.input + (usage?.input_tokens || 0),
          output: prev.tokenUsage.output + (usage?.output_tokens || 0),
        },
      }));
    } catch (error) {
      console.error('Summarization error:', error);
      setPanel3(prev => ({ ...prev, isSummarizing: false }));
    }
  };

  // Handle "Your Turn" - sends to both panels
  const handleYourTurn = async () => {
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    const snapshot = captureSnapshot(0);

    // Run both panels in parallel
    await Promise.all([
      handlePanel1Turn(snapshot, newTurnCount),
      handlePanel2Turn(snapshot, newTurnCount),
    ]);
  };

  // Clear all panels
  const handleClear = () => {
    canvasRefs.current.forEach((canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    setTurnCount(0);
    setPanel1({
      shapes: [],
      blocks: [],
      turnHistory: '',
      tokenUsage: { input: 0, output: 0 },
      isLoading: false,
    });
    setPanel2({
      turns: [],
      shapes: [],
      blocks: [],
      tokenUsage: { input: 0, output: 0 },
      isLoading: false,
    });
  };

  const isAnyLoading = panel1.isLoading || panel2.isLoading;

  return (
    <div className="h-dvh w-screen flex flex-col bg-white">
      {/* Two panels */}
      <div className="flex-1 flex">
        {[panel1, panel2].map((panel, index) => (
          <div key={index} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0">
            {/* Panel header */}
            <div className="p-2 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-700 text-center">
                {APPROACH_LABELS[index]}
              </div>
              <div className="text-xs text-gray-400 flex justify-center gap-2 mt-1 flex-wrap">
                <span>Turn {turnCount}</span>
                <span>|</span>
                <span>{panel.tokenUsage.input}↓ {panel.tokenUsage.output}↑</span>
                <span>|</span>
                <span>{formatCost(panel.tokenUsage)}</span>
              </div>
              <div className="text-center h-4">
                {panel.isLoading && <span className="text-xs text-blue-500 animate-pulse">drawing...</span>}
              </div>
            </div>

            {/* Canvas for user strokes + SVG overlay for Claude's shapes */}
            <div className="flex-1 relative">
              <canvas
                ref={(el) => { canvasRefs.current[index] = el; }}
                className={`absolute inset-0 w-full h-full touch-none ${index === 0 ? 'cursor-crosshair' : 'pointer-events-none'}`}
                onMouseDown={index === 0 ? startDrawing : undefined}
                onMouseMove={index === 0 ? draw : undefined}
                onMouseUp={index === 0 ? stopDrawing : undefined}
                onMouseLeave={index === 0 ? stopDrawing : undefined}
                onTouchStart={index === 0 ? startDrawing : undefined}
                onTouchMove={index === 0 ? draw : undefined}
                onTouchEnd={index === 0 ? stopDrawing : undefined}
              />
              {/* SVG overlay for Claude's shapes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                {(index === 0 ? panel1 : panel2).shapes.map((shape, i) => {
                  if (shape.type === 'path' && shape.d) {
                    return <path key={i} d={shape.d} stroke={shape.color || '#3b82f6'} strokeWidth={shape.strokeWidth || 2} fill={shape.fill || 'transparent'} />;
                  }
                  if (shape.type === 'circle' && shape.cx !== undefined) {
                    return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} stroke={shape.color || '#3b82f6'} strokeWidth={shape.strokeWidth || 2} fill={shape.fill || 'transparent'} />;
                  }
                  if (shape.type === 'rect' && shape.x !== undefined) {
                    return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.color || '#3b82f6'} strokeWidth={shape.strokeWidth || 2} fill={shape.fill || 'transparent'} />;
                  }
                  if (shape.type === 'line' && shape.x1 !== undefined) {
                    return <line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.color || '#3b82f6'} strokeWidth={shape.strokeWidth || 2} />;
                  }
                  return null;
                })}
                {/* ASCII blocks as SVG text */}
                {(index === 0 ? panel1 : panel2).blocks.map((block, i) => (
                  <text key={`block-${i}`} x={block.x} y={block.y} fill={block.color || '#3b82f6'} fontSize="14" fontFamily="monospace">
                    {block.block.split('\n').map((line, j) => (
                      <tspan key={j} x={block.x} dy={j === 0 ? 0 : 16}>{line}</tspan>
                    ))}
                  </text>
                ))}
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
          {/* Actions */}
          <button
            onClick={handleYourTurn}
            disabled={isAnyLoading}
            className="px-3 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnyLoading ? '...' : '🫱'}
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
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`px-3 py-2 border rounded-full text-sm ${showDebug ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            debug
          </button>
        </div>
        <p className="text-xs text-gray-400">Context management comparison • Structured Memory vs Full Multi-turn</p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute right-4 bottom-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-sm">Settings</span>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* Draw Mode */}
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 block">Draw Mode</label>
            <div className="flex gap-1">
              {(['all', 'shapes', 'ascii'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDrawMode(mode)}
                  className={`px-2 py-1 text-xs rounded ${
                    drawMode === mode ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 flex justify-between">
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
              className="w-full h-1 accent-black"
            />
          </div>

          {/* Max Tokens */}
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 flex justify-between">
              <span>Max Tokens</span>
              <span>{maxTokens}</span>
            </label>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-1 accent-black"
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-20 px-2 py-1 text-xs border border-gray-200 rounded resize-none focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute left-4 bottom-20 w-96 max-h-80 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 text-xs font-mono">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-sm">Debug Info</span>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="mb-3 p-2 bg-blue-50 rounded">
            <div className="font-bold text-blue-700 mb-1">Panel 1: Structured Memory</div>
            <div>Shapes: {panel1.shapes.length} | Blocks: {panel1.blocks.length}</div>
            <div className="text-gray-500 mt-1 whitespace-pre-wrap">{panel1.turnHistory || '(no history)'}</div>
          </div>

          <div className="p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700 mb-1">Panel 2: Full Multi-turn</div>
            <div>Turns: {panel2.turns.length} | Shapes: {panel2.shapes.length} | Blocks: {panel2.blocks.length}</div>
            <div className="text-gray-500 mt-1">Messages sent: {panel2.turns.length + 1}</div>
          </div>
        </div>
      )}

    </div>
  );
}
