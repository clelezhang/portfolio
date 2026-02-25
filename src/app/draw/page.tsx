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
  UploadedImage,
  Comment as DrawComment,
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
  AUTO_DRAW_MIN_INTERVAL,
  DEFAULT_PAN_SENSITIVITY,
  DEFAULT_ZOOM_SENSITIVITY,
  DRAG_THRESHOLD,
  LOCALSTORAGE_DEBOUNCE_MS,
} from './constants';

// Storage key for localStorage persistence
const CANVAS_STORAGE_KEY = 'draw-canvas-state';

// Fallback loading messages (turn 1 only, before Claude has generated custom ones)
const FALLBACK_LOADING_MESSAGES = [
  'Contemplating ~ pixels . _~',
  'Calibrating imagination . o O @',
  'Negotiating with colors . . .',
  'Warming up creativity * * ~~-->',
  'Downloading inspiration _ / | \\ _',
];

// Toggle to disable custom cursors globally (set to false to disable)
const CUSTOM_CURSORS_ENABLED = true;

// Hooks
import { useZoomPan } from './hooks/useZoomPan';
import { useComments } from './hooks/useComments';
import { useClaudeAnimation } from './hooks/useClaudeAnimation';
import { useIsMobile } from './hooks/useIsMobile';

// Utils
import { simplifyPath } from './utils/simplifyPath';

// Components
import { DrawToolbar, AnimationType } from './components/DrawToolbar';
import { HeaderActions } from './components/HeaderActions';
import { DrawIconButton } from './components/DrawIconButton';
import { CustomCursor, CursorMode } from './components/CustomCursor';
import { ClaudePencilCursor } from './components/icons/claude-pencil-cursor';
import { ClaudeEraserCursor } from './components/icons/claude-eraser-cursor';
import { ClaudeAsciiCursor } from './components/icons/claude-ascii-cursor';
import { CommentSystem } from './components/CommentSystem';
import { CommentInput } from './components/CommentInput';
import { MobileToolbar, MobileToolbarMode } from './components/MobileToolbar';
import { MobileCommentInput } from './components/MobileCommentInput';
import { MobileCommentMorph } from './components/MobileCommentMorph';
import { ClaudeIcon } from './components/ClaudeIcon';

// Auth components
import { ApiKeyModal, DrawingsPanel } from './components/auth';
import { useUser, useDrawings, useUserSettings } from '@/lib/supabase/hooks';

