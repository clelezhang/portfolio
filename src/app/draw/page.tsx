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
  COLOR_PALETTES,
  DEFAULT_STROKE_SIZE,
  DEFAULT_GRID_SIZE,
  DEFAULT_DOT_SIZE,
  DEFAULT_PROMPT,
  AUTO_DRAW_DELAY,
  DEFAULT_PAN_SENSITIVITY,
  DEFAULT_ZOOM_SENSITIVITY,
} from './constants';

// Hooks
import { useZoomPan } from './hooks/useZoomPan';
import { useComments } from './hooks/useComments';

// Components
import { DrawToolbar, AnimationType } from './components/DrawToolbar';
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

  // Undo/redo state
  type DrawingSnapshot = {
    drawingElements: DrawingElement[];
    humanStrokes: HumanStroke[];
    humanAsciiChars: HumanAsciiChar[];
  };
  const [undoStack, setUndoStack] = useState<DrawingSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingSnapshot[]>([]);

  // History and state
  const [history, setHistory] = useState<Turn[]>([]);
  const [humanHasDrawn, setHumanHasDrawn] = useState(false);
  const [humanHasCommented, setHumanHasCommented] = useState(false);
  const [wish, setWish] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Tool state
  const [tool, setTool] = useState<Tool>('draw');
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeSize, setStrokeSize] = useState(DEFAULT_STROKE_SIZE);
  const [strokeColor, setStrokeColor] = useState<string>(COLOR_PALETTES[4][0]);
  const [paletteIndex, setPaletteIndex] = useState(4);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(true);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(768);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [drawMode, setDrawMode] = useState<DrawMode>('all');

  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);

  // Visual effects state
  const [distortionAmount, setDistortionAmount] = useState(4); // 0-30 range for displacement scale
  const [wiggleSpeed, setWiggleSpeed] = useState(168); // ms between frames (lower = faster)
  const [filterSeed, setFilterSeed] = useState(1);
  const [bounceIntensity, setBounceIntensity] = useState(1.0); // 0-2 range for animation bounce
  // Palette animation settings (fixed values)
  const animationType: AnimationType = 'slide';
  const slideDuration = 500; // ms
  const slideStagger = 30; // ms between each color
  const slideBounce = true; // enable bounce effect

  // Canvas options
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>('grid');
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [panSensitivity] = useState(DEFAULT_PAN_SENSITIVITY);
  const [zoomSensitivity] = useState(DEFAULT_ZOOM_SENSITIVITY);

  // Cursor position
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  // Refs
  const lastPoint = useRef<Point | null>(null);
  const lastAsciiPoint = useRef<Point | null>(null);
  const lastAsciiStrokeRef = useRef(false); // Remember last brush type for comment mode revert
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleYourTurnRef = useRef<() => void>(() => {});
  const commentDragStart = useRef<Point | null>(null); // Track drag start for comment mode

  // Use custom hooks
  const {
    zoom,
    pan,
    isPanning,
    startPan,
    doPan,
    stopPan,
    handleDoubleClick,
    screenToCanvas,
    canvasToScreen,
  } = useZoomPan({ containerRef, canvasRef, panSensitivity, zoomSensitivity });

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

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);
    setRedoStack([]); // Clear redo stack on new action
  }, [drawingElements, humanStrokes, humanAsciiChars]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    // Save current state to redo stack
    setRedoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);

    // Restore previous state
    const previousState = undoStack[undoStack.length - 1];
    setDrawingElements(previousState.drawingElements);
    setHumanStrokes(previousState.humanStrokes);
    setHumanAsciiChars(previousState.humanAsciiChars);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, drawingElements, humanStrokes, humanAsciiChars]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    // Save current state to undo stack
    setUndoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);

    // Restore next state
    const nextState = redoStack[redoStack.length - 1];
    setDrawingElements(nextState.drawingElements);
    setHumanStrokes(nextState.humanStrokes);
    setHumanAsciiChars(nextState.humanAsciiChars);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, drawingElements, humanStrokes, humanAsciiChars]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  // Wiggle animation - runs when distortion is visible
  useEffect(() => {
    if (distortionAmount === 0) return;
    const interval = setInterval(() => {
      setFilterSeed((prev) => (prev % 100) + 1);
    }, wiggleSpeed);
    return () => clearInterval(interval);
  }, [distortionAmount, wiggleSpeed]);

  // Track last brush type when in draw mode (for reverting from comment mode)
  useEffect(() => {
    if (tool === 'draw') {
      lastAsciiStrokeRef.current = asciiStroke;
    }
  }, [tool, asciiStroke]);

  // Set random initial brush color on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const palette = COLOR_PALETTES[0];
    setStrokeColor(palette[Math.floor(Math.random() * palette.length)]);
  }, []);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return screenToCanvas(e.touches[0].clientX, e.touches[0].clientY);
    }
    return screenToCanvas(e.clientX, e.clientY);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Save state for undo before starting a new stroke
    saveToUndoStack();

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
    if (humanHasDrawn || humanHasCommented) {
      newHistory.push({ who: 'human' });
    }

    const streamedBlocks: AsciiBlock[] = [];
    const streamedShapes: Shape[] = [];
    let claudeCommented = false;
    // Track streaming comment target
    let streamingCommentIndex: number | null = null;
    let streamingReplyTarget: number | null = null; // Index of comment being replied to

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
      // Use user's tool selection to determine Claude's draw mode
      const effectiveDrawMode = asciiStroke ? 'ascii' : 'shapes';
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          previousDrawings: asciiBlocks,
          history: newHistory,
          comments: comments.length > 0 ? comments : undefined,
          sayEnabled,
          temperature,
          maxTokens,
          prompt: prompt || undefined,
          streaming: true,
          drawMode: effectiveDrawMode,
          thinkingEnabled,
          thinkingBudget: 10000,
          // Palette info for Claude
          paletteColors: COLOR_PALETTES[paletteIndex],
          paletteIndex,
          totalPalettes: COLOR_PALETTES.length,
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
                // Legacy: full comment at once
                addComment(event.data.say, 'claude', event.data.sayX, event.data.sayY);
                claudeCommented = true;
              } else if (event.type === 'sayStart') {
                // Streaming: create comment with empty text and track index
                setComments((prev) => {
                  streamingCommentIndex = prev.length;
                  streamingReplyTarget = null;
                  return [...prev, { text: '', x: event.data.sayX, y: event.data.sayY, from: 'claude' as const }];
                });
                // Auto-open the new comment
                setOpenCommentIndex(comments.length);
                claudeCommented = true;
              } else if (event.type === 'replyStart') {
                // Streaming: create empty reply
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0) {
                  setComments((prev) => {
                    if (commentIndex >= prev.length) return prev;
                    streamingReplyTarget = commentIndex;
                    streamingCommentIndex = null;
                    const updated = [...prev];
                    updated[commentIndex] = {
                      ...updated[commentIndex],
                      replies: [...(updated[commentIndex].replies || []), { text: '', from: 'claude' as const }]
                    };
                    return updated;
                  });
                  claudeCommented = true;
                }
              } else if (event.type === 'sayChunk') {
                // Streaming: append text to the tracked target
                setComments((prev) => {
                  const updated = [...prev];
                  if (streamingReplyTarget !== null && streamingReplyTarget < updated.length) {
                    // Appending to a reply
                    const comment = updated[streamingReplyTarget];
                    if (comment.replies && comment.replies.length > 0) {
                      const lastReply = comment.replies[comment.replies.length - 1];
                      updated[streamingReplyTarget] = {
                        ...comment,
                        replies: [
                          ...comment.replies.slice(0, -1),
                          { ...lastReply, text: lastReply.text + event.data.text }
                        ]
                      };
                    }
                  } else if (streamingCommentIndex !== null && streamingCommentIndex < updated.length) {
                    // Appending to a new comment
                    updated[streamingCommentIndex] = {
                      ...updated[streamingCommentIndex],
                      text: updated[streamingCommentIndex].text + event.data.text
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'reply') {
                // Legacy: full reply at once
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0 && commentIndex < comments.length) {
                  addReplyToComment(commentIndex, event.data.text, 'claude');
                  claudeCommented = true;
                }
              } else if (event.type === 'wish') {
                setWish(event.data);
                console.log('claude wishes:', event.data);
              } else if (event.type === 'setPalette') {
                // Claude wants to change the palette - trigger animation
                const newIndex = event.data;
                if (typeof newIndex === 'number' && newIndex >= 0 && newIndex < COLOR_PALETTES.length) {
                  setPaletteIndex(newIndex);
                  setStrokeColor(COLOR_PALETTES[newIndex][0]);
                }
              } else if (event.type === 'done') {
                let description = '';
                if (streamedBlocks.length > 0) {
                  description += streamedBlocks.map((b) => b.block).join('\n---\n');
                }
                if (streamedShapes.length > 0) {
                  const shapeDesc = streamedShapes.map((s) => `${s.type}`).join(', ');
                  description += (description ? '\n' : '') + `[shapes: ${shapeDesc}]`;
                }
                if (claudeCommented) {
                  description += (description ? '\n' : '') + '[commented]';
                }
                // Record turn if Claude did anything (drew or commented)
                if (description) {
                  newHistory.push({ who: 'claude', description });
                  setHistory(newHistory);
                  setHumanHasDrawn(false);
                  setHumanHasCommented(false);
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
    setHumanHasCommented(true);
    // Trigger auto-draw on comment if enabled
    if (autoDrawEnabled) {
      triggerAutoDraw();
    }
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
          <filter id="wobbleFilter" filterUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="2"
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

      {/* Main content area */}
      <div className="draw-main">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="draw-canvas-container"
          style={{ cursor: isPanning ? 'grabbing' : 'none' }}
          onMouseDown={(e) => {
            // Don't start drawing if there's an open comment or comment input
            if (openCommentIndex !== null || commentInput !== null) {
              return;
            }
            if (e.button === 1) {
              startPan(e);
            } else if (tool === 'comment') {
              // Track drag start position - only switch to draw if user actually drags
              commentDragStart.current = { x: e.clientX, y: e.clientY };
            } else {
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
            } else if (tool === 'comment' && commentDragStart.current && !isDrawing) {
              // Check if user has dragged enough to switch to draw mode
              const dx = e.clientX - commentDragStart.current.x;
              const dy = e.clientY - commentDragStart.current.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance > 5) {
                // Switch to draw mode and start drawing
                setTool('draw');
                setAsciiStroke(lastAsciiStrokeRef.current);
                commentDragStart.current = null;
                startDrawing(e);
              }
            } else if (tool !== 'comment' || isDrawing) {
              draw(e);
            }
          }}
          onMouseUp={() => {
            commentDragStart.current = null;
            if (isPanning) {
              stopPan();
            } else if (tool !== 'comment' || isDrawing) {
              stopDrawing();
            }
          }}
          onMouseLeave={() => {
            setCursorPos(null);
            commentDragStart.current = null;
            if (isPanning) {
              stopPan();
            } else if (tool !== 'comment' || isDrawing) {
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
          {/* Transform wrapper for zoom/pan - filter applied here for entire canvas */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              backgroundColor: 'white',
              boxShadow: 'inset 0 0 0 1px #E5E5E5',
              ...(canvasBackground === 'grid' ? {
                backgroundImage: `
                  linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`,
              } : canvasBackground === 'dots' ? {
                backgroundImage: 'radial-gradient(circle, #e5e5e5 1.5px, transparent 1.5px)',
                backgroundSize: `${gridSize}px ${gridSize}px`,
              } : {}),
              ...(distortionAmount > 0 ? { filter: 'url(#wobbleFilter)' } : {}),
            }}
          >
            <canvas
              ref={canvasRef}
              className="touch-none w-full h-full"
            />

            {/* SVG layer for drawings */}
            <svg
              className="absolute inset-0"
              style={{
                width: '100%',
                height: '100%',
              }}
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
            onUserReply={(_index, text) => {
              setPendingMessages((prev) => [...prev, text]);
              setHumanHasCommented(true);
              if (autoDrawEnabled) {
                triggerAutoDraw();
              }
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
        <div className="absolute bottom-16 flex flex-col gap-2 justify-end right-3 bg-black/80 backdrop-blur-xl rounded-xl p-2 text-sm z-10 w-64 border border-white/10">
          {/* Draw Mode - tab bar */}
          <div className="flex text-xs bg-white/5 rounded-lg p-1 mb-1">
            {(['all', 'shapes', 'ascii'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDrawMode(mode)}
                className={`flex-1 py-1 rounded-md transition-all ${
                  drawMode === mode
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'shapes' ? 'Shapes' : 'ASCII'}
              </button>
            ))}
          </div>

          {/* Canvas Background - tab bar */}
          <div className="flex text-xs bg-white/5 rounded-lg p-1 mb-1">
            {(['none', 'grid', 'dots'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => {
                  setCanvasBackground(bg);
                  if (bg === 'grid') setGridSize(DEFAULT_GRID_SIZE);
                  else if (bg === 'dots') setGridSize(DEFAULT_DOT_SIZE);
                }}
                className={`flex-1 py-1 rounded-md transition-all ${
                  canvasBackground === bg
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {bg === 'none' ? 'None' : bg === 'grid' ? 'Grid' : 'Dots'}
              </button>
            ))}
          </div>
          {canvasBackground !== 'none' && (
            <input
              type="range"
              min="8"
              max="64"
              step="4"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full mb-3 draw-settings-slider"
            />
          )}

          {/* Checkboxes - all in one row */}
          <div className="flex items-center gap-4 mb-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={sayEnabled}
                onChange={(e) => setSayEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Comments</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={autoDrawEnabled}
                onChange={(e) => setAutoDrawEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Auto</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => {
                  setThinkingEnabled(e.target.checked);
                  if (e.target.checked) setShowThinkingPanel(true);
                }}
                className="draw-settings-checkbox"
              />
              <span>Thinking</span>
            </label>
          </div>

          {/* Sliders */}
          <div className="space-y-2 mb-1">
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Distortion</span>
                <span>{distortionAmount}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={distortionAmount}
                onChange={(e) => setDistortionAmount(parseInt(e.target.value))}
                className="w-full draw-settings-slider"
              />
            </div>
            {distortionAmount > 0 && (
              <div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>Wiggle</span>
                  <span>{wiggleSpeed}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={wiggleSpeed}
                  onChange={(e) => setWiggleSpeed(parseInt(e.target.value))}
                  className="w-full draw-settings-slider"
                />
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Temperature</span>
                <span>{temperature.toFixed(1)}</span>
              </div>
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
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Max tokens</span>
                <span>{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full draw-settings-slider"
              />
            </div>
          </div>

          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="System prompt..."
            className="w-full h-20 px-2 py-1.5 bg-white/10 rounded-lg text-xs text-white/90 placeholder-white/30 resize-none focus:outline-none focus:border-white/30"
          />

          {/* Copy settings button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const settings = {
                  drawMode,
                  canvasBackground,
                  gridSize,
                  sayEnabled,
                  autoDrawEnabled,
                  thinkingEnabled,
                  distortionAmount,
                  wiggleSpeed,
                  bounceIntensity,
                  temperature,
                  maxTokens,
                  panSensitivity,
                  zoomSensitivity,
                  prompt,
                };
                navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
              }}
              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title="Copy settings as JSON"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
              </svg>
            </button>
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
        animationType={animationType}
        slideDuration={slideDuration}
        slideStagger={slideStagger}
        slideBounce={slideBounce}
      />
    </div>
  );
}
