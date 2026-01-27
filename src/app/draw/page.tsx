'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import './draw.css';

// Types
import {
  AsciiBlock,
  Shape,
  DrawMode,
  Turn,
  HumanStroke,
  HumanAsciiChar,
  DrawingElement,
  Point,
  CanvasBackground,
  Tool,
} from './types';

// Constants
import {
  ASCII_CHARS,
  DEFAULT_STROKE_SIZE,
  DEFAULT_STROKE_COLOR,
  DEFAULT_GRID_SIZE,
  DEFAULT_PROMPT,
  AUTO_DRAW_DELAY,
  WIGGLE_SPEED,
  DISTORTION_AMOUNT,
} from './constants';

// Hooks
import { useZoomPan } from './hooks/useZoomPan';
import { useComments } from './hooks/useComments';

// Components
import { DrawToolbar } from './components/DrawToolbar';
import { CustomCursor } from './components/CustomCursor';
import { CommentSystem } from './components/CommentSystem';
import { CommentInput } from './components/CommentInput';

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnPoint = useRef<Point | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [asciiBlocks, setAsciiBlocks] = useState<AsciiBlock[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [humanAsciiChars, setHumanAsciiChars] = useState<HumanAsciiChar[]>([]);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const elementIdCounter = useRef(0);

  // History and state
  const [history, setHistory] = useState<Turn[]>([]);
  const [humanHasDrawn, setHumanHasDrawn] = useState(false);
  const [wish, setWish] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Tool state
  const [tool, setTool] = useState<Tool>('draw');
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeSize, setStrokeSize] = useState(DEFAULT_STROKE_SIZE);
  const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE_COLOR);
  const [paletteIndex, setPaletteIndex] = useState(0);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(false);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [drawMode, setDrawMode] = useState<DrawMode>('all');

  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);

  // Visual effects state
  const [distortionEnabled] = useState(true);
  const [wiggleEnabled] = useState(true);
  const [filterSeed, setFilterSeed] = useState(1);

  // Canvas options
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>('none');
  const [canvasBorder, setCanvasBorder] = useState(false);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);

  // Cursor position
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  // Refs
  const lastPoint = useRef<Point | null>(null);
  const lastAsciiPoint = useRef<Point | null>(null);
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleYourTurnRef = useRef<() => void>(() => {});

  // Use custom hooks
  const {
    zoom,
    pan,
    isPanning,
    spacePressed,
    startPan,
    doPan,
    stopPan,
    handleDoubleClick,
    screenToCanvas,
    canvasToScreen,
  } = useZoomPan({ containerRef, canvasRef });

  const {
    comments,
    setComments,
    openCommentIndex,
    setOpenCommentIndex,
    hoveredCommentIndex,
    setHoveredCommentIndex,
    replyingToIndex,
    setReplyingToIndex,
    replyText,
    setReplyText,
    commentInput,
    setCommentInput,
    commentText,
    setCommentText,
    addComment,
    deleteComment,
    addReplyToComment,
    handleCommentCancel,
  } = useComments({ canvasRef, lastDrawnPoint });

  // Redraw ASCII blocks and shapes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    shapes.forEach((shape) => {
      if (shape.type === 'erase' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        ctx.clearRect(shape.x, shape.y, shape.width, shape.height);
      }
    });

    humanAsciiChars.forEach((charData) => {
      ctx.font = `${charData.fontSize}px monospace`;
      ctx.fillStyle = charData.color;
      ctx.fillText(charData.char, charData.x, charData.y);
    });

    asciiBlocks.forEach((block) => {
      ctx.font = '16px monospace';
      ctx.fillStyle = block.color || '#3b82f6';
      const lines = block.block.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, block.x, block.y + i * 18);
      });
    });
  }, [asciiBlocks, shapes, humanAsciiChars]);

  // Set up canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
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

  // Wiggle animation
  useEffect(() => {
    if (!wiggleEnabled) return;
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, WIGGLE_SPEED);
    return () => clearInterval(interval);
  }, [wiggleEnabled]);

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
    lastAsciiPoint.current = point;

    if (tool === 'erase' || (tool === 'draw' && !asciiStroke)) {
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
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: `${prev.d} L ${point.x} ${point.y}`,
      } : null);
    } else if (asciiStroke) {
      const charSpacing = Math.max(8, strokeSize * 4);
      const lastAscii = lastAsciiPoint.current!;
      const dx = point.x - lastAscii.x;
      const dy = point.y - lastAscii.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= charSpacing) {
        const fontSize = Math.max(10, strokeSize * 5);
        const char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
        setHumanAsciiChars(prev => [...prev, {
          char,
          x: point.x - strokeSize,
          y: point.y + strokeSize,
          color: strokeColor,
          fontSize,
        }]);
        lastAsciiPoint.current = { x: point.x, y: point.y };
      }
    }

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (lastPoint.current) {
      lastDrawnPoint.current = { ...lastPoint.current };
    }
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes(prev => [...prev, currentStroke]);
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
    if (thinkingEnabled) {
      setThinkingText('');
    }

    const newHistory = [...history];
    if (humanHasDrawn) {
      newHistory.push({ who: 'human' });
    }

    const streamedBlocks: AsciiBlock[] = [];
    const streamedShapes: Shape[] = [];

    try {
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

              if (event.type === 'thinking') {
                setThinkingText((prev) => prev + event.data);
              } else if (event.type === 'block') {
                setAsciiBlocks((prev) => [...prev, event.data]);
                streamedBlocks.push(event.data);
              } else if (event.type === 'shape') {
                setShapes((prev) => [...prev, event.data]);
                streamedShapes.push(event.data);
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

      setPendingMessages([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  handleYourTurnRef.current = handleYourTurn;

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAsciiBlocks([]);
    setShapes([]);
    setHumanStrokes([]);
    setHumanAsciiChars([]);
    setCurrentStroke(null);
    setComments([]);
    setHistory([]);
    setHumanHasDrawn(false);
    setWish(null);
    setDrawingElements([]);
    setThinkingText('');
    lastDrawnPoint.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If there's an open comment, just close it and don't do anything else
    if (openCommentIndex !== null) {
      setOpenCommentIndex(null);
      setReplyingToIndex(null);
      return;
    }

    // If there's a comment input open, just close it and don't do anything else
    if (commentInput !== null) {
      setCommentInput(null);
      setCommentText('');
      return;
    }

    // If hovering a comment, clear hover and don't do anything else
    if (hoveredCommentIndex !== null) {
      setHoveredCommentIndex(null);
      return;
    }

    // Only create new comment input if in comment mode
    if (tool !== 'comment') return;
    const point = getPoint(e);
    if (!point) return;
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

  const triggerAutoDraw = useCallback(() => {
    if (autoDrawTimeoutRef.current) {
      clearTimeout(autoDrawTimeoutRef.current);
    }
    autoDrawTimeoutRef.current = setTimeout(() => {
      handleYourTurnRef.current();
    }, AUTO_DRAW_DELAY);
  }, []);

  return (
    <div className="draw-page relative overflow-hidden">
      {/* SVG filter definitions */}
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
              scale={DISTORTION_AMOUNT}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main content area */}
      <div className="draw-main">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="draw-canvas-container"
          style={{ cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'none' }}
          onMouseDown={(e) => {
            // Don't start drawing if there's an open comment or comment input
            if (openCommentIndex !== null || commentInput !== null) {
              return;
            }
            if (spacePressed || e.button === 1) {
              startPan(e);
            } else if (tool !== 'comment') {
              startDrawing(e);
            }
          }}
          onMouseMove={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
            if (isPanning) {
              doPan(e);
            } else if (tool !== 'comment') {
              draw(e);
            }
          }}
          onMouseUp={() => {
            if (isPanning) {
              stopPan();
            } else if (tool !== 'comment') {
              stopDrawing();
            }
          }}
          onMouseLeave={() => {
            setCursorPos(null);
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
        >
          {/* Transform wrapper for zoom/pan */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              backgroundColor: 'white',
              ...(!canvasBorder && canvasBackground === 'grid' ? {
                backgroundImage: `
                  linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`,
              } : !canvasBorder && canvasBackground === 'dots' ? {
                backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
                backgroundSize: `${gridSize}px ${gridSize}px`,
              } : {}),
              ...((distortionEnabled || wiggleEnabled) && canvasBackground !== 'none' && !canvasBorder ? {
                filter: 'url(#wobbleFilter)',
              } : {}),
            }}
          >
            {canvasBorder && (
              <div
                className="absolute inset-6 rounded border border-neutral-300"
                style={{
                  ...(canvasBackground === 'grid' ? {
                    backgroundImage: `
                      linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  } : canvasBackground === 'dots' ? {
                    backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  } : {}),
                  ...((distortionEnabled || wiggleEnabled) ? {
                    filter: 'url(#wobbleFilter)',
                  } : {}),
                }}
              />
            )}
            <canvas
              ref={canvasRef}
              className="touch-none w-full h-full rounded-xl"
              style={{
                ...(distortionEnabled || wiggleEnabled) ? { filter: 'url(#wobbleFilter)' } : {},
                boxShadow: zoom !== 1 ? '0 0 0 1px rgba(0,0,0,0.1)' : undefined,
              }}
            />

            {/* SVG layer for drawings */}
            <svg
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }}
            >
              {drawingElements.map((element) => {
                if (element.type === 'stroke') {
                  const stroke = element.data as HumanStroke;
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
                      d={stroke.d}
                      stroke={stroke.color}
                      strokeWidth={stroke.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }
                const shape = element.data as Shape;
                if (shape.type === 'path' && shape.d) {
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
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
                      className="draw-stroke"
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
                      className="draw-stroke"
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
                      className="draw-stroke"
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
                      className="draw-stroke"
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

          {/* Custom cursor */}
          <CustomCursor
            cursorPos={cursorPos}
            isPanning={isPanning}
            spacePressed={spacePressed}
            tool={tool}
            asciiStroke={asciiStroke}
            strokeColor={strokeColor}
          />

          {/* Comment system */}
          <CommentSystem
            comments={comments}
            strokeColor={strokeColor}
            openCommentIndex={openCommentIndex}
            setOpenCommentIndex={setOpenCommentIndex}
            hoveredCommentIndex={hoveredCommentIndex}
            setHoveredCommentIndex={setHoveredCommentIndex}
            replyingToIndex={replyingToIndex}
            setReplyingToIndex={setReplyingToIndex}
            replyText={replyText}
            setReplyText={setReplyText}
            deleteComment={deleteComment}
            addReplyToComment={addReplyToComment}
            canvasToScreen={canvasToScreen}
            hasCommentInput={commentInput !== null}
            onCloseCommentInput={() => {
              setCommentInput(null);
              setCommentText('');
            }}
          />

          {/* Comment input */}
          {commentInput && (
            <CommentInput
              position={commentInput}
              screenPosition={canvasToScreen(commentInput.x, commentInput.y)}
              commentText={commentText}
              setCommentText={setCommentText}
              strokeColor={strokeColor}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
            />
          )}
        </div>

        {/* Thinking Panel */}
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
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-16 right-3 bg-white border border-black/10 rounded-xl p-4 shadow-lg text-sm z-10 w-72">
          <div className="font-medium mb-3 text-gray-700">Settings</div>

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

          <div className="mb-4">
            <label className="text-gray-600 mb-2 block">Canvas Background</label>
            <div className="flex flex-wrap gap-1">
              {(['none', 'grid', 'dots'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setCanvasBackground(bg)}
                  className={`px-2 py-1 text-xs rounded ${
                    canvasBackground === bg
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {bg === 'none' ? 'None' : bg === 'grid' ? 'Grid' : 'Dots'}
                </button>
              ))}
            </div>
            {canvasBackground !== 'none' && (
              <div className="mt-2">
                <label className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Grid size</span>
                  <span>{gridSize}px</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="64"
                  step="4"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={canvasBorder}
                onChange={(e) => setCanvasBorder(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Border + padding</span>
            </label>
          </div>

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

      {/* Bottom toolbar */}
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
        isLoading={isLoading}
        onYourTurn={handleYourTurn}
        onClear={handleClear}
        onSave={handleSave}
      />
    </div>
  );
}