// BaseUI provider (single instance for all tooltips)
import { BaseUIProvider } from '../components/StyletronProvider';

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnPoint = useRef<Point | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const turbulenceBtnRef = useRef<SVGFETurbulenceElement>(null);

  // Safari detection (client-side only to avoid hydration mismatch)
  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  // Add class to <html> for cursor hiding — avoids expensive :has() re-evaluation
  useEffect(() => {
    document.documentElement.classList.add('draw-active');
    return () => document.documentElement.classList.remove('draw-active');
  }, []);


  // Auth state
  const { user } = useUser();
  const { saveDrawing: saveToCloud } = useDrawings();
  const { settings: userSettings } = useUserSettings();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDrawingsPanel, setShowDrawingsPanel] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(FALLBACK_LOADING_MESSAGES[0]);
  const [claudePreview, setClaudePreview] = useState<string[] | null>(null); // whimsical loading messages from Claude's last turn
  const [asciiBlocks, setAsciiBlocks] = useState<AsciiBlock[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [humanAsciiChars, setHumanAsciiChars] = useState<HumanAsciiChar[]>([]);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const elementIdCounter = useRef(0);

  // Diff tracking for element-based API (saves tokens on non-sync turns)
  const [lastTurnElements, setLastTurnElements] = useState<DrawingElement[]>([]);

  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageDragOffset = useRef<Point | null>(null);
  const imageIdCounter = useRef(0);
  const lastClaudeCursorColor = useRef('#000');

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

  // Wrap setStrokeColor: switch to pen if currently erasing
  const handleSetStrokeColor = useCallback((color: string) => {
    setStrokeColor(color);
    setTool(prev => prev === 'erase' ? 'draw' : prev);
  }, []);

  // Mobile state
  const { isMobile } = useIsMobile();
  const [mobileToolbarMode, setMobileToolbarMode] = useState<MobileToolbarMode>('tools');
  const [mobileCommentSheetOpen, setMobileCommentSheetOpen] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(true);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(768);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [drawMode, setDrawMode] = useState<DrawMode>('all');

  // Auto temperature: 1.0 for first 3 turns, then 0.7
  const getEffectiveTemperature = (turnCount: number): number => {
    return turnCount <= 3 ? 1.0 : 0.7;
  };

  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);

  // Claude narration state
  type InteractionStyle = 'collaborative' | 'playful' | 'neutral';
  const [claudeReasoning, setClaudeReasoning] = useState('');
  const [claudeDrawing, setClaudeDrawing] = useState(''); // 3-6 word summary of what Claude is adding
  const [claudeDrawingAsciiColor, setClaudeDrawingAsciiColor] = useState<string | null>(null);
  const [interactionStyle, setInteractionStyle] = useState<InteractionStyle>('neutral');

  // Typewriter effect for header text
  const [displayedHeaderText, setDisplayedHeaderText] = useState("Let's draw together?");
  const headerTextTargetRef = useRef("Let's draw together?");
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Token tracking state
  type TokenUsage = { input_tokens: number; output_tokens: number };
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [sessionUsage, setSessionUsage] = useState<TokenUsage>({ input_tokens: 0, output_tokens: 0 });

  // Hybrid SVG mode state - reduces token costs by sending images only periodically
  type SyncContext = { observation: string; intention: string; turn: number };
  const [hybridModeEnabled, setHybridModeEnabled] = useState(true); // Enable by default for cost savings
  const [syncInterval, setSyncInterval] = useState(5); // Send image every N turns
  const [lastSyncTurn, setLastSyncTurn] = useState(0);
  const [lastSyncContext, setLastSyncContext] = useState<SyncContext | null>(null);
  const [simplifyEpsilon, setSimplifyEpsilon] = useState(2); // Path simplification tolerance

  // Visual effects state
  const [distortionAmount, setDistortionAmount] = useState(2); // 0-30 range for displacement scale
  const [wiggleSpeed, setWiggleSpeed] = useState(270); // ms between frames (lower = faster)
  const [bounceIntensity, setBounceIntensity] = useState(1.0); // 0-2 range for animation bounce
  // Palette animation settings (fixed values)
  const animationType: AnimationType = 'spring';
  const slideDuration = 700; // ms
  const slideStagger = 30; // ms between each color
  const slideBounce = true; // enable bounce effect

  // Canvas options
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>('grid');
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [panSensitivity] = useState(DEFAULT_PAN_SENSITIVITY);
  const [zoomSensitivity] = useState(DEFAULT_ZOOM_SENSITIVITY);

  // Cursor tracking — ref-based to avoid re-rendering entire component on every mouse move
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isHoveringCommentInput, setIsHoveringCommentInput] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isOnCanvas, setIsOnCanvas] = useState(false);

  // Test mode for cursor animation debugging
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1.5); // 0.5x to 3x speed multiplier

  // UI visibility toggles (hidden by default)
  const [showSelectTool, setShowSelectTool] = useState(false);
  const [showReactButton, setShowReactButton] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(false);

  // Prompt is now mood-aware by default (BASE_PROMPT in route.ts)

  // Refs
  const lastPoint = useRef<Point | null>(null);
  const lastAsciiPoint = useRef<Point | null>(null);
  const lastAsciiStrokeRef = useRef(false); // Remember last brush type for comment mode revert

  // Wrapper for setAsciiStroke that also updates the ref (avoids useEffect anti-pattern)
  const handleSetAsciiStroke = useCallback((value: boolean) => {
    setAsciiStroke(value);
    // Only remember when in draw mode (tool check happens at call site)
    lastAsciiStrokeRef.current = value;
  }, []);
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoDrawTimeRef = useRef<number>(0);
  const handleYourTurnRef = useRef<() => void>(() => {});
  const commentDragStart = useRef<Point | null>(null); // Track drag start for comment mode
  const [spaceHeld, setSpaceHeld] = useState(false); // Hold space to pan (Figma-style)



  // Capture the full canvas (background + all drawings) as an image
  // Optimized: scales down large images and uses JPEG for smaller payload
  const captureFullCanvas = useCallback(async (): Promise<string> => {
    const container = containerRef.current;
    if (!container) return '';

    // Find the SVG element
    const svg = container.querySelector('svg');
    if (!svg) return '';

    // Get dimensions and calculate scale (max 1200px on longest side)
    const rect = container.getBoundingClientRect();
    const origWidth = rect.width;
    const origHeight = rect.height;
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(origWidth, origHeight));
    const width = Math.round(origWidth * scale);
    const height = Math.round(origHeight * scale);

    // Create temp canvas at scaled size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    // Scale context for drawing
    ctx.scale(scale, scale);

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, origWidth, origHeight);

    // Draw grid/dots pattern if enabled (at original scale, will be scaled by context)
    if (canvasBackground === 'grid') {
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      for (let x = 0; x <= origWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, origHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= origHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(origWidth, y);
        ctx.stroke();
      }
    } else if (canvasBackground === 'dots') {
      ctx.fillStyle = '#e5e5e5';
      for (let x = 0; x <= origWidth; x += gridSize) {
        for (let y = 0; y <= origHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Serialize SVG and draw to canvas
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('width', String(origWidth));
    svgClone.setAttribute('height', String(origHeight));

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);
        // Use JPEG at 0.7 quality for smaller payload (saves ~60% vs PNG)
        resolve(tempCanvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve('');
      };
      img.src = svgUrl;
    });
  }, [canvasBackground, gridSize]);


  // Use custom hooks
  const {
    zoom,
    pan,
    isPanning,
    isTouchGesture,
    startPan,
    doPan,
    stopPan,
    handleTouchStart: handleZoomPanTouchStart,
    handleTouchMove: handleZoomPanTouchMove,
    handleTouchEnd: handleZoomPanTouchEnd,
    handleDoubleClick,
    screenToCanvas,
    canvasToScreen,
  } = useZoomPan({ containerRef, canvasRef, panSensitivity, zoomSensitivity });

  const {
    claudeCursorPos,
    claudeIsDrawing,
    animatingShape,
    animatingAscii,
    enqueueShape,
    enqueueAscii,
    processClaudeAnimationQueue,
    finishClaudeAnimation,
    runTestShapes,
  } = useClaudeAnimation({ animationSpeed, setDrawingElements, setAsciiBlocks, elementIdCounter });

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
    saveComment,
    dismissComment,
  } = useComments({ canvasRef, lastDrawnPoint });

  // Reset hover state when comment input closes (form unmounts before onMouseLeave fires)
  useEffect(() => {
    if (!commentInput) setIsHoveringCommentInput(false);
  }, [commentInput]);

  // Compute cursor mode from state — priority order determines which cursor shows
  const cursorMode: CursorMode = (() => {
    if (isTouch) return 'user'; // fallback, cursor hidden on touch anyway
    if (isPanning) return 'grabbing';
    if (spaceHeld) return 'grab';
    if (hoveredCommentIndex !== null || isHoveringCommentInput) return 'user';
    if (isOnCanvas && tool !== 'select') {
      if (tool === 'comment') return 'comment';
      if (tool === 'erase') return 'eraser';
      if (tool === 'draw') return asciiStroke ? 'ascii' : 'pencil';
    }
    if (isHoveringInteractive) return 'pointer';
    return 'user';
  })();

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

  // Keyboard shortcuts
  const STROKE_SIZES = [2, 6, 12] as const;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      // Ignore key repeats (e.g. holding space)
      if (e.repeat) return;

      const mod = e.metaKey || e.ctrlKey;

      // Undo/Redo: Cmd+Z / Cmd+Shift+Z / Cmd+Y
      if (mod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }
      if (mod && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Skip remaining shortcuts if modifier held (avoid conflicts)
      if (mod) return;

      // Hold space to pan (Figma-style)
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        // Tools: D=draw, A=ascii, E=eraser, C=comment
        case 'd':
          setTool('draw');
          setAsciiStroke(false);
          break;
        case 'a':
          setTool('draw');
          setAsciiStroke(true);
          break;
        case 'e':
          setTool('erase');
          break;
        case 'c':
          setTool('comment');
          break;

        // Stroke size: [ = smaller, ] = bigger
        case '[': {
          const idx = STROKE_SIZES.indexOf(strokeSize as 2 | 6 | 12);
          if (idx > 0) setStrokeSize(STROKE_SIZES[idx - 1]);
          break;
        }
        case ']': {
          const idx = STROKE_SIZES.indexOf(strokeSize as 2 | 6 | 12);
          if (idx < STROKE_SIZES.length - 1) setStrokeSize(STROKE_SIZES[idx + 1]);
          break;
        }

        // Palette: X = cycle to next palette
        case 'x':
          setPaletteIndex((paletteIndex + 1) % COLOR_PALETTES.length);
          setStrokeColor(COLOR_PALETTES[(paletteIndex + 1) % COLOR_PALETTES.length][0]);
          break;

        // Color: 1-4 = pick color from current palette
        case '1': case '2': case '3': case '4': {
          const colorIdx = parseInt(key) - 1;
          setStrokeColor(COLOR_PALETTES[paletteIndex][colorIdx]);
          break;
        }

        // Reset zoom/pan: 0
        case '0':
          handleDoubleClick();
          break;

        default:
          break;
      }

      // Enter: Claude's turn (not lowercased — e.key is 'Enter')
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) handleYourTurnRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpaceHeld(false);
        stopPan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, strokeSize, paletteIndex, isLoading, handleDoubleClick, stopPan]);

  // Cycle through loading messages (Claude-generated from last turn, or fallbacks)
  useEffect(() => {
    const custom = claudePreview && claudePreview.length > 0 ? claudePreview : [];
    // Mix in fallbacks if we have few custom messages to avoid repetition
    const pool = custom.length === 0
      ? FALLBACK_LOADING_MESSAGES
      : custom.length <= 4
        ? [...custom, ...FALLBACK_LOADING_MESSAGES]
        : custom;
    const pickRandom = () => pool[Math.floor(Math.random() * pool.length)];
    if (!isLoading) {
      setLoadingMessage(pickRandom());
      return;
    }
    setLoadingMessage(pickRandom());
    const interval = setInterval(() => {
      setLoadingMessage(pickRandom());
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, claudePreview]);

  // Typewriter effect for header text
  const typewriterFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Determine target text
    const targetText = isLoading
      ? (claudeDrawing || loadingMessage)
      : (claudeDrawing || "Let's draw together?");

    // If target hasn't changed, do nothing
    if (targetText === headerTextTargetRef.current) return;

    // Cancel any in-flight animation
    if (typewriterFrameRef.current) cancelAnimationFrame(typewriterFrameRef.current);
    if (typewriterRef.current) clearTimeout(typewriterRef.current);

    headerTextTargetRef.current = targetText;

    // Clear old text immediately
    setDisplayedHeaderText('');

    // Defer typewriter start so the clear actually paints first
    typewriterFrameRef.current = requestAnimationFrame(() => {
      const words = targetText.split(' ');
      let currentWordIndex = 1;

      // Show first word
      setDisplayedHeaderText(words[0] || '');

      if (words.length > 1) {
        const showNextWord = () => {
          currentWordIndex++;
          setDisplayedHeaderText(words.slice(0, currentWordIndex).join(' '));

          if (currentWordIndex < words.length) {
            const delay = 50 + Math.random() * 100;
            typewriterRef.current = setTimeout(showNextWord, delay);
          }
        };

        const delay = 50 + Math.random() * 100;
        typewriterRef.current = setTimeout(showNextWord, delay);
      }
    });
  }, [isLoading, claudeDrawing, loadingMessage]);

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

    // Human ASCII chars and Claude's blocks are now rendered as SVG <text> elements
  }, [shapes]);

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

  // Track tab visibility to pause wiggle when not visible
  const [isTabVisible, setIsTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Wiggle animation - uses direct DOM manipulation to avoid React re-renders
  // Safari: no wiggle animation (just static distortion for performance)
  // Chrome: full wiggle animation
  useEffect(() => {
    if (isSafari || distortionAmount === 0 || !isTabVisible) return;

    let seed = 1;
    const interval = setInterval(() => {
      seed = (seed % 100) + 1;
      turbulenceRef.current?.setAttribute('seed', String(seed));
      turbulenceBtnRef.current?.setAttribute('seed', String(seed));
    }, wiggleSpeed);
    return () => clearInterval(interval);
  }, [distortionAmount, wiggleSpeed, isTabVisible, isSafari]);

  // Set random initial brush color on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const randomPaletteIndex = Math.floor(Math.random() * COLOR_PALETTES.length);
    const palette = COLOR_PALETTES[randomPaletteIndex];
    setPaletteIndex(randomPaletteIndex);
    setStrokeColor(palette[Math.floor(Math.random() * palette.length)]);
  }, []);

  // Load saved canvas state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.drawingElements) setDrawingElements(state.drawingElements);
        if (state.humanStrokes) setHumanStrokes(state.humanStrokes);
        if (state.humanAsciiChars) setHumanAsciiChars(state.humanAsciiChars);
        if (state.asciiBlocks) setAsciiBlocks(state.asciiBlocks);
        if (state.shapes) setShapes(state.shapes);
        if (state.images) setImages(state.images);
        // Restore ID counters to avoid duplicates
        if (state.elementIdCounter) elementIdCounter.current = state.elementIdCounter;
        if (state.imageIdCounter) imageIdCounter.current = state.imageIdCounter;
      }
    } catch (e) {
      console.error('Failed to load canvas state:', e);
    }
  }, []);

  // Save canvas state to localStorage when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const baseState = {
        drawingElements,
        humanStrokes,
        humanAsciiChars,
        asciiBlocks,
        shapes,
        elementIdCounter: elementIdCounter.current,
        imageIdCounter: imageIdCounter.current,
      };

      // Try to save with images first
      try {
        const stateWithImages = { ...baseState, images };
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(stateWithImages));
      } catch (e) {
        // If quota exceeded, try saving without images (they're large base64 strings)
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, saving without images');
          try {
            localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(baseState));
          } catch (e2) {
            console.error('Failed to save canvas state even without images:', e2);
          }
        } else {
          console.error('Failed to save canvas state:', e);
        }
      }
    }, LOCALSTORAGE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [drawingElements, humanStrokes, humanAsciiChars, asciiBlocks, shapes, images]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return screenToCanvas(e.touches[0].clientX, e.touches[0].clientY);
    }
    return screenToCanvas(e.clientX, e.clientY);
  }, [screenToCanvas]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Save state for undo before starting a new stroke
    saveToUndoStack();

    setIsDrawing(true);
    setHumanHasDrawn(true);
    const point = getPoint(e);
    lastPoint.current = point;
    lastAsciiPoint.current = point;

    if (tool === 'erase' || tool === 'draw') {
      // Always track the path (needed for API to know where user drew)
      setCurrentStroke({
        d: `M ${point.x} ${point.y}`,
        color: tool === 'erase' ? '#000000' : strokeColor,
        strokeWidth: tool === 'erase' ? strokeSize * 5 : strokeSize,
        isAsciiBacking: asciiStroke, // Mark ASCII backing strokes so we don't render them
        isEraser: tool === 'erase',
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    const point = getPoint(e);
    if (!point) return;

    if (tool === 'erase' || tool === 'draw') {
      // Always update the path (needed for API)
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: `${prev.d} L ${point.x} ${point.y}`,
      } : null);
    }

    // Place ASCII chars if in ASCII mode
    if (asciiStroke) {
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
    if (currentStroke && !currentStroke.d.includes('L')) {
      // Single click with no movement - add a tiny segment to make a dot
      currentStroke.d += ` L ${lastPoint.current!.x + 0.1} ${lastPoint.current!.y + 0.1}`;
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

  // Compute diff for element-based API (diff-only format)
  type TrackedElement = {
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
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    block?: string;
    turnCreated: number;
  };

  type ElementDiff = {
    created: TrackedElement[];
    modified: { id: string; changes: Partial<TrackedElement> }[];
    deleted: string[];
  };

  const computeDiff = useCallback((currentTurn: number): { elements: TrackedElement[]; diff: ElementDiff } => {
    const lastIds = new Set(lastTurnElements.map(e => e.id));

    // Convert DrawingElements to TrackedElements with simplified paths
    const elements: TrackedElement[] = drawingElements
      .filter(e => e.source === 'human' && e.type === 'stroke')
      .map(e => {
        const stroke = e.data as HumanStroke;
        return {
          id: e.id,
          source: 'human' as const,
          type: 'stroke' as const,
          d: simplifyPath(stroke.d, simplifyEpsilon), // Simplify for token efficiency
          color: stroke.color,
          strokeWidth: stroke.strokeWidth,
          turnCreated: currentTurn,
        };
      });

    // Find newly created elements (in current but not in last turn)
    const created = elements.filter(e => !lastIds.has(e.id));

    // Find deleted elements (in last turn but not in current)
    const currentIds = new Set(elements.map(e => e.id));
    const deleted = lastTurnElements
      .filter(e => e.source === 'human' && !currentIds.has(e.id))
      .map(e => e.id);

    return {
      elements,
      diff: { created, modified: [], deleted },
    };
  }, [drawingElements, lastTurnElements, simplifyEpsilon]);

  // Helper: returns true if we should handle drawing events
  // Either we're in a drawing tool mode OR we're actively mid-stroke
  const shouldHandleDrawing = useCallback(() => {
    return (tool !== 'comment' && tool !== 'select') || isDrawing;
  }, [tool, isDrawing]);

  const handleYourTurn = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);
    if (thinkingEnabled) {
      setThinkingText('');
    }
    // Clear previous narration
    setClaudeReasoning('');
    setClaudeDrawing('');
    setClaudeDrawingAsciiColor(null);

    const newHistory = [...history];
    if (humanHasDrawn || humanHasCommented) {
      newHistory.push({ who: 'human' });
    }

    // Calculate current turn number for hybrid mode
    const currentTurnNumber = newHistory.filter(t => t.who === 'claude').length + 1;

    // Determine if this is a sync turn (send image) for hybrid mode
    // Sync on: turn 1, or every syncInterval turns after last sync
    const isSyncTurn = currentTurnNumber === 1 || (currentTurnNumber - lastSyncTurn) >= syncInterval;
    if (isSyncTurn && hybridModeEnabled) {
      setLastSyncTurn(currentTurnNumber);
    }

    const streamedBlocks: AsciiBlock[] = [];
    const streamedShapes: Shape[] = [];
    let claudeCommented = false;
    // Track streaming comment target
    let streamingCommentIndex: number | null = null;
    let streamingReplyTarget: number | null = null; // Index of comment being replied to


    try {
      // Capture the full canvas with all drawings (human + Claude)
      const image = await captureFullCanvas();
      if (!image) {
        throw new Error('Failed to capture canvas');
      }
      // Use user's tool selection to determine Claude's draw mode
      // When user uses pen, Claude gets all tools (shapes + ASCII)
      const effectiveDrawMode = asciiStroke ? 'ascii' : 'all';
      const container = containerRef.current;
      const containerRect = container?.getBoundingClientRect();

      let response: Response;

      if (hybridModeEnabled) {
        // HYBRID MODE: Use merged /api/draw with element tracking
        // Compute diff to only send new strokes (saves ~18% tokens on non-sync turns)
        const { elements, diff } = computeDiff(currentTurnNumber);

        // Save current elements for next turn's diff computation
        setLastTurnElements(drawingElements.filter(e => e.source === 'human'));

        response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Element tracking params
            elements,
            diff: diff.created.length > 0 || diff.deleted.length > 0 ? diff : undefined,
            format: 'diff-only',
            // Image only on sync turns
            image: isSyncTurn ? image : undefined,
            // Standard draw params
            canvasWidth: containerRect?.width || canvas.width,
            canvasHeight: containerRect?.height || canvas.height,
            history: newHistory,
            comments: comments.length > 0 ? comments : undefined,
            sayEnabled,
            temperature: getEffectiveTemperature(newHistory.length),
            turnCount: currentTurnNumber,
            maxTokens,
            prompt: prompt !== DEFAULT_PROMPT ? prompt : undefined,
            streaming: true,
            drawMode: effectiveDrawMode,
            thinkingEnabled,
            thinkingBudget: 10000,
            model: 'opus',
            paletteColors: COLOR_PALETTES[paletteIndex],
            paletteIndex,
            totalPalettes: COLOR_PALETTES.length,
            userApiKey: userSettings?.anthropic_api_key || undefined,
          }),
        });
      } else {
        // ORIGINAL MODE: Send image every turn
        response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: containerRect?.width || canvas.width,
            canvasHeight: containerRect?.height || canvas.height,
            history: newHistory,
            comments: comments.length > 0 ? comments : undefined,
            sayEnabled,
            temperature: getEffectiveTemperature(newHistory.length),
            turnCount: newHistory.length,
            maxTokens,
            prompt: prompt !== DEFAULT_PROMPT ? prompt : undefined,
            streaming: true,
            drawMode: effectiveDrawMode,
            thinkingEnabled,
            thinkingBudget: 10000,
            model: 'opus',
            paletteColors: COLOR_PALETTES[paletteIndex],
            paletteIndex,
            totalPalettes: COLOR_PALETTES.length,
            userApiKey: userSettings?.anthropic_api_key || undefined,
          }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Draw API error (${response.status}):`, errorBody);
        throw new Error(`Failed to get response (${response.status}): ${errorBody}`);
      }

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
              } else if (event.type === 'narration') {
                // Streaming text narration from Claude (observation, intention, interactionStyle as prose)
                // This is displayed in real-time, structured fields are parsed at the end
                setClaudeReasoning((prev) => (prev || '') + event.data);
              } else if (event.type === 'block') {
                // Queue ASCII block for cursor animation
                streamedBlocks.push(event.data);
                enqueueAscii(event.data as AsciiBlock);
                processClaudeAnimationQueue();
              } else if (event.type === 'shape') {
                // Don't add to shapes immediately - let animation reveal it
                streamedShapes.push(event.data);
                // Queue shape for cursor animation with progressive reveal
                // Shape will be added to drawingElements after animation completes
                enqueueShape(event.data as Shape);
                processClaudeAnimationQueue();
              } else if (event.type === 'say') {
                // Full comment from tool call
                if (event.data.replyTo) {
                  // Reply to existing comment
                  const commentIndex = event.data.replyTo - 1;
                  if (commentIndex >= 0 && commentIndex < comments.length) {
                    addReplyToComment(commentIndex, event.data.text, 'claude');
                    claudeCommented = true;
                  }
                } else if (event.data.sayX !== undefined && event.data.sayY !== undefined) {
                  // New comment at position
                  addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
                  claudeCommented = true;
                }
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
              } else if (event.type === 'dismiss') {
                // Claude dismissed a comment (1-indexed)
                const commentIndex = event.data.index - 1;
                if (commentIndex >= 0) {
                  dismissComment(commentIndex);
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
              } else if (event.type === 'reasoning') {
                // Claude's thinking process (without API thinking)
                setClaudeReasoning(event.data);
              } else if (event.type === 'drawing') {
                // 3-6 word summary of what Claude is adding
                console.log('[DEBUG] drawing event received:', event.data);
                setClaudeDrawing(event.data);
              } else if (event.type === 'drawingAsciiColor') {
                console.log('[DEBUG] asciiColor event received:', event.data);
                setClaudeDrawingAsciiColor(event.data);
              } else if (event.type === 'interactionStyle') {
                // Detected interaction style (collaborative, playful, neutral)
                setInteractionStyle(event.data);
              } else if (event.type === 'preview') {
                // Next-turn loading message teaser from Claude
                setClaudePreview(event.data);
              } else if (event.type === 'usage') {
                // Track token usage (sent as separate event from API)
                setLastUsage({ input_tokens: event.input_tokens, output_tokens: event.output_tokens });
                setSessionUsage(prev => ({
                  input_tokens: prev.input_tokens + (event.input_tokens || 0),
                  output_tokens: prev.output_tokens + (event.output_tokens || 0),
                }));
              } else if (event.type === 'done') {
                // Done event - usage already handled above
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
                  newHistory.push({
                    who: 'claude',
                    description,
                    // Include actual shapes/blocks for continuity (used in interaction style detection)
                    shapes: streamedShapes.length > 0 ? [...streamedShapes] : undefined,
                    blocks: streamedBlocks.length > 0 ? [...streamedBlocks] : undefined,
                  });
                  setHistory(newHistory);
                  setHumanHasDrawn(false);
                  setHumanHasCommented(false);
                }


                // Stream complete - hide cursor after animations finish
                finishClaudeAnimation();
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
    setClaudePreview(null);
    setImages([]);
    setSelectedImageId(null);
    lastDrawnPoint.current = null;
    // Clear localStorage
    localStorage.removeItem(CANVAS_STORAGE_KEY);
    localStorage.removeItem('draw-comments');
    // Reset ID counters
    elementIdCounter.current = 0;
    imageIdCounter.current = 0;
    // Reset hybrid mode state
    setLastSyncTurn(0);
    setLastSyncContext(null);
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

  // Save drawing to cloud
  const handleSaveToCloud = async (name: string, existingId?: string) => {
    const thumbnail = await captureFullCanvas();
    const data = {
      drawingElements,
      comments,
      history,
      paletteIndex,
      strokeColor,
    };
    await saveToCloud(name, data, thumbnail || undefined, existingId);
    if (existingId) {
      setCurrentDrawingId(existingId);
    }
  };

  // Load drawing from cloud
  const handleLoadFromCloud = (data: Record<string, unknown>) => {
    if (data.drawingElements) {
      setDrawingElements(data.drawingElements as DrawingElement[]);
    }
    if (data.comments) {
      setComments(data.comments as typeof comments);
    }
    if (data.history) {
      setHistory(data.history as Turn[]);
    }
    if (typeof data.paletteIndex === 'number') {
      setPaletteIndex(data.paletteIndex);
    }
    if (typeof data.strokeColor === 'string') {
      setStrokeColor(data.strokeColor);
    }
    // Clear other state
    setHumanStrokes([]);
    setHumanAsciiChars([]);
    setAsciiBlocks([]);
    setShapes([]);
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
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
  }, [openCommentIndex, commentInput, hoveredCommentIndex, tool, getPoint]);

  const triggerAutoDraw = useCallback(() => {
    if (autoDrawTimeoutRef.current) {
      clearTimeout(autoDrawTimeoutRef.current);
    }
    // Check minimum interval since last auto-draw
    const timeSinceLastAutoDraw = Date.now() - lastAutoDrawTimeRef.current;
    if (timeSinceLastAutoDraw < AUTO_DRAW_MIN_INTERVAL) {
      return; // Too soon, don't trigger
    }
    autoDrawTimeoutRef.current = setTimeout(() => {
      lastAutoDrawTimeRef.current = Date.now();
      handleYourTurnRef.current();
    }, AUTO_DRAW_DELAY);
  }, []);

  // Lightweight comment-only API call — no canvas capture by default.
  // If Claude signals needsCanvas, a second call is made with the image + draw tool.
  // Accepts optional updatedComments to avoid stale closure (React state not yet updated)
  const handleCommentResponse = useCallback(async (updatedComments?: DrawComment[]) => {
    const commentsToSend = updatedComments || comments;
    let streamingTarget: number | null = null;
    let needsCanvas = false;

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentOnly: true,
          canvasWidth: containerRef.current?.getBoundingClientRect().width || 800,
          canvasHeight: containerRef.current?.getBoundingClientRect().height || 600,
          history: history.length > 0 ? history : undefined,
          comments: commentsToSend.length > 0 ? commentsToSend : undefined,
          streaming: true,
          model: 'opus',
          userApiKey: userSettings?.anthropic_api_key || undefined,
        }),
      });

      if (!response.ok) return;
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'replyStart') {
              let targetIdx: number | undefined;
              if (event.data.replyTo) {
                targetIdx = event.data.replyTo - 1;
              } else if (event.data.replyToLast) {
                targetIdx = commentsToSend.map((c, i) => ({ c, i })).filter(({ c }) => c.from === 'human').pop()?.i;
              }
              if (targetIdx !== undefined && targetIdx >= 0) {
                streamingTarget = targetIdx;
                setComments((prev) => {
                  if (targetIdx >= prev.length) return prev;
                  const updated = [...prev];
                  updated[targetIdx] = {
                    ...updated[targetIdx],
                    replies: [...(updated[targetIdx].replies || []), { text: '', from: 'claude' as const }],
                    status: 'temp',
                    tempStartedAt: Date.now(),
                  };
                  return updated;
                });
                setOpenCommentIndex(targetIdx);
              }
            } else if (event.type === 'sayChunk' && streamingTarget !== null) {
              const target = streamingTarget;
              setComments((prev) => {
                if (target >= prev.length) return prev;
                const comment = prev[target];
                if (!comment.replies || comment.replies.length === 0) return prev;
                const lastReply = comment.replies[comment.replies.length - 1];
                const updated = [...prev];
                updated[target] = {
                  ...comment,
                  replies: [
                    ...comment.replies.slice(0, -1),
                    { ...lastReply, text: lastReply.text + event.data.text },
                  ],
                };
                return updated;
              });
            } else if (event.type === 'say') {
              if (event.data.replyTo) {
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0) {
                  addReplyToComment(commentIndex, event.data.text, 'claude');
                  setOpenCommentIndex(commentIndex);
                }
              } else if (event.data.replyToLast) {
                const lastHumanIdx = commentsToSend.map((c, i) => ({ c, i })).filter(({ c }) => c.from === 'human').pop()?.i;
                if (lastHumanIdx !== undefined) {
                  addReplyToComment(lastHumanIdx, event.data.text, 'claude');
                  setOpenCommentIndex(lastHumanIdx);
                }
              } else if (event.data.sayX !== undefined && event.data.sayY !== undefined) {
                addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
              }
            } else if (event.type === 'dismiss') {
              const commentIndex = event.data.index - 1;
              if (commentIndex >= 0) {
                dismissComment(commentIndex);
              }
            } else if (event.type === 'needsCanvas') {
              needsCanvas = true;
            }
          } catch { /* skip parse errors */ }
        }
      }

      // Second call: Claude requested the canvas — capture image and call with draw tool
      if (needsCanvas) {
        handleCommentDrawResponse(commentsToSend);
      }
    } catch (error) {
      console.error('Comment response error:', error);
    }
  }, [history, comments, userSettings, addComment, addReplyToComment, setOpenCommentIndex, setComments, dismissComment]);

  // Second-stage call: comment triggered drawing — captures canvas and sends with draw tool
  const handleCommentDrawResponse = useCallback(async (commentsToSend: DrawComment[]) => {
    const streamedShapes: Shape[] = [];
    const streamedBlocks: AsciiBlock[] = [];

    const image = await captureFullCanvas();
    if (!image) return;

    const container = containerRef.current;
    const containerRect = container?.getBoundingClientRect();
    setIsLoading(true);

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentOnly: true,
          image,
          canvasWidth: containerRect?.width || 800,
          canvasHeight: containerRect?.height || 600,
          history: history.length > 0 ? history : undefined,
          comments: commentsToSend.length > 0 ? commentsToSend : undefined,
          sayEnabled: true,
          streaming: true,
          model: 'opus',
          paletteColors: COLOR_PALETTES[paletteIndex],
          paletteIndex,
          totalPalettes: COLOR_PALETTES.length,
          turnCount: history.filter(t => t.who === 'claude').length + 1,
          userApiKey: userSettings?.anthropic_api_key || undefined,
        }),
      });

      if (!response.ok) { setIsLoading(false); return; }
      const reader = response.body?.getReader();
      if (!reader) { setIsLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'shape') {
              streamedShapes.push(event.data);
              enqueueShape(event.data as Shape);
              processClaudeAnimationQueue();
            } else if (event.type === 'block') {
              streamedBlocks.push(event.data);
              enqueueAscii(event.data as AsciiBlock);
              processClaudeAnimationQueue();
            } else if (event.type === 'say' && event.data.text) {
              if (event.data.replyTo) {
                addReplyToComment(event.data.replyTo - 1, event.data.text, 'claude');
              } else if (event.data.sayX !== undefined) {
                addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
              }
            } else if (event.type === 'dismiss') {
              const commentIndex = event.data.index - 1;
              if (commentIndex >= 0) dismissComment(commentIndex);
            } else if (event.type === 'drawing') {
              setClaudeDrawing(event.data);
            } else if (event.type === 'done') {
              if (streamedShapes.length > 0 || streamedBlocks.length > 0) {
                setHistory(prev => [...prev, {
                  who: 'claude' as const,
                  description: '[comment-triggered drawing]',
                  shapes: streamedShapes.length > 0 ? [...streamedShapes] : undefined,
                  blocks: streamedBlocks.length > 0 ? [...streamedBlocks] : undefined,
                }]);
                finishClaudeAnimation();
              }
              setIsLoading(false);
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch (error) {
      console.error('Comment draw response error:', error);
      setIsLoading(false);
    }
  }, [history, userSettings, captureFullCanvas, paletteIndex, addComment, addReplyToComment, dismissComment, enqueueShape, enqueueAscii, processClaudeAnimationQueue, finishClaudeAnimation, setClaudeDrawing, setIsLoading, setHistory]);

  const handleCommentSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !commentInput) return;
    const newComment: DrawComment = { text: commentText.trim(), x: commentInput.x, y: commentInput.y, from: 'human' };
    addComment(newComment.text, 'human', newComment.x, newComment.y);
    // Don't clear commentInput/commentText here — let CommentInput animate out first,
    // then onCancel (handleCommentCancel) will clean up
    setHumanHasCommented(true);
    handleCommentResponse([...comments, newComment]);
  }, [commentText, commentInput, addComment, handleCommentResponse, comments]);

  // Image upload handler
  const handleImageUpload = useCallback((file: File, dropPoint?: Point) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const id = `img-${imageIdCounter.current++}`;
        // Scale image to fit reasonably on canvas (max 400px wide/tall)
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width *= scale;
          height *= scale;
        }
        // Position at drop point or center of canvas
        const canvas = canvasRef.current;
        const x = dropPoint?.x ?? (canvas ? canvas.width / 2 - width / 2 : 100);
        const y = dropPoint?.y ?? (canvas ? canvas.height / 2 - height / 2 : 100);
        setImages(prev => [...prev, { id, src, x, y, width, height }]);
        setSelectedImageId(id);
        setTool('select');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag-drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      const dropPoint = screenToCanvas(e.clientX, e.clientY);
      handleImageUpload(imageFile, dropPoint);
    }
  }, [handleImageUpload, screenToCanvas]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
            e.preventDefault();
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);

  // Image selection and dragging
  const handleImageMouseDown = useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelectedImageId(imageId);
    setIsDraggingImage(true);
    const point = screenToCanvas(e.clientX, e.clientY);
    const image = images.find(img => img.id === imageId);
    if (image) {
      imageDragOffset.current = { x: point.x - image.x, y: point.y - image.y };
    }
  }, [tool, images, screenToCanvas]);

  const handleImageDrag = useCallback((e: React.MouseEvent) => {
    if (!isDraggingImage || !selectedImageId || !imageDragOffset.current) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    const offset = imageDragOffset.current; // Capture before state update
    setImages(prev => prev.map(img =>
      img.id === selectedImageId
        ? { ...img, x: point.x - offset.x, y: point.y - offset.y }
        : img
    ));
  }, [isDraggingImage, selectedImageId, screenToCanvas]);

  const handleImageMouseUp = useCallback(() => {
    setIsDraggingImage(false);
    imageDragOffset.current = null;
  }, []);

  // Pre-compute eraser mask levels for order-respecting erasure
  // Each non-eraser element is only erased by erasers that come AFTER it in temporal order
  const eraserStrokesForMask: { id: string; data: HumanStroke }[] = [];
  const elementMaskLevel = new Map<string, number>();
  for (const el of drawingElements) {
    if (el.type === 'stroke' && (el.data as HumanStroke).isEraser) {
      eraserStrokesForMask.push({ id: el.id, data: el.data as HumanStroke });
    } else {
      elementMaskLevel.set(el.id, eraserStrokesForMask.length);
    }
  }
  const totalErasers = eraserStrokesForMask.length;
  const hasActiveEraser = !!currentStroke?.isEraser;
  const needsEraserMasks = totalErasers > 0 || hasActiveEraser;

  return (
    <BaseUIProvider>
    <div
      className={`draw-page ${isPanning ? 'is-panning' : ''}`}
      onMouseMove={(e) => {
        if (CUSTOM_CURSORS_ENABLED) {
          // Position cursor via DOM ref — avoids re-rendering entire component
          const el = cursorRef.current;
          if (el) {
            el.style.left = e.clientX + 'px';
            el.style.top = e.clientY + 'px';
            el.style.display = '';
          }
          // Detect if hovering an interactive element (button, link, label, [role=button])
          const target = e.target as HTMLElement;
          const interactive = target.closest('button, a, label, [role="button"], .cursor-pointer, input[type="range"]');
          setIsHoveringInteractive(interactive !== null);
        }
      }}
      onMouseLeave={() => {
        if (CUSTOM_CURSORS_ENABLED) {
          const el = cursorRef.current;
          if (el) el.style.display = 'none';
        }
      }}
    >
      {/* Header bar */}
      <header className="draw-header">
        <div className="draw-header-left">
          <ClaudeIcon
            size={32}
            isLoading={isLoading}
            onClick={handleYourTurn}
            disabled={isLoading}
          />
          <span className={`draw-header-text${isLoading && !claudeDrawing ? ' draw-header-text--loading' : ''}`}>
            {(() => {
              const text = displayedHeaderText.replace(/[a-zA-Z]/, c => c.toUpperCase());
              // Only apply ASCII color styling for drawing info, not loading or default
              if (!claudeDrawing) return text;
              // Use Claude's chosen color, or fall back to first palette color
              const asciiColor = claudeDrawingAsciiColor || COLOR_PALETTES[paletteIndex][0];
              // Split into runs of ASCII art vs normal text
              return text.split(/([a-zA-Z][a-zA-Z']*(?:\s+[a-zA-Z][a-zA-Z']*)*)/).map((part, i) =>
                /^[a-zA-Z]/.test(part)
                  ? <span key={i}>{part}</span>
                  : <span key={i} className="draw-header-ascii" style={{ color: asciiColor }}>{part}</span>
              );
            })()}
          </span>
        </div>
        <div className="draw-header-right">
          {/* User icon */}
          <DrawIconButton
            icon="user-icon"
            onClick={() => {}}
            tooltip="User"
            tooltipPlacement="bottom"
            size="sm"
          />
          <HeaderActions onClear={handleClear} onSave={handleSave} />
        </div>
      </header>

      {/* SVG filter definitions - Safari uses lower complexity for better perf */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          {/* Main filter - used for canvas/strokes (and everything on Chrome) */}
          <filter id="wobbleFilter" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              ref={turbulenceRef}
              type="turbulence"
              baseFrequency={isSafari ? "0.02" : "0.03"}
              numOctaves={isSafari ? 1 : 2}
              seed="1"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={isSafari ? distortionAmount * 3.5 : distortionAmount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          {/* Safari stroke filter - has dilate to prevent white edge bleeding */}
          {isSafari && (
            <filter id="wobbleFilterStroke" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.02"
                numOctaves={1}
                seed="1"
                result="noise"
              />
              <feMorphology in="SourceGraphic" operator="dilate" radius="1" result="dilated" />
              <feDisplacementMap
                in="dilated"
                in2="noise"
                scale={distortionAmount * 3.5}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          )}
          {/* Grid-only filter for Safari - lower distortion, no dilate (would hide thin lines) */}
          <filter id="wobbleFilterGrid" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={1}
              seed="1"
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
          {/* Button filter - uses Chrome-like settings on all browsers so Safari
              buttons don't get the aggressive 3.5x canvas scale */}
          <filter id="wobbleFilterBtn" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              ref={turbulenceBtnRef}
              type="turbulence"
              baseFrequency="0.03"
              numOctaves={2}
              seed="1"
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
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseDown={(e) => {
            // Don't start drawing if there's an open comment or comment input
            if (openCommentIndex !== null || commentInput !== null) {
              return;
            }
            if (e.button === 1 || spaceHeld) {
              startPan(e);
            } else if (tool === 'select') {
              // Deselect image if clicking on empty space (image clicks are handled separately)
              setSelectedImageId(null);
            } else if (tool === 'comment') {
              // Track drag start position - only switch to draw if user actually drags
              commentDragStart.current = { x: e.clientX, y: e.clientY };
            } else {
              startDrawing(e);
            }
          }}
          onMouseEnter={() => { setIsOnCanvas(true); }}
          onMouseMove={(e) => {
            setIsTouch(false); // Switch back to mouse mode
            if (isPanning) {
              doPan(e);
            } else if (isDraggingImage) {
              handleImageDrag(e);
            } else if (tool === 'comment' && commentDragStart.current && !isDrawing) {
              // Check if user has dragged enough to switch to draw mode
              const dx = e.clientX - commentDragStart.current.x;
              const dy = e.clientY - commentDragStart.current.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance > DRAG_THRESHOLD) {
                // Switch to draw mode and start drawing
                setTool('draw');
                setAsciiStroke(lastAsciiStrokeRef.current);
                commentDragStart.current = null;
                startDrawing(e);
              }
            } else if (shouldHandleDrawing()) {
              draw(e);
            }
          }}
          onMouseUp={() => {
            commentDragStart.current = null;
            handleImageMouseUp();
            if (isPanning) {
              stopPan();
            } else if (shouldHandleDrawing()) {
              stopDrawing();
            }
          }}
          onMouseLeave={() => {
            setIsOnCanvas(false);
            commentDragStart.current = null;
            handleImageMouseUp();
            if (isPanning) {
              stopPan();
            } else if (shouldHandleDrawing()) {
              stopDrawing();
            }
          }}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onTouchStart={(e) => {
            setIsTouch(true); // Switch to touch mode - hide custom cursor
            // Always check for multi-touch first
            handleZoomPanTouchStart(e);
            // Single finger: draw (unless in comment/select mode or gesture in progress)
            if (e.touches.length === 1 && tool !== 'comment' && tool !== 'select' && !isTouchGesture) {
              startDrawing(e);
            }
          }}
          onTouchMove={(e) => {
            // Always update gesture tracking
            handleZoomPanTouchMove(e);
            // Single finger drawing (only if not in gesture mode and not select tool)
            if (e.touches.length === 1 && tool !== 'comment' && tool !== 'select' && !isTouchGesture) {
              draw(e);
            }
          }}
          onTouchEnd={(e) => {
            handleZoomPanTouchEnd(e);
            if (tool === 'comment') {
              // Comment mode: place comment on tap
              if (e.changedTouches.length === 1 && !isTouchGesture) {
                const touch = e.changedTouches[0];
                const point = screenToCanvas(touch.clientX, touch.clientY);
                setCommentInput({ x: point.x, y: point.y });
                setCommentText('');
              }
            } else if (tool !== 'select' && !isTouchGesture) {
              stopDrawing();
            }
          }}
        >
          {/* Transform wrapper for zoom/pan */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: isPanning || isTouchGesture ? 'transform' : 'auto',
              contain: 'layout style paint',
            }}
          >
            {/* Chrome: Single container with wiggle animation */}
            {/* Safari: Separate containers - grid with low distortion, strokes with high distortion */}

            {/* Background/Grid layer - Safari gets separate lower-distortion filter */}
            <div
              className="absolute inset-0"
              style={{
                ...(distortionAmount > 0 && !isPanning && !isTouchGesture ? {
                  filter: isSafari ? 'url(#wobbleFilterGrid)' : 'url(#wobbleFilter)',
                  willChange: 'filter',
                  transform: 'translateZ(0)',
                } : {}),
              }}
            >
              <div
                className="absolute inset-0"
                style={{
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
                }}
              />
            </div>

            {/* Canvas + Strokes layer - Chrome uses container filter, Safari uses per-element filters */}
            <div
              className="absolute inset-0"
              style={{
                ...(distortionAmount > 0 && !isPanning && !isTouchGesture && !isSafari ? {
                  filter: 'url(#wobbleFilter)',
                  willChange: 'filter',
                  transform: 'translateZ(0)',
                } : {}),
              }}
            >
              {/* Canvas layer */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 touch-none w-full h-full"
              />

              {/* SVG layer for drawings */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: '100%',
                  height: '100%',
                }}
              >
              {/* Eraser masks: level-based so each element is only erased by later erasers */}
              {needsEraserMasks && (
                <defs>
                  {Array.from({ length: (hasActiveEraser ? totalErasers + 1 : totalErasers) }, (_, level) => (
                    <mask key={level} id={`eraser-mask-${level}`} maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">
                      <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
                      {eraserStrokesForMask.slice(level).map(({ id, data: s }) => (
                        <path key={id} d={s.d} stroke="black" strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      ))}
                      {hasActiveEraser && (
                        <path d={currentStroke!.d} stroke="black" strokeWidth={currentStroke!.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </mask>
                  ))}
                </defs>
              )}
              {/* Sort: back-layer shapes first, then rest in order */}
              {[...drawingElements].sort((a, b) => {
                const aBack = a.type === 'shape' && (a.data as Shape).layer === 'back' ? 0 : 1;
                const bBack = b.type === 'shape' && (b.data as Shape).layer === 'back' ? 0 : 1;
                return aBack - bBack;
              }).map((element) => {
                // Compute per-element eraser mask based on temporal order
                const level = elementMaskLevel.get(element.id) ?? totalErasers;
                const maxLevel = totalErasers + (hasActiveEraser ? 1 : 0);
                const eraserMask = needsEraserMasks && level < maxLevel
                  ? `url(#eraser-mask-${level})` : undefined;

                if (element.type === 'stroke') {
                  const stroke = element.data as HumanStroke;
                  // Don't render ASCII backing strokes or eraser strokes (erasers are in the mask)
                  if (stroke.isAsciiBacking || stroke.isEraser) return null;
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
                      mask={eraserMask}
                      filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined}
                    />
                  );
                }
                const shape = element.data as Shape;
                const safariStrokeFilter = isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined;
                if (shape.type === 'path' && shape.d) {
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
                      d={shape.d}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
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
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'ellipse' && shape.cx !== undefined && shape.cy !== undefined && shape.rx !== undefined && shape.ry !== undefined) {
                  return (
                    <ellipse
                      key={element.id}
                      className="draw-stroke"
                      cx={shape.cx}
                      cy={shape.cy}
                      rx={shape.rx}
                      ry={shape.ry}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
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
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
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
                      stroke={shape.color || shape.fill || '#000000'}
                      strokeWidth={shape.strokeWidth || 2}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
                  const pointsStr = shape.points.map(p => `${p[0]},${p[1]}`).join(' ');
                  return (
                    <polygon
                      key={element.id}
                      className="draw-stroke"
                      points={pointsStr}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
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
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                return null;
              })}
              {/* Currently animating Claude shape with progressive reveal */}
              {animatingShape && (() => {
                const { shape, progress } = animatingShape;
                // Use pathLength="1" to normalize, then dashoffset from 1→0 reveals stroke
                // Use fill color for animation stroke when no explicit stroke color
                const animStroke = shape.color || shape.fill || '#000000';
                const commonProps = {
                  stroke: animStroke,
                  strokeWidth: shape.strokeWidth || 2,
                  fill: 'none', // Don't fill during animation
                  strokeLinecap: 'round' as const,
                  strokeLinejoin: 'round' as const,
                  pathLength: 1,
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - progress, // 1 = hidden, 0 = fully revealed
                  filter: isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined,
                };

                if (shape.type === 'path' && shape.d) {
                  return <path key="animating" d={shape.d} {...commonProps} />;
                }
                if (shape.type === 'erase' && shape.d) {
                  // Erase strokes - show as semi-transparent during animation
                  return <path key="animating" d={shape.d} {...commonProps} stroke="rgba(255,200,200,0.5)" />;
                }
                if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
                  return <circle key="animating" cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />;
                }
                if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
                  return <rect key="animating" x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />;
                }
                if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
                  return <line key="animating" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...commonProps} />;
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
                  return <path key="animating" d={d} {...commonProps} />;
                }
                return null;
              })()}
              {currentStroke && !currentStroke.isAsciiBacking && !currentStroke.isEraser && (
                <path
                  d={currentStroke.d}
                  stroke={currentStroke.color}
                  strokeWidth={currentStroke.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined}
                />
              )}
              {/* Human ASCII chars as SVG text elements */}
              {humanAsciiChars.map((charData, i) => (
                <text
                  key={`human-ascii-${i}`}
                  x={charData.x}
                  y={charData.y}
                  fill={charData.color}
                  fontFamily="monospace"
                  fontSize={charData.fontSize}
                  className="draw-stroke"
                  mask={needsEraserMasks ? 'url(#eraser-mask-0)' : undefined}
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilter)' : undefined}
                >
                  {charData.char}
                </text>
              ))}
              {/* Claude's ASCII blocks as SVG text elements */}
              {asciiBlocks.map((block, i) => (
                <text
                  key={`block-${i}`}
                  x={block.x}
                  y={block.y}
                  fill={block.color || '#3b82f6'}
                  fontFamily="monospace"
                  fontSize={16}
                  className="draw-stroke"
                  mask={needsEraserMasks ? 'url(#eraser-mask-0)' : undefined}
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilter)' : undefined}
                >
                  {block.block.split('\n').map((line, lineIdx) => (
                    <tspan
                      key={lineIdx}
                      x={block.x}
                      dy={lineIdx === 0 ? 0 : 18}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
            </svg>
            </div>
            {/* End canvas/strokes container */}

            {/* Images layer - on top, no distortion filter */}
            {images.map((img) => (
              <div
                key={img.id}
                className={`absolute ${tool !== 'select' ? 'pointer-events-none' : ''} ${selectedImageId === img.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: img.x,
                  top: img.y,
                  width: img.width,
                  height: img.height,
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            ))}

            {/* Claude's cursor - rendered inside transform wrapper at canvas coordinates */}
            {/* Uses inline SVG components with "opus" label, same style as user cursors */}
            {CUSTOM_CURSORS_ENABLED && claudeCursorPos && (
              <div
                className="absolute pointer-events-none"
                style={{
                  // Position at canvas coordinates
                  // All Claude cursors have hotspot at (3, 3)
                  left: claudeCursorPos.x - 3,
                  top: claudeCursorPos.y - 3,
                  zIndex: 50,
                  // Counter-scale to keep cursor at consistent size regardless of zoom
                  transform: `scale(${1 / zoom})`,
                  transformOrigin: '3px 3px',
                  filter: 'drop-shadow(0px 0.5px 2px rgba(0, 0, 0, 0.25))',
                }}
              >
                {animatingAscii ? (
                  <ClaudeAsciiCursor />
                ) : animatingShape?.shape.type === 'erase' ? (
                  <ClaudeEraserCursor />
                ) : (
                  <ClaudePencilCursor color={(() => {
                    const c = animatingShape?.shape.color || animatingShape?.shape.fill;
                    if (c) lastClaudeCursorColor.current = c;
                    return lastClaudeCursorColor.current;
                  })()} />
                )}
              </div>
            )}
          </div>

          {/* Custom cursor removed from here — now rendered at page level */}


          {/* Comment system */}
          {!isMobile && (
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
              onUserReply={(_index, _text) => {
                setHumanHasCommented(true);
                // Trigger comment-only response (no drawing)
                handleCommentResponse();
              }}
              saveComment={saveComment}
              dismissComment={dismissComment}
              isDrawing={isDrawing}
            />
          )}

          {/* Comment input - desktop */}
          {!isMobile && commentInput && (
            <CommentInput
              position={commentInput}
              screenPosition={canvasToScreen(commentInput.x, commentInput.y)}
              commentText={commentText}
              setCommentText={setCommentText}
              strokeColor={strokeColor}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
              onMouseEnterBubble={() => setIsHoveringCommentInput(true)}
              onMouseLeaveBubble={() => setIsHoveringCommentInput(false)}
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
                <p className="text-xs text-gray-400 italic">{loadingMessage}</p>
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

          {/* Architecture info */}
          <div className="mb-3 p-2 bg-white/5 rounded-lg text-xs text-white/60">
            <div className="font-medium text-white/80 mb-1">Prompting</div>
            <div className="space-y-0.5">
              {hybridModeEnabled ? (
                <>
                  <div><span className="text-green-400">Hybrid</span> mode active</div>
                  <div>→ Image sync every {syncInterval} turns</div>
                  <div>→ SVG paths between syncs</div>
                  <div>→ Context preserved across turns</div>
                </>
              ) : (
                <>
                  <div><span className="text-purple-400">Opus</span> sees canvas image directly</div>
                  <div>→ Reads mood (calm, chaotic, playful...)</div>
                  <div>→ Matches energy in response</div>
                  <div>→ Switches palettes for right colors</div>
                </>
              )}
            </div>
          </div>

          {/* Checkboxes - main settings */}
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

          {/* UI visibility toggles */}
          <div className="flex items-center gap-4 mb-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showSelectTool}
                onChange={(e) => setShowSelectTool(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Select</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showReactButton}
                onChange={(e) => setShowReactButton(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>React</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showDownloadButton}
                onChange={(e) => setShowDownloadButton(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Download</span>
            </label>
          </div>

          {/* Hybrid Mode Settings - Token Cost Optimization */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white text-xs">
                <input
                  type="checkbox"
                  checked={hybridModeEnabled}
                  onChange={(e) => setHybridModeEnabled(e.target.checked)}
                  className="draw-settings-checkbox"
                />
                <span>Hybrid Mode</span>
              </label>
              <span className="text-[10px] text-green-400/70">~55% token savings</span>
            </div>
            {hybridModeEnabled && (
              <>
                <div className="text-[10px] text-white/40 mb-2">
                  Sends images every {syncInterval} turns, SVG paths between syncs
                </div>
                <div>
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Sync interval</span>
                    <span>every {syncInterval} turns</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                    className="w-full draw-settings-slider"
                  />
                </div>
                {lastSyncContext && (
                  <div className="mt-2 p-1.5 bg-blue-500/10 rounded text-[10px] text-blue-300/70">
                    Context from turn {lastSyncContext.turn}: &ldquo;{lastSyncContext.observation?.slice(0, 40)}...&rdquo;
                  </div>
                )}
              </>
            )}
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

          {/* Token Usage */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="text-xs text-white/50 mb-1">Token Usage</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-[10px]">Last request</div>
                {lastUsage ? (
                  <>
                    <div className="text-white/70">↓ {lastUsage.input_tokens.toLocaleString()}</div>
                    <div className="text-white/70">↑ {lastUsage.output_tokens.toLocaleString()}</div>
                  </>
                ) : (
                  <div className="text-white/30">—</div>
                )}
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-[10px]">Session total</div>
                <div className="text-white/70">↓ {sessionUsage.input_tokens.toLocaleString()}</div>
                <div className="text-white/70">↑ {sessionUsage.output_tokens.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Cursor Test Controls */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">Cursor Animation Test</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
                <input
                  type="checkbox"
                  checked={testModeEnabled}
                  onChange={(e) => setTestModeEnabled(e.target.checked)}
                  className="draw-settings-checkbox"
                />
                <span className="text-xs">Enabled</span>
              </label>
            </div>
            {testModeEnabled && (
              <>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Speed</span>
                    <span>{animationSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.25"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full draw-settings-slider"
                  />
                </div>
                <button
                  onClick={runTestShapes}
                  disabled={claudeIsDrawing}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                    claudeIsDrawing
                      ? 'bg-white/10 text-white/30'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {claudeIsDrawing ? 'Drawing...' : 'Run Test Shapes'}
                </button>
              </>
            )}
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
      {isMobile ? (
        <MobileToolbar
          tool={tool}
          setTool={setTool}
          asciiStroke={asciiStroke}
          setAsciiStroke={handleSetAsciiStroke}
          strokeColor={strokeColor}
          setStrokeColor={handleSetStrokeColor}
          strokeSize={strokeSize}
          setStrokeSize={setStrokeSize}
          paletteIndex={paletteIndex}
          setPaletteIndex={setPaletteIndex}
          mode={mobileToolbarMode}
          setMode={setMobileToolbarMode}
        />
      ) : (
        <DrawToolbar
          tool={tool}
          setTool={setTool}
          asciiStroke={asciiStroke}
          setAsciiStroke={handleSetAsciiStroke}
          strokeColor={strokeColor}
          setStrokeColor={handleSetStrokeColor}
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
          showSelectTool={showSelectTool}
          showReactButton={showReactButton}
          showDownloadButton={showDownloadButton}
        />
      )}

      {/* Settings button - bottom right (hidden on mobile) */}
      {!isMobile && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`absolute bottom-4 right-4 z-30 draw-header-icon-btn ${showSettings ? 'draw-header-icon-btn--active' : ''}`}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      )}

      {/* Mobile comment system */}
      {isMobile && (
        <>
          <MobileCommentMorph
            isOpen={mobileCommentSheetOpen}
            onToggle={() => setMobileCommentSheetOpen(true)}
            onClose={() => setMobileCommentSheetOpen(false)}
            comments={comments}
            replyingToIndex={replyingToIndex}
            setReplyingToIndex={setReplyingToIndex}
            replyText={replyText}
            setReplyText={setReplyText}
            addReplyToComment={addReplyToComment}
            deleteComment={deleteComment}
            onUserReply={(_index: number, _text: string) => {
              setHumanHasCommented(true);
              // Trigger comment-only response (no drawing)
              handleCommentResponse();
            }}
          />
          {commentInput && (
            <MobileCommentInput
              commentText={commentText}
              setCommentText={setCommentText}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
            />
          )}
        </>
      )}

      {/* Auth modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
      <DrawingsPanel
        isOpen={showDrawingsPanel}
        onClose={() => setShowDrawingsPanel(false)}
        onLoad={handleLoadFromCloud}
        onSave={handleSaveToCloud}
        currentDrawingId={currentDrawingId}
      />

      {/* Page-level custom cursor — renders all cursor types as React SVG components */}
      {CUSTOM_CURSORS_ENABLED && !isTouch && (
        <CustomCursor
          ref={cursorRef}
          mode={cursorMode}
          strokeColor={strokeColor}
        />
      )}
    </div>
    </BaseUIProvider>
  );
}
