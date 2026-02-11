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
  CURSOR_HIDE_CHECK_INTERVAL_MS,
} from './constants';

// Storage key for localStorage persistence
const CANVAS_STORAGE_KEY = 'draw-canvas-state';


// Hooks
import { useZoomPan } from './hooks/useZoomPan';
import { useComments } from './hooks/useComments';

// Utils
import { simplifyPath } from './utils/simplifyPath';

// Components
import { DrawToolbar, AnimationType } from './components/DrawToolbar';
import { CustomCursor } from './components/CustomCursor';
import { PencilCursor } from './components/icons/PencilCursor';
import { EraserCursor } from './components/icons/EraserCursor';
import { AsciiCursor } from './components/icons/AsciiCursor';
import { CommentSystem } from './components/CommentSystem';
import { CommentInput } from './components/CommentInput';

// Auth components
import { UserMenu, ApiKeyModal, DrawingsPanel } from './components/auth';
import { useUser, useDrawings, useUserSettings } from '@/lib/supabase/hooks';

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnPoint = useRef<Point | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);

  // Safari detection (client-side only to avoid hydration mismatch)
  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
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

  // Auto temperature: 1.0 for first 3 turns, then 0.7
  const getEffectiveTemperature = (turnCount: number): number => {
    return turnCount <= 3 ? 1.0 : 0.7;
  };

  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);

  // Claude narration state - what Claude sees and intends
  type InteractionStyle = 'collaborative' | 'playful' | 'neutral';
  const [claudeReasoning, setClaudeReasoning] = useState('');
  const [claudeObservation, setClaudeObservation] = useState('');
  const [claudeIntention, setClaudeIntention] = useState('');
  const [interactionStyle, setInteractionStyle] = useState<InteractionStyle>('neutral');

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
  const [isTouch, setIsTouch] = useState(false);

  // Claude cursor state
  const [claudeCursorPos, setClaudeCursorPos] = useState<Point | null>(null);
  const [claudeIsDrawing, setClaudeIsDrawing] = useState(false);
  // Queue can contain shapes or ASCII blocks
  type AnimationItem =
    | { type: 'shape'; shape: Shape; id: string }
    | { type: 'ascii'; block: AsciiBlock; id: string };
  const claudeAnimationQueue = useRef<AnimationItem[]>([]);
  const isAnimatingClaude = useRef(false);
  const claudeLastEndPoint = useRef<Point | null>(null);

  // Currently animating shape (for progressive reveal)
  const [animatingShape, setAnimatingShape] = useState<{ shape: Shape; id: string; progress: number } | null>(null);

  // Currently animating ASCII block
  const [animatingAscii, setAnimatingAscii] = useState<AsciiBlock | null>(null);

  // Claude's current drawing color (for cursor)
  const [claudeCurrentColor, setClaudeCurrentColor] = useState<string>('#3b82f6');

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

  // Interpolate points along a quadratic bezier curve
  const quadraticBezier = useCallback((p0: Point, p1: Point, p2: Point, t: number): Point => {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    };
  }, []);

  // Interpolate points along a cubic bezier curve
  const cubicBezier = useCallback((p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
  }, []);

  // Parse SVG path d attribute into array of points (with curve interpolation)
  const parsePathToPoints = useCallback((d: string): Point[] => {
    const points: Point[] = [];
    const regex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    let match;
    let currentX = 0;
    let currentY = 0;
    let startX = 0; // Track path start for Z command
    let startY = 0;
    const CURVE_STEPS = 16; // Number of points to sample along curves

    while ((match = regex.exec(d)) !== null) {
      const command = match[1];
      const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);

      switch (command) {
        case 'M': // Move to absolute
          currentX = args[0];
          currentY = args[1];
          startX = currentX; // Remember start for Z
          startY = currentY;
          points.push({ x: currentX, y: currentY });
          break;
        case 'm': // Move to relative
          currentX += args[0];
          currentY += args[1];
          startX = currentX; // Remember start for Z
          startY = currentY;
          points.push({ x: currentX, y: currentY });
          break;
        case 'L': // Line to absolute
          currentX = args[0];
          currentY = args[1];
          points.push({ x: currentX, y: currentY });
          break;
        case 'l': // Line to relative
          currentX += args[0];
          currentY += args[1];
          points.push({ x: currentX, y: currentY });
          break;
        case 'H': // Horizontal line absolute
          currentX = args[0];
          points.push({ x: currentX, y: currentY });
          break;
        case 'h': // Horizontal line relative
          currentX += args[0];
          points.push({ x: currentX, y: currentY });
          break;
        case 'V': // Vertical line absolute
          currentY = args[0];
          points.push({ x: currentX, y: currentY });
          break;
        case 'v': // Vertical line relative
          currentY += args[0];
          points.push({ x: currentX, y: currentY });
          break;
        case 'Q': { // Quadratic curve absolute - interpolate along curve
          const p0 = { x: currentX, y: currentY };
          const p1 = { x: args[0], y: args[1] }; // control point
          const p2 = { x: args[2], y: args[3] }; // end point
          for (let i = 1; i <= CURVE_STEPS; i++) {
            points.push(quadraticBezier(p0, p1, p2, i / CURVE_STEPS));
          }
          currentX = args[2];
          currentY = args[3];
          break;
        }
        case 'C': { // Cubic curve absolute - interpolate along curve
          const p0 = { x: currentX, y: currentY };
          const p1 = { x: args[0], y: args[1] }; // control point 1
          const p2 = { x: args[2], y: args[3] }; // control point 2
          const p3 = { x: args[4], y: args[5] }; // end point
          for (let i = 1; i <= CURVE_STEPS; i++) {
            points.push(cubicBezier(p0, p1, p2, p3, i / CURVE_STEPS));
          }
          currentX = args[4];
          currentY = args[5];
          break;
        }
        case 'Z': // Close path - line back to start
        case 'z':
          if (currentX !== startX || currentY !== startY) {
            points.push({ x: startX, y: startY });
            currentX = startX;
            currentY = startY;
          }
          break;
        default:
          // For other commands, try to extract any coordinate pairs
          for (let i = 0; i < args.length - 1; i += 2) {
            if (!isNaN(args[i]) && !isNaN(args[i + 1])) {
              points.push({ x: args[i], y: args[i + 1] });
            }
          }
      }
    }
    return points;
  }, [quadraticBezier, cubicBezier]);

  // Extract points from a shape for cursor animation
  const getShapePoints = useCallback((shape: Shape): Point[] => {
    switch (shape.type) {
      case 'path':
      case 'erase':
        if (shape.d) return parsePathToPoints(shape.d);
        break;
      case 'line':
        if (shape.x1 !== undefined && shape.y1 !== undefined &&
            shape.x2 !== undefined && shape.y2 !== undefined) {
          return [
            { x: shape.x1, y: shape.y1 },
            { x: shape.x2, y: shape.y2 }
          ];
        }
        break;
      case 'circle':
        if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
          // Generate points around the circle
          const points: Point[] = [];
          const steps = 32;
          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            points.push({
              x: shape.cx + Math.cos(angle) * shape.r,
              y: shape.cy + Math.sin(angle) * shape.r
            });
          }
          return points;
        }
        break;
      case 'rect':
        if (shape.x !== undefined && shape.y !== undefined &&
            shape.width !== undefined && shape.height !== undefined) {
          return [
            { x: shape.x, y: shape.y },
            { x: shape.x + shape.width, y: shape.y },
            { x: shape.x + shape.width, y: shape.y + shape.height },
            { x: shape.x, y: shape.y + shape.height },
            { x: shape.x, y: shape.y } // close the rect
          ];
        }
        break;
      case 'curve':
        if (shape.points && shape.points.length >= 2) {
          return shape.points.map(p => ({ x: p[0], y: p[1] }));
        }
        break;
    }
    return [];
  }, [parsePathToPoints]);

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

  // Calculate total path length from points
  const calculatePathLength = useCallback((points: Point[]): number => {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }, []);

  // Easing function for natural motion - slow start, fast middle, slow end
  const easeInOutCubic = useCallback((t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }, []);

  // Simple noise function for organic movement
  const noise = useCallback((seed: number): number => {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }, []);

  // Calculate direction change at a point (0 = straight, 1 = sharp turn)
  const getDirectionChange = useCallback((points: Point[], index: number): number => {
    if (index <= 0 || index >= points.length - 1) return 0;
    const prev = points[index - 1];
    const curr = points[index];
    const next = points[index + 1];

    // Vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    // Normalize
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 < 0.001 || len2 < 0.001) return 0;

    // Dot product gives cos(angle)
    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    // Convert to 0-1 range where 1 = sharp turn
    return (1 - Math.max(-1, Math.min(1, dot))) / 2;
  }, []);

  // Animate Claude's cursor along points with progress callback
  const animateClaudeCursor = useCallback(async (
    points: Point[],
    onProgress?: (progress: number) => void
  ) => {
    if (points.length === 0) return;

    // Calculate duration based on path length for consistent speed
    // Base speed: ~300 pixels per second, adjusted by animationSpeed
    const pathLength = calculatePathLength(points);
    const baseSpeed = 300; // pixels per second
    const baseDuration = Math.min(3000, Math.max(300, (pathLength / baseSpeed) * 1000));
    const duration = baseDuration / animationSpeed;
    const startTime = performance.now();

    // Pre-calculate direction changes for variable speed
    const directionChanges = points.map((_, i) => getDirectionChange(points, i));

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(1, elapsed / duration);
        // Apply easing for natural motion - slow start, fast middle, slow end
        const easedProgress = easeInOutCubic(linearProgress);

        // Handle edge case: single point or empty array
        if (points.length <= 1) {
          if (points.length === 1) {
            setClaudeCursorPos(points[0]);
          }
          onProgress?.(easedProgress);
          if (linearProgress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
          return;
        }

        // Add subtle speed variation based on position along path
        // Slow down slightly at corners/direction changes
        const pointIndex = Math.min(
          Math.floor(easedProgress * (points.length - 1)),
          points.length - 2
        );

        // Subtle slowdown at sharp turns (reduced effect)
        const turnSlowdown = directionChanges[pointIndex] * 0.1;
        const adjustedProgress = easedProgress * (1 - turnSlowdown * 0.2);

        const finalPointIndex = Math.min(
          Math.floor(adjustedProgress * (points.length - 1)),
          points.length - 2
        );
        const pointProgress = (adjustedProgress * (points.length - 1)) % 1;

        const p1 = points[finalPointIndex];
        const p2 = points[finalPointIndex + 1];

        // Safety check
        if (p1 && p2) {
          // Variable tremor - more at slow parts, less when moving fast
          const time = currentTime * 0.008;
          const speed = Math.abs(easedProgress - (linearProgress > 0.01 ? easeInOutCubic(linearProgress - 0.01) : 0));
          const baseTremor = 0.6 + noise(time * 0.5) * 0.8; // Varies 0.6-1.4px
          const speedFactor = Math.max(0.3, 1 - speed * 50); // Less tremor when moving fast
          const tremor = baseTremor * speedFactor;

          // Multi-frequency noise for more organic feel
          const jitterX = (noise(time) - 0.5) * tremor + (noise(time * 2.7) - 0.5) * tremor * 0.3;
          const jitterY = (noise(time + 100) - 0.5) * tremor + (noise(time * 2.7 + 100) - 0.5) * tremor * 0.3;

          setClaudeCursorPos({
            x: p1.x + (p2.x - p1.x) * pointProgress + jitterX,
            y: p1.y + (p2.y - p1.y) * pointProgress + jitterY
          });
        } else if (p1) {
          setClaudeCursorPos(p1);
        }

        onProgress?.(easedProgress);

        if (linearProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }, [animationSpeed, calculatePathLength, easeInOutCubic, noise, getDirectionChange]);

  // Animate cursor gliding from one point to another (for transitions between shapes)
  const animateCursorGlide = useCallback(async (from: Point, to: Point) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // For short distances (typical ASCII spacing), snap with brief delay for streaming feel
    if (distance < 25) {
      setClaudeCursorPos(to);
      // Small delay to create visible streaming effect
      await new Promise(resolve => setTimeout(resolve, 15 / animationSpeed));
      return;
    }

    // Only animate for longer jumps (between words/lines or shapes)
    // Medium distances: quick, Long distances: up to 400ms
    const duration = Math.min(400, Math.max(30, (distance - 25) * 1.2)) / animationSpeed;
    const startTime = performance.now();

    // Random arc direction (perpendicular to travel direction)
    const perpX = -dy / (distance || 1);
    const perpY = dx / (distance || 1);

    // Scale arc height with distance - no arc for short hops, bigger arc for longer jumps
    // Under 30px: minimal/no arc, 30-100px: small arc, 100+px: full arc
    const arcScale = Math.max(0, Math.min(1, (distance - 30) / 70));
    const baseArc = (15 + Math.random() * 25) * (Math.random() > 0.5 ? 1 : -1);
    const arcHeight = baseArc * arcScale;

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(1, elapsed / duration);
        const progress = easeInOutCubic(linearProgress);

        // Arc only for longer distances
        const arcOffset = Math.sin(progress * Math.PI) * arcHeight;

        // Scale tremor with distance too - less jitter for short hops
        const time = currentTime * 0.01;
        const tremor = 0.4 * Math.min(1, distance / 50);
        const jitterX = (noise(time) - 0.5) * tremor;
        const jitterY = (noise(time + 50) - 0.5) * tremor;

        setClaudeCursorPos({
          x: from.x + dx * progress + perpX * arcOffset + jitterX,
          y: from.y + dy * progress + perpY * arcOffset + jitterY
        });

        if (linearProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }, [animationSpeed, easeInOutCubic, noise]);

  // Brief pause for ASCII character "stamp" effect
  const animateAsciiStamp = useCallback(async () => {
    const duration = 80 / animationSpeed; // Quick stamp pause
    return new Promise<void>((resolve) => {
      setTimeout(resolve, duration);
    });
  }, [animationSpeed]);

  // Process queued shapes and ASCII blocks with cursor animation
  const processClaudeAnimationQueue = useCallback(async () => {
    if (isAnimatingClaude.current || claudeAnimationQueue.current.length === 0) return;

    isAnimatingClaude.current = true;
    setClaudeIsDrawing(true);

    while (claudeAnimationQueue.current.length > 0) {
      const item = claudeAnimationQueue.current.shift()!;

      if (item.type === 'shape') {
        const { shape, id } = item;
        const points = getShapePoints(shape);

        // Set cursor color to match the shape being drawn
        if (shape.color) {
          setClaudeCurrentColor(shape.color);
        }

        if (points.length > 0) {
          const startPoint = points[0];

          // Glide from last position to shape start
          if (claudeLastEndPoint.current) {
            await animateCursorGlide(claudeLastEndPoint.current, startPoint);
          } else {
            setClaudeCursorPos(startPoint);
          }

          // Clear ASCII state when drawing shapes
          setAnimatingAscii(null);

          // Start animating the shape
          setAnimatingShape({ shape, id, progress: 0 });

          // Animate cursor along the path, updating progress for stroke reveal
          await animateClaudeCursor(points, (progress) => {
            setAnimatingShape({ shape, id, progress });
          });

          // Remember where we ended
          claudeLastEndPoint.current = points[points.length - 1];

          // Animation complete - add to permanent drawing elements
          setAnimatingShape(null);
          setDrawingElements(prev => [...prev, {
            id,
            source: 'claude',
            type: 'shape',
            data: shape,
          }]);
        } else {
          // No points to animate, just add immediately
          setDrawingElements(prev => [...prev, {
            id,
            source: 'claude',
            type: 'shape',
            data: shape,
          }]);
        }
      } else if (item.type === 'ascii') {
        const { block } = item;
        const targetPoint = { x: block.x, y: block.y };

        // Clear shape state when doing ASCII
        setAnimatingShape(null);

        // Show ASCII cursor
        setAnimatingAscii(block);

        // Glide to the character position
        if (claudeLastEndPoint.current) {
          await animateCursorGlide(claudeLastEndPoint.current, targetPoint);
        } else {
          setClaudeCursorPos(targetPoint);
        }

        // Brief stamp pause, then reveal character
        await animateAsciiStamp();

        // Add the ASCII block to the canvas
        setAsciiBlocks(prev => [...prev, block]);

        // Remember position
        claudeLastEndPoint.current = targetPoint;
      }
    }

    // Don't hide cursor here - wait for finishClaudeAnimation to be called
    // This keeps the cursor visible while more items might stream in
    isAnimatingClaude.current = false;
  }, [getShapePoints, animateClaudeCursor, animateCursorGlide, animateAsciiStamp]);

  // Called when API stream is complete to hide the cursor
  const finishClaudeAnimation = useCallback(() => {
    // If still animating, wait for it to finish then hide
    const checkAndHide = () => {
      if (isAnimatingClaude.current) {
        // Still processing queue, check again soon
        setTimeout(checkAndHide, CURSOR_HIDE_CHECK_INTERVAL_MS);
      } else {
        setClaudeCursorPos(null);
        setAnimatingAscii(null);
        setClaudeIsDrawing(false);
        claudeLastEndPoint.current = null;
      }
    };
    checkAndHide();
  }, []);

  // Generate test shapes for cursor animation debugging
  const runTestShapes = useCallback(() => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    const testShapes: Shape[] = [
      // A curved path (like a wave)
      {
        type: 'path',
        d: 'M 100 300 Q 200 200 300 300 Q 400 400 500 300 Q 600 200 700 300',
        color: colors[0],
        strokeWidth: 3,
      },
      // A circle
      {
        type: 'circle',
        cx: 400,
        cy: 200,
        r: 60,
        color: colors[1],
        strokeWidth: 3,
      },
      // A rectangle
      {
        type: 'rect',
        x: 150,
        y: 400,
        width: 120,
        height: 80,
        color: colors[2],
        strokeWidth: 3,
      },
      // A diagonal line
      {
        type: 'line',
        x1: 500,
        y1: 150,
        x2: 700,
        y2: 350,
        color: colors[3],
        strokeWidth: 3,
      },
      // A more complex path (star-like)
      {
        type: 'path',
        d: 'M 350 500 L 380 570 L 450 580 L 400 620 L 420 690 L 350 650 L 280 690 L 300 620 L 250 580 L 320 570 Z',
        color: colors[4],
        strokeWidth: 3,
      },
      // An erase stroke (to test eraser cursor)
      {
        type: 'erase',
        d: 'M 550 450 Q 600 400 650 450 Q 700 500 750 450',
        strokeWidth: 20,
      },
    ];

    // Queue each shape for animation
    testShapes.forEach((shape) => {
      const id = `test-${elementIdCounter.current++}`;
      claudeAnimationQueue.current.push({ type: 'shape', shape, id });
    });

    // Add some test ASCII blocks - a simple star/sparkle pattern
    const testAsciiBlocks: AsciiBlock[] = [
      // Star shape made of ASCII
      { block: '*', x: 120, y: 100, color: '#f59e0b' },
      { block: '/', x: 110, y: 110, color: '#f59e0b' },
      { block: '|', x: 120, y: 110, color: '#f59e0b' },
      { block: '\\', x: 130, y: 110, color: '#f59e0b' },
      { block: '-', x: 100, y: 120, color: '#f59e0b' },
      { block: '-', x: 110, y: 120, color: '#f59e0b' },
      { block: '*', x: 120, y: 120, color: '#fbbf24' },
      { block: '-', x: 130, y: 120, color: '#f59e0b' },
      { block: '-', x: 140, y: 120, color: '#f59e0b' },
      { block: '\\', x: 110, y: 130, color: '#f59e0b' },
      { block: '|', x: 120, y: 130, color: '#f59e0b' },
      { block: '/', x: 130, y: 130, color: '#f59e0b' },
      { block: '*', x: 120, y: 140, color: '#f59e0b' },
      // Small cat face
      { block: '/', x: 180, y: 100, color: '#8b5cf6' },
      { block: '\\', x: 210, y: 100, color: '#8b5cf6' },
      { block: '(', x: 175, y: 115, color: '#8b5cf6' },
      { block: '^', x: 185, y: 115, color: '#ec4899' },
      { block: '.', x: 195, y: 118, color: '#8b5cf6' },
      { block: '^', x: 205, y: 115, color: '#ec4899' },
      { block: ')', x: 215, y: 115, color: '#8b5cf6' },
      { block: '>', x: 195, y: 125, color: '#ec4899' },
      { block: '~', x: 185, y: 135, color: '#8b5cf6' },
      { block: 'w', x: 195, y: 135, color: '#8b5cf6' },
      { block: '~', x: 205, y: 135, color: '#8b5cf6' },
    ];

    testAsciiBlocks.forEach((block) => {
      const id = `test-ascii-${elementIdCounter.current++}`;
      claudeAnimationQueue.current.push({ type: 'ascii', block, id });
    });

    processClaudeAnimationQueue();
  }, [processClaudeAnimationQueue]);

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
  // See docs/wiggle-filter-learnings.md for details
  useEffect(() => {
    // Safari gets static distortion only (no animation)
    if (isSafari || distortionAmount === 0 || !isTabVisible) return;

    let seed = 1;
    const interval = setInterval(() => {
      seed = (seed % 100) + 1;
      turbulenceRef.current?.setAttribute('seed', String(seed));
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
      // Always track the path (for both regular and ASCII strokes)
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

    if (tool === 'erase' || tool === 'draw') {
      // Always update the path (for both regular and ASCII strokes)
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: `${prev.d} L ${point.x} ${point.y}`,
      } : null);
    }

    // Additionally place ASCII chars if in ASCII mode
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
    setClaudeObservation('');
    setClaudeIntention('');

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

    // Track observation/intention for sync context capture
    let capturedObservation = '';
    let capturedIntention = '';

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
                // Queue ASCII block for cursor animation
                streamedBlocks.push(event.data);
                const id = `claude-ascii-${elementIdCounter.current++}`;
                claudeAnimationQueue.current.push({ type: 'ascii', block: event.data as AsciiBlock, id });
                processClaudeAnimationQueue();
              } else if (event.type === 'shape') {
                // Don't add to shapes immediately - let animation reveal it
                streamedShapes.push(event.data);
                const id = `claude-${elementIdCounter.current++}`;
                // Queue shape for cursor animation with progressive reveal
                // Shape will be added to drawingElements after animation completes
                claudeAnimationQueue.current.push({ type: 'shape', shape: event.data as Shape, id });
                processClaudeAnimationQueue();
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
              } else if (event.type === 'reasoning') {
                // Claude's thinking process (without API thinking)
                setClaudeReasoning(event.data);
              } else if (event.type === 'observation') {
                // Claude describes what it sees
                capturedObservation = event.data;
                setClaudeObservation(event.data);
              } else if (event.type === 'intention') {
                // Claude explains what it's drawing and why
                capturedIntention = event.data;
                setClaudeIntention(event.data);
              } else if (event.type === 'interactionStyle') {
                // Detected interaction style (collaborative, playful, neutral)
                setInteractionStyle(event.data);
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

                // Save sync context for hybrid mode (so Claude remembers what it saw on sync turns)
                if (hybridModeEnabled && isSyncTurn && (capturedObservation || capturedIntention)) {
                  setLastSyncContext({
                    observation: capturedObservation,
                    intention: capturedIntention,
                    turn: currentTurnNumber,
                  });
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
    setImages([]);
    setSelectedImageId(null);
    lastDrawnPoint.current = null;
    // Clear localStorage
    localStorage.removeItem(CANVAS_STORAGE_KEY);
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

  const handleCommentSubmit = useCallback((e: React.FormEvent) => {
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
  }, [commentText, commentInput, addComment, autoDrawEnabled, triggerAutoDraw]);

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

  return (
    <div className="draw-page relative overflow-hidden">
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
        </defs>
      </svg>

      {/* Main content area */}
      <div className="draw-main">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="draw-canvas-container"
          style={{ cursor: isPanning ? 'grabbing' : (tool === 'select' ? 'default' : 'none') }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseDown={(e) => {
            // Don't start drawing if there's an open comment or comment input
            if (openCommentIndex !== null || commentInput !== null) {
              return;
            }
            if (e.button === 1) {
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
          onMouseMove={(e) => {
            setIsTouch(false); // Switch back to mouse mode
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
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
            setCursorPos(null);
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
            className="absolute inset-0 overflow-hidden rounded-xl"
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
              {/* Sort: back-layer shapes first, then rest in order */}
              {[...drawingElements].sort((a, b) => {
                const aBack = a.type === 'shape' && (a.data as Shape).layer === 'back' ? 0 : 1;
                const bBack = b.type === 'shape' && (b.data as Shape).layer === 'back' ? 0 : 1;
                return aBack - bBack;
              }).map((element) => {
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
              {currentStroke && (
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
                className={`absolute ${tool === 'select' ? 'cursor-move' : 'pointer-events-none'} ${selectedImageId === img.id ? 'ring-2 ring-blue-500' : ''}`}
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
            {claudeCursorPos && (
              <div
                className="absolute pointer-events-none"
                style={{
                  // Position at canvas coordinates
                  // ASCII cursor is 34x34 with center around (17,17), pencil tip is at (3,3)
                  left: claudeCursorPos.x - (animatingAscii ? 17 : 3),
                  top: claudeCursorPos.y - (animatingAscii ? 17 : 3),
                  zIndex: 100,
                  filter: 'drop-shadow(0px 0.5px 2px rgba(0, 0, 0, 0.25))',
                  // Counter-scale to keep cursor at consistent size regardless of zoom
                  transform: `scale(${1 / zoom})`,
                  transformOrigin: animatingAscii ? '17px 17px' : '3px 3px',
                }}
              >
                {animatingAscii ? (
                  <AsciiCursor />
                ) : animatingShape?.shape.type === 'erase' ? (
                  <EraserCursor />
                ) : (
                  <PencilCursor color={claudeCurrentColor} />
                )}
              </div>
            )}
          </div>

          {/* Custom cursor - User */}
          <CustomCursor
            cursorPos={cursorPos}
            isPanning={isPanning}
            isTouch={isTouch}
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
            tool={tool}
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

        {/* Claude Narration Bubble - shows what Claude sees and is doing */}
        {(claudeReasoning || claudeObservation || claudeIntention || isLoading) && (
          <div className="absolute bottom-20 left-4 max-w-sm bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <img src="/draw/claude.svg" alt="" className="w-5 h-5" />
              <span className="text-xs font-medium text-gray-500">
                {interactionStyle === 'playful' ? 'feeling playful...' :
                 interactionStyle === 'collaborative' ? 'collaborating...' :
                 'thinking...'}
              </span>
            </div>
            {claudeReasoning && (
              <div className="mb-2 pb-2 border-b border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">thinking</p>
                <p className="text-sm text-gray-600 italic">{claudeReasoning}</p>
              </div>
            )}
            {claudeObservation && (
              <div className="mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">I see</p>
                <p className="text-sm text-gray-700">{claudeObservation}</p>
              </div>
            )}
            {claudeIntention && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">So I&apos;m drawing</p>
                <p className="text-sm text-gray-700">{claudeIntention}</p>
              </div>
            )}
            {isLoading && !claudeReasoning && !claudeObservation && !claudeIntention && (
              <p className="text-sm text-gray-400 italic">Looking at the canvas...</p>
            )}
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
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
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
      <DrawToolbar
        tool={tool}
        setTool={setTool}
        asciiStroke={asciiStroke}
        setAsciiStroke={handleSetAsciiStroke}
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
        showSelectTool={showSelectTool}
        showReactButton={showReactButton}
        showDownloadButton={showDownloadButton}
      />

      {/* User menu - positioned in top right */}
      <div className="absolute top-4 right-4 z-30">
        <UserMenu
          onOpenSettings={() => setShowApiKeyModal(true)}
          onOpenDrawings={user ? () => setShowDrawingsPanel(true) : undefined}
        />
      </div>

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
    </div>
  );
}
