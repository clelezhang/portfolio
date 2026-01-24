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
  // SVG path
  d?: string;
}

type DrawMode = 'all' | 'shapes' | 'ascii';

interface Turn {
  who: 'human' | 'claude';
  description?: string;
}

interface Comment {
  text: string;
  x: number;
  y: number;
  from: 'human' | 'claude';
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

// Unified drawing element for proper z-ordering
interface DrawingElement {
  id: string;
  source: 'human' | 'claude';
  type: 'stroke' | 'shape';
  data: HumanStroke | Shape;
}

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [asciiBlocks, setAsciiBlocks] = useState<AsciiBlock[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [humanHasDrawn, setHumanHasDrawn] = useState(false);
  const [wish, setWish] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(false);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [tool, setTool] = useState<'draw' | 'erase' | 'comment'>('draw');
  const [commentInput, setCommentInput] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [prompt, setPrompt] = useState(
    `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`
  );
  const [drawMode, setDrawMode] = useState<DrawMode>('all');
  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);
  // Unified drawing elements for proper z-ordering (human + claude)
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const elementIdCounter = useRef(0);
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeSize, setStrokeSize] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [distortionEnabled] = useState(true);
  const [wiggleEnabled] = useState(true);
  const [distortionAmount] = useState(2);
  const [wiggleSpeed] = useState(168);
  const [filterSeed, setFilterSeed] = useState(1);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastDrawnPoint = useRef<{ x: number; y: number } | null>(null);
  const lastAsciiPoint = useRef<{ x: number; y: number } | null>(null);
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleYourTurnRef = useRef<() => void>(() => {});

  // Add a comment to the canvas
  const addComment = useCallback((text: string, from: 'human' | 'claude', x?: number, y?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let commentX = x;
    let commentY = y;

    if (commentX === undefined) {
      if (from === 'human' && lastDrawnPoint.current) {
        // Place human comment near where they last drew
        commentX = lastDrawnPoint.current.x + 10;
        commentY = lastDrawnPoint.current.y - 10;
      } else if (from === 'human') {
        // Default if no drawing yet
        commentX = 50;
        commentY = 50;
      } else {
        // Default position for Claude if not specified
        commentX = canvas.width - 200;
        commentY = 50;
      }
    }

    setComments((prev) => [...prev, { text, x: commentX!, y: commentY!, from }]);
  }, []);

  // Redraw ASCII blocks and shapes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Handle erase shapes on canvas
    shapes.forEach((shape) => {
      if (shape.type === 'erase' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        ctx.clearRect(shape.x, shape.y, shape.width, shape.height);
      }
    });
    // Note: Other shapes are rendered in SVG overlay for filter effects

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

  // Set up canvas - size based on container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      // Canvas fills the container
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [asciiBlocks, shapes, redraw]);

  // Wiggle animation effect
  useEffect(() => {
    if (!wiggleEnabled) return;

    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, wiggleSpeed);

    return () => clearInterval(interval);
  }, [wiggleEnabled, wiggleSpeed]);

  // Wheel handler - scroll to pan, ctrl/cmd+scroll to zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    // Ctrl/Cmd + scroll = zoom (trackpad pinch gestures set ctrlKey)
    if (e.ctrlKey || e.metaKey) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Zoom factor - use actual delta for smoother, more sensitive zooming
      const zoomFactor = 1 - e.deltaY * 0.01;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 4);

      // Adjust pan to zoom toward mouse position
      const mouseOffsetX = mouseX - centerX - pan.x;
      const mouseOffsetY = mouseY - centerY - pan.y;
      const newPanX = pan.x - mouseOffsetX * (newZoom / zoom - 1);
      const newPanY = pan.y - mouseOffsetY * (newZoom / zoom - 1);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Plain scroll/trackpad = pan
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [zoom, pan]);

  // Attach wheel handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Spacebar for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
        panStart.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pan handlers
  const startPan = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const doPan = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const stopPan = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Double-click to reset view
  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { x: screenX, y: screenY };

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Get position relative to container center, remove pan, then scale
    const relX = screenX - rect.left - centerX;
    const relY = screenY - rect.top - centerY;

    // Reverse the transform: remove pan, then remove zoom, then add back center offset
    const canvasX = (relX - pan.x) / zoom + centerX;
    const canvasY = (relY - pan.y) / zoom + centerY;

    return { x: canvasX, y: canvasY };
  }, [zoom, pan]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return screenToCanvas(e.touches[0].clientX, e.touches[0].clientY);
    }
    return screenToCanvas(e.clientX, e.clientY);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHumanHasDrawn(true);
    const point = getPoint(e);
    lastPoint.current = point;
    lastAsciiPoint.current = point; // Set initial anchor for ASCII mode

    // Start a new SVG stroke (draw or erase)
    if ((tool === 'draw' || tool === 'erase') && !asciiStroke) {
      setCurrentStroke({
        d: `M ${point.x} ${point.y}`,
        color: tool === 'erase' ? '#ffffff' : strokeColor,
        strokeWidth: tool === 'erase' ? strokeSize * 5 : strokeSize,
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    const point = getPoint(e);
    if (!point) return;

    if (tool === 'erase' || (tool === 'draw' && !asciiStroke)) {
      // SVG stroke mode (draw or erase)
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: `${prev.d} L ${point.x} ${point.y}`,
      } : null);
    } else if (asciiStroke) {
      // ASCII stroke mode: draw random ASCII characters along the path (canvas)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const asciiChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~*+=#@$%&!?<>^.:;-_/\\|[]{}()░▒▓█●○◐◑▲▼◆◇■□★☆♦♣♠♥∞≈≠±×÷«»¤¶§†‡';
      const charSpacing = Math.max(8, strokeSize * 4);

      // Check distance from last placed character
      const lastAscii = lastAsciiPoint.current!;
      const dx = point.x - lastAscii.x;
      const dy = point.y - lastAscii.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= charSpacing) {
        ctx.font = `${Math.max(10, strokeSize * 5)}px monospace`;
        ctx.fillStyle = strokeColor;
        const char = asciiChars[Math.floor(Math.random() * asciiChars.length)];
        ctx.fillText(char, point.x - strokeSize, point.y + strokeSize);
        lastAsciiPoint.current = { x: point.x, y: point.y };
      }
    }

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (lastPoint.current) {
      lastDrawnPoint.current = { ...lastPoint.current };
    }
    // Save the completed stroke to both arrays
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes(prev => [...prev, currentStroke]);
      // Also add to unified drawing elements for proper z-ordering
      const id = `human-${elementIdCounter.current++}`;
      setDrawingElements(prev => [...prev, {
        id,
        source: 'human',
        type: 'stroke',
        data: currentStroke,
      }]);
    }
    setCurrentStroke(null);
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
    // Clear previous thinking when starting new turn
    if (thinkingEnabled) {
      setThinkingText('');
    }

    // Build updated history
    const newHistory = [...history];
    if (humanHasDrawn) {
      newHistory.push({ who: 'human' });
    }

    // Track streamed items for history
    const streamedBlocks: AsciiBlock[] = [];
    const streamedShapes: Shape[] = [];

    try {
      // Rasterize human SVG strokes to canvas before capturing
      const ctx = canvas.getContext('2d');
      if (ctx && humanStrokes.length > 0) {
        humanStrokes.forEach(stroke => {
          const path = new Path2D(stroke.d);
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(path);
        });
      }

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
          streaming: true,
          drawMode,
          thinkingEnabled,
          thinkingBudget: 10000,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete data in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'thinking') {
                // Append thinking text incrementally
                setThinkingText((prev) => prev + event.data);
              } else if (event.type === 'block') {
                setAsciiBlocks((prev) => [...prev, event.data]);
                streamedBlocks.push(event.data);
              } else if (event.type === 'shape') {
                setShapes((prev) => [...prev, event.data]);
                streamedShapes.push(event.data);
                // Add to unified drawing elements for proper z-ordering
                const id = `claude-${elementIdCounter.current++}`;
                setDrawingElements(prev => [...prev, {
                  id,
                  source: 'claude',
                  type: 'shape',
                  data: event.data as Shape,
                }]);
              } else if (event.type === 'say') {
                addComment(event.data.say, 'claude', event.data.sayX, event.data.sayY);
              } else if (event.type === 'wish') {
                setWish(event.data);
                console.log('claude wishes:', event.data);
              } else if (event.type === 'done') {
                // Build description for history
                let description = '';
                if (streamedBlocks.length > 0) {
                  description += streamedBlocks.map((b) => b.block).join('\n---\n');
                }
                if (streamedShapes.length > 0) {
                  const shapeDesc = streamedShapes.map((s) => `${s.type}`).join(', ');
                  description += (description ? '\n' : '') + `[shapes: ${shapeDesc}]`;
                }
                if (description) {
                  newHistory.push({ who: 'claude', description });
                  setHistory(newHistory);
                  setHumanHasDrawn(false);
                }
              } else if (event.type === 'error') {
                console.error('Stream error:', event.message);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
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
    setHumanStrokes([]);
    setCurrentStroke(null);
    setComments([]);
    setHistory([]);
    setHumanHasDrawn(false);
    setWish(null);
    setDrawingElements([]);
    setThinkingText('');
    lastDrawnPoint.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== 'comment') return;
    const point = getPoint(e);
    if (!point) return;
    // Open comment input at click position
    setCommentInput({ x: point.x, y: point.y });
    setCommentText('');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !commentInput) return;
    addComment(commentText.trim(), 'human', commentInput.x, commentInput.y);
    setPendingMessages((prev) => [...prev, commentText.trim()]);
    setCommentInput(null);
    setCommentText('');
  };

  const handleCommentCancel = () => {
    setCommentInput(null);
    setCommentText('');
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
      {/* SVG filter definitions (always present) */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="wobbleFilter">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="3"
              seed={filterSeed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={distortionAmount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main content area with optional thinking panel */}
      <div className="flex-1 flex overflow-hidden">
      {/* Zoom/pan container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => {
          if (spacePressed || e.button === 1) {
            startPan(e);
          } else if (tool !== 'comment') {
            startDrawing(e);
          }
        }}
        onMouseMove={(e) => {
          if (isPanning) {
            doPan(e);
          } else if (tool !== 'comment') {
            draw(e);
          }
        }}
        onMouseUp={(e) => {
          if (isPanning) {
            stopPan();
          } else if (tool !== 'comment') {
            stopDrawing();
          }
        }}
        onMouseLeave={() => {
          if (isPanning) {
            stopPan();
          } else if (tool !== 'comment') {
            stopDrawing();
          }
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={tool === 'comment' ? undefined : startDrawing}
        onTouchMove={tool === 'comment' ? undefined : draw}
        onTouchEnd={tool === 'comment' ? (e) => {
          const touch = e.changedTouches[0];
          const point = screenToCanvas(touch.clientX, touch.clientY);
          setCommentInput({ x: point.x, y: point.y });
          setCommentText('');
        } : stopDrawing}
        style={{ cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : (tool === 'comment' ? 'crosshair' : tool === 'erase' ? 'cell' : 'crosshair') }}
      >
        {/* Transform wrapper for zoom/pan */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            className="touch-none w-full h-full"
            style={{
              ...(distortionEnabled || wiggleEnabled) ? { filter: 'url(#wobbleFilter)' } : {},
              boxShadow: zoom !== 1 ? '0 0 0 1px rgba(0,0,0,0.1)' : undefined,
            }}
          />

          {/* Unified SVG layer for all drawings (human + claude) with proper z-ordering */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', filter: (distortionEnabled || wiggleEnabled) ? 'url(#wobbleFilter)' : undefined }}
          >
            {drawingElements.map((element) => {
              if (element.type === 'stroke') {
                const stroke = element.data as HumanStroke;
                return (
                  <path
                    key={element.id}
                    d={stroke.d}
                    stroke={stroke.color}
                    strokeWidth={stroke.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              // Render Claude's shapes
              const shape = element.data as Shape;
              if (shape.type === 'path' && shape.d) {
                return (
                  <path
                    key={element.id}
                    d={shape.d}
                    stroke={shape.color || '#3b82f6'}
                    strokeWidth={shape.strokeWidth || 2}
                    fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
                return (
                  <circle
                    key={element.id}
                    cx={shape.cx}
                    cy={shape.cy}
                    r={shape.r}
                    stroke={shape.color || '#3b82f6'}
                    strokeWidth={shape.strokeWidth || 2}
                    fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                  />
                );
              }
              if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
                return (
                  <rect
                    key={element.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    stroke={shape.color || '#3b82f6'}
                    strokeWidth={shape.strokeWidth || 2}
                    fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                  />
                );
              }
              if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
                return (
                  <line
                    key={element.id}
                    x1={shape.x1}
                    y1={shape.y1}
                    x2={shape.x2}
                    y2={shape.y2}
                    stroke={shape.color || '#3b82f6'}
                    strokeWidth={shape.strokeWidth || 2}
                    strokeLinecap="round"
                  />
                );
              }
              if (shape.type === 'curve' && shape.points && shape.points.length >= 2) {
                let d = `M ${shape.points[0][0]} ${shape.points[0][1]}`;
                if (shape.points.length === 3) {
                  d += ` Q ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]}`;
                } else if (shape.points.length === 4) {
                  d += ` C ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]} ${shape.points[3][0]} ${shape.points[3][1]}`;
                } else {
                  for (let j = 1; j < shape.points.length; j++) {
                    d += ` L ${shape.points[j][0]} ${shape.points[j][1]}`;
                  }
                }
                return (
                  <path
                    key={element.id}
                    d={d}
                    stroke={shape.color || '#3b82f6'}
                    strokeWidth={shape.strokeWidth || 2}
                    fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              return null;
            })}
            {/* Current stroke being drawn */}
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
        </div>{/* End transform wrapper */}

      {/* Floating comments */}
      {comments.map((comment, i) => (
        <div
          key={i}
          className={`absolute pointer-events-none ${
            comment.from === 'human'
              ? 'bg-gray-800 text-white'
              : 'bg-blue-500 text-white'
          } px-2 py-1 rounded text-xs max-w-32 shadow-sm`}
          style={{ left: comment.x, top: comment.y }}
        >
          {comment.text}
        </div>
      ))}

      {/* Comment input popup */}
      {commentInput && (
        <form
          onSubmit={handleCommentSubmit}
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-20"
          style={{ left: commentInput.x, top: commentInput.y }}
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add comment..."
            className="px-2 py-1 text-sm border-none outline-none w-40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCommentCancel();
            }}
          />
          <div className="flex gap-1 mt-1">
            <button
              type="submit"
              className="px-2 py-1 bg-black text-white text-xs rounded"
            >
              Add
            </button>
            <button
              type="button"
              onClick={handleCommentCancel}
              className="px-2 py-1 text-gray-500 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      </div>{/* End zoom/pan container */}

      {/* Thinking Panel - right side */}
      {thinkingEnabled && showThinkingPanel && (
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
            <span className="text-sm font-medium text-gray-700">Claude&apos;s Thoughts</span>
            <button
              onClick={() => setShowThinkingPanel(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {thinkingText ? (
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                {thinkingText}
              </pre>
            ) : isLoading ? (
              <p className="text-xs text-gray-400 italic">Thinking...</p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Claude&apos;s reasoning will appear here when drawing.
              </p>
            )}
          </div>
        </div>
      )}
      </div>{/* End main content area */}

      {/* Settings panel - shows above bottom bar */}
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDrawEnabled}
                onChange={(e) => setAutoDrawEnabled(e.target.checked)}
                className="rounded"
              />
              <span>Auto-draw (2s)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={asciiStroke}
                onChange={(e) => setAsciiStroke(e.target.checked)}
                className="rounded"
              />
              <span>ASCII strokes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => {
                  setThinkingEnabled(e.target.checked);
                  if (e.target.checked) setShowThinkingPanel(true);
                }}
                className="rounded"
              />
              <span>Show thinking</span>
            </label>
          </div>

          {/* Temperature */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-600 mb-1">
              <span>Temperature</span>
              <span>{thinkingEnabled ? 'N/A' : temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
              disabled={thinkingEnabled}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>predictable</span>
              <span>creative</span>
            </div>
            {thinkingEnabled && (
              <p className="text-xs text-amber-500 mt-1">Disabled when thinking is enabled</p>
            )}
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

      <div className="flex flex-col items-center gap-2 p-4 border-t border-gray-100">
        {wish && (
          <p className="text-sm text-gray-500 italic">&quot;{wish}&quot;</p>
        )}
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
                  color: strokeColor
                }}
                title={`${size}px`}
              />
            ))}
          </div>
          <div className="flex border border-gray-200 rounded-full overflow-hidden">
            <button
              onClick={() => setTool('draw')}
              className={`px-3 py-2 text-sm ${tool === 'draw' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
            >
              ✏️
            </button>
            <button
              onClick={() => setTool('erase')}
              className={`px-3 py-2 text-sm ${tool === 'erase' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
            >
              ⌫
            </button>
            {sayEnabled && (
              <button
                onClick={() => setTool('comment')}
                className={`px-3 py-2 text-sm ${tool === 'comment' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
              >
                💬
              </button>
            )}
          </div>
          {!autoDrawEnabled && (
            <button
              onClick={handleYourTurn}
              disabled={isLoading}
              className="px-3 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '🫱'}
            </button>
          )}
          {autoDrawEnabled && isLoading && (
            <span className="text-sm text-gray-400">drawing...</span>
          )}
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
          {thinkingEnabled && !showThinkingPanel && (
            <button
              onClick={() => setShowThinkingPanel(true)}
              className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
              title="Show thinking panel"
            >
              💭
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
