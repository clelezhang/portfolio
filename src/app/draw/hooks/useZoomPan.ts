import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Point } from '../types';
import { ZOOM_MIN, ZOOM_MAX } from '../constants';

interface UseZoomPanProps {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  panSensitivity?: number;
  zoomSensitivity?: number;
}

interface UseZoomPanReturn {
  zoom: number;
  pan: Point;
  isPanning: boolean;
  isTouchGesture: boolean;
  startPan: (e: React.MouseEvent) => void;
  doPan: (e: React.MouseEvent) => void;
  stopPan: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleDoubleClick: () => void;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  canvasToScreen: (canvasX: number, canvasY: number) => Point;
}

interface TouchGestureState {
  initialDistance: number;
  initialZoom: number;
  initialPan: Point;
  initialCenter: Point;
}

export function useZoomPan({ containerRef, canvasRef, panSensitivity = 1.0, zoomSensitivity = 1.0 }: UseZoomPanProps): UseZoomPanReturn {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isTouchGesture, setIsTouchGesture] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchGestureState = useRef<TouchGestureState | null>(null);

  // Always-current ref so callbacks don't close over stale zoom/pan
  const stateRef = useRef({ zoom, pan });
  stateRef.current.zoom = zoom;
  stateRef.current.pan = pan;

  // Helper to get distance between two touch points
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper to get center point between two touches
  const getTouchCenter = (touches: React.TouchList): Point => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Wheel handler - scroll to pan, ctrl/cmd+scroll to zoom.
  // Reads from stateRef so the listener is only attached once per container.
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    // If scrolling over a comment bubble that has overflow, scroll it instead of panning
    const target = e.target as Element;
    const commentBubble = target.closest('.draw-comment-bubble') as HTMLElement | null;
    if (commentBubble && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const canScrollY = commentBubble.scrollHeight > commentBubble.clientHeight;
      if (canScrollY) {
        const atTop = commentBubble.scrollTop <= 0;
        const atBottom = commentBubble.scrollTop + commentBubble.clientHeight >= commentBubble.scrollHeight - 1;
        if (!((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom))) {
          commentBubble.scrollTop += e.deltaY;
        }
        return; // Never pan when hovering over a scrollable comment
      }
    }

    const { zoom, pan } = stateRef.current;

    if (e.ctrlKey || e.metaKey) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const zoomFactor = 1 - e.deltaY * 0.01 * zoomSensitivity;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, ZOOM_MIN), ZOOM_MAX);

      const mouseOffsetX = mouseX - centerX - pan.x;
      const mouseOffsetY = mouseY - centerY - pan.y;
      const newPanX = pan.x - mouseOffsetX * (newZoom / zoom - 1);
      const newPanY = pan.y - mouseOffsetY * (newZoom / zoom - 1);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX * panSensitivity,
        y: prev.y - e.deltaY * panSensitivity,
      }));
    }
  }, [containerRef, panSensitivity, zoomSensitivity]);

  // Attach wheel handler to window (Safari doesn't dispatch wheel events to
  // non-scrollable elements like overflow:hidden + position:fixed containers)
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const container = containerRef.current;
      if (!container) return;
      // Only handle if cursor is over the canvas container
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) return;
      handleWheel(e);
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [handleWheel, containerRef]);

  const startPan = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    const { pan } = stateRef.current;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, []);

  const doPan = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    const dx = (e.clientX - panStart.current.x) * panSensitivity;
    const dy = (e.clientY - panStart.current.y) * panSensitivity;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning, panSensitivity]);

  const stopPan = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Touch gesture handlers for pinch-to-zoom and two-finger pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      const { zoom, pan } = stateRef.current;
      setIsTouchGesture(true);
      touchGestureState.current = {
        initialDistance: getTouchDistance(e.touches),
        initialZoom: zoom,
        initialPan: { ...pan },
        initialCenter: getTouchCenter(e.touches),
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2 && touchGestureState.current) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerCenterX = rect.width / 2;
      const containerCenterY = rect.height / 2;

      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      const { initialDistance, initialZoom, initialPan, initialCenter } = touchGestureState.current;

      // Calculate new zoom based on pinch
      const scale = currentDistance / initialDistance;
      const newZoom = Math.min(Math.max(initialZoom * scale, ZOOM_MIN), ZOOM_MAX);

      // Calculate pan based on finger movement
      const dx = currentCenter.x - initialCenter.x;
      const dy = currentCenter.y - initialCenter.y;

      // Also adjust pan to keep the pinch center point stationary
      const pinchCenterX = initialCenter.x - rect.left;
      const pinchCenterY = initialCenter.y - rect.top;
      const pinchOffsetX = pinchCenterX - containerCenterX - initialPan.x;
      const pinchOffsetY = pinchCenterY - containerCenterY - initialPan.y;

      const newPanX = initialPan.x + dx - pinchOffsetX * (newZoom / initialZoom - 1);
      const newPanY = initialPan.y + dy - pinchOffsetY * (newZoom / initialZoom - 1);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [containerRef]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsTouchGesture(false);
      touchGestureState.current = null;
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { x: screenX, y: screenY };

    const { zoom, pan } = stateRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const relX = screenX - rect.left - centerX;
    const relY = screenY - rect.top - centerY;

    const canvasX = (relX - pan.x) / zoom + centerX;
    const canvasY = (relY - pan.y) / zoom + centerY;

    return { x: canvasX, y: canvasY };
  }, [containerRef, canvasRef]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: canvasX, y: canvasY };

    const { zoom, pan } = stateRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const screenX = (canvasX - centerX) * zoom + pan.x + centerX;
    const screenY = (canvasY - centerY) * zoom + pan.y + centerY;

    return { x: screenX, y: screenY };
  }, [containerRef]);

  return {
    zoom,
    pan,
    isPanning,
    isTouchGesture,
    startPan,
    doPan,
    stopPan,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDoubleClick,
    screenToCanvas,
    canvasToScreen,
  };
}
