import { useState, useRef, useCallback } from 'react';
import { Point, Shape, AsciiBlock, DrawingElement } from '../types';
import { getShapePoints } from '../utils/shapePoints';
import { CURSOR_HIDE_CHECK_INTERVAL_MS } from '../constants';

// ─── Pure math helpers (no React deps) ───────────────────────────────────────

function calculatePathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getDirectionChange(points: Point[], index: number): number {
  if (index <= 0 || index >= points.length - 1) return 0;
  const prev = points[index - 1];
  const curr = points[index];
  const next = points[index + 1];
  const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
  const v2x = next.x - curr.x, v2y = next.y - curr.y;
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (len1 < 0.001 || len2 < 0.001) return 0;
  const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
  return (1 - Math.max(-1, Math.min(1, dot))) / 2;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnimationItem =
  | { type: 'shape'; shape: Shape; id: string }
  | { type: 'ascii'; block: AsciiBlock; id: string };

interface UseClaudeAnimationProps {
  animationSpeed: number;
  setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElement[]>>;
  setAsciiBlocks: React.Dispatch<React.SetStateAction<AsciiBlock[]>>;
  elementIdCounter: React.MutableRefObject<number>;
}

interface UseClaudeAnimationReturn {
  claudeCursorPos: Point | null;
  claudeIsDrawing: boolean;
  animatingShape: { shape: Shape; id: string; progress: number } | null;
  animatingAscii: AsciiBlock | null;
  enqueueShape: (shape: Shape) => void;
  enqueueAscii: (block: AsciiBlock) => void;
  processClaudeAnimationQueue: () => void;
  finishClaudeAnimation: () => void;
  runTestShapes: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClaudeAnimation({
  animationSpeed,
  setDrawingElements,
  setAsciiBlocks,
  elementIdCounter,
}: UseClaudeAnimationProps): UseClaudeAnimationReturn {
  const [claudeCursorPos, setClaudeCursorPos] = useState<Point | null>(null);
  const [claudeIsDrawing, setClaudeIsDrawing] = useState(false);
  const [animatingShape, setAnimatingShape] = useState<{ shape: Shape; id: string; progress: number } | null>(null);
  const [animatingAscii, setAnimatingAscii] = useState<AsciiBlock | null>(null);

  const claudeAnimationQueue = useRef<AnimationItem[]>([]);
  const isAnimatingClaude = useRef(false);
  const claudeLastEndPoint = useRef<Point | null>(null);

  // Always-current ref so animation rAF callbacks don't close over stale speed
  const animationSpeedRef = useRef(animationSpeed);
  animationSpeedRef.current = animationSpeed;

  const animateClaudeCursor = useCallback(async (
    points: Point[],
    onProgress?: (progress: number) => void,
  ) => {
    if (points.length === 0) return;

    const pathLength = calculatePathLength(points);
    const baseSpeed = 300;
    const baseDuration = Math.min(3000, Math.max(300, (pathLength / baseSpeed) * 1000));
    const duration = baseDuration / animationSpeedRef.current;
    const startTime = performance.now();
    const directionChanges = points.map((_, i) => getDirectionChange(points, i));

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(1, elapsed / duration);
        const easedProgress = easeInOutCubic(linearProgress);

        if (points.length <= 1) {
          if (points.length === 1) setClaudeCursorPos(points[0]);
          onProgress?.(easedProgress);
          linearProgress < 1 ? requestAnimationFrame(animate) : resolve();
          return;
        }

        const pointIndex = Math.min(Math.floor(easedProgress * (points.length - 1)), points.length - 2);
        const turnSlowdown = directionChanges[pointIndex] * 0.1;
        const adjustedProgress = easedProgress * (1 - turnSlowdown * 0.2);
        const finalPointIndex = Math.min(Math.floor(adjustedProgress * (points.length - 1)), points.length - 2);
        const pointProgress = (adjustedProgress * (points.length - 1)) % 1;

        const p1 = points[finalPointIndex];
        const p2 = points[finalPointIndex + 1];

        if (p1 && p2) {
          const time = currentTime * 0.008;
          const speed = Math.abs(easedProgress - (linearProgress > 0.01 ? easeInOutCubic(linearProgress - 0.01) : 0));
          const baseTremor = 0.6 + noise(time * 0.5) * 0.8;
          const speedFactor = Math.max(0.3, 1 - speed * 50);
          const tremor = baseTremor * speedFactor;
          const jitterX = (noise(time) - 0.5) * tremor + (noise(time * 2.7) - 0.5) * tremor * 0.3;
          const jitterY = (noise(time + 100) - 0.5) * tremor + (noise(time * 2.7 + 100) - 0.5) * tremor * 0.3;
          setClaudeCursorPos({ x: p1.x + (p2.x - p1.x) * pointProgress + jitterX, y: p1.y + (p2.y - p1.y) * pointProgress + jitterY });
        } else if (p1) {
          setClaudeCursorPos(p1);
        }

        onProgress?.(easedProgress);
        linearProgress < 1 ? requestAnimationFrame(animate) : resolve();
      };
      requestAnimationFrame(animate);
    });
  }, []);

  const animateCursorGlide = useCallback(async (from: Point, to: Point) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 25) {
      setClaudeCursorPos(to);
      await new Promise(resolve => setTimeout(resolve, 15 / animationSpeedRef.current));
      return;
    }

    const duration = Math.min(400, Math.max(30, (distance - 25) * 1.2)) / animationSpeedRef.current;
    const startTime = performance.now();
    const perpX = -dy / (distance || 1);
    const perpY = dx / (distance || 1);
    const arcScale = Math.max(0, Math.min(1, (distance - 30) / 70));
    const baseArc = (15 + Math.random() * 25) * (Math.random() > 0.5 ? 1 : -1);
    const arcHeight = baseArc * arcScale;

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(1, elapsed / duration);
        const progress = easeInOutCubic(linearProgress);
        const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
        const time = currentTime * 0.01;
        const tremor = 0.4 * Math.min(1, distance / 50);
        const jitterX = (noise(time) - 0.5) * tremor;
        const jitterY = (noise(time + 50) - 0.5) * tremor;
        setClaudeCursorPos({
          x: from.x + dx * progress + perpX * arcOffset + jitterX,
          y: from.y + dy * progress + perpY * arcOffset + jitterY,
        });
        linearProgress < 1 ? requestAnimationFrame(animate) : resolve();
      };
      requestAnimationFrame(animate);
    });
  }, []);

  const animateAsciiStamp = useCallback(async () => {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 80 / animationSpeedRef.current);
    });
  }, []);

  const processClaudeAnimationQueue = useCallback(async () => {
    if (isAnimatingClaude.current || claudeAnimationQueue.current.length === 0) return;

    isAnimatingClaude.current = true;
    setClaudeIsDrawing(true);

    while (claudeAnimationQueue.current.length > 0) {
      const item = claudeAnimationQueue.current.shift()!;

      if (item.type === 'shape') {
        const { shape, id } = item;
        const points = getShapePoints(shape);

        setAnimatingAscii(null);
        setAnimatingShape({ shape, id, progress: 0 });

        if (points.length > 0) {
          const startPoint = points[0];
          if (claudeLastEndPoint.current) {
            await animateCursorGlide(claudeLastEndPoint.current, startPoint);
          } else {
            setClaudeCursorPos(startPoint);
          }

          await animateClaudeCursor(points, (progress) => {
            setAnimatingShape({ shape, id, progress });
          });

          claudeLastEndPoint.current = points[points.length - 1];
        }

        setAnimatingShape(null);
        setDrawingElements(prev => [...prev, { id, source: 'claude', type: 'shape', data: shape }]);
      } else if (item.type === 'ascii') {
        const { block } = item;
        const targetPoint = { x: block.x, y: block.y };

        setAnimatingShape(null);
        setAnimatingAscii(block);

        if (claudeLastEndPoint.current) {
          await animateCursorGlide(claudeLastEndPoint.current, targetPoint);
        } else {
          setClaudeCursorPos(targetPoint);
        }

        await animateAsciiStamp();
        setAsciiBlocks(prev => [...prev, block]);
        claudeLastEndPoint.current = targetPoint;
      }
    }

    isAnimatingClaude.current = false;
  }, [animateClaudeCursor, animateCursorGlide, animateAsciiStamp, setDrawingElements, setAsciiBlocks]);

  const finishClaudeAnimation = useCallback(() => {
    const checkAndHide = () => {
      if (isAnimatingClaude.current) {
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

  const enqueueShape = useCallback((shape: Shape) => {
    const id = `claude-${elementIdCounter.current++}`;
    claudeAnimationQueue.current.push({ type: 'shape', shape, id });
  }, [elementIdCounter]);

  const enqueueAscii = useCallback((block: AsciiBlock) => {
    const id = `claude-ascii-${elementIdCounter.current++}`;
    claudeAnimationQueue.current.push({ type: 'ascii', block, id });
  }, [elementIdCounter]);

  const runTestShapes = useCallback(() => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    const testShapes: Shape[] = [
      { type: 'path', d: 'M 100 300 Q 200 200 300 300 Q 400 400 500 300 Q 600 200 700 300', color: colors[0], strokeWidth: 3 },
      { type: 'circle', cx: 400, cy: 200, r: 60, color: colors[1], strokeWidth: 3 },
      { type: 'rect', x: 150, y: 400, width: 120, height: 80, color: colors[2], strokeWidth: 3 },
      { type: 'line', x1: 500, y1: 150, x2: 700, y2: 350, color: colors[3], strokeWidth: 3 },
      { type: 'path', d: 'M 350 500 L 380 570 L 450 580 L 400 620 L 420 690 L 350 650 L 280 690 L 300 620 L 250 580 L 320 570 Z', color: colors[4], strokeWidth: 3 },
      { type: 'erase', d: 'M 550 450 Q 600 400 650 450 Q 700 500 750 450', strokeWidth: 20 },
    ];
    testShapes.forEach(shape => enqueueShape(shape));

    const testAsciiBlocks: AsciiBlock[] = [
      { block: '*', x: 120, y: 100, color: '#f59e0b' }, { block: '/', x: 110, y: 110, color: '#f59e0b' },
      { block: '|', x: 120, y: 110, color: '#f59e0b' }, { block: '\\', x: 130, y: 110, color: '#f59e0b' },
      { block: '-', x: 100, y: 120, color: '#f59e0b' }, { block: '-', x: 110, y: 120, color: '#f59e0b' },
      { block: '*', x: 120, y: 120, color: '#fbbf24' }, { block: '-', x: 130, y: 120, color: '#f59e0b' },
      { block: '-', x: 140, y: 120, color: '#f59e0b' }, { block: '\\', x: 110, y: 130, color: '#f59e0b' },
      { block: '|', x: 120, y: 130, color: '#f59e0b' }, { block: '/', x: 130, y: 130, color: '#f59e0b' },
      { block: '*', x: 120, y: 140, color: '#f59e0b' }, { block: '/', x: 180, y: 100, color: '#8b5cf6' },
      { block: '\\', x: 210, y: 100, color: '#8b5cf6' }, { block: '(', x: 175, y: 115, color: '#8b5cf6' },
      { block: '^', x: 185, y: 115, color: '#ec4899' }, { block: '.', x: 195, y: 118, color: '#8b5cf6' },
      { block: '^', x: 205, y: 115, color: '#ec4899' }, { block: ')', x: 215, y: 115, color: '#8b5cf6' },
      { block: '>', x: 195, y: 125, color: '#ec4899' }, { block: '~', x: 185, y: 135, color: '#8b5cf6' },
      { block: 'w', x: 195, y: 135, color: '#8b5cf6' }, { block: '~', x: 205, y: 135, color: '#8b5cf6' },
    ];
    testAsciiBlocks.forEach(block => enqueueAscii(block));

    processClaudeAnimationQueue();
  }, [enqueueShape, enqueueAscii, processClaudeAnimationQueue]);

  return {
    claudeCursorPos,
    claudeIsDrawing,
    animatingShape,
    animatingAscii,
    enqueueShape,
    enqueueAscii,
    processClaudeAnimationQueue,
    finishClaudeAnimation,
    runTestShapes,
  };
}
