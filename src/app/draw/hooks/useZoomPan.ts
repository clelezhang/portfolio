import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Point } from '../types';
import { ZOOM_MIN, ZOOM_MAX } from '../constants';

interface UseZoomPanProps {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

interface UseZoomPanReturn {
  zoom: number;
  pan: Point;
  isPanning: boolean;
  spacePressed: boolean;
  startPan: (e: React.MouseEvent) => void;
  doPan: (e: React.MouseEvent) => void;
  stopPan: () => void;
  handleDoubleClick: () => void;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  canvasToScreen: (canvasX: number, canvasY: number) => Point;
}

export function useZoomPan({ containerRef, canvasRef }: UseZoomPanProps): UseZoomPanReturn {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Wheel handler - scroll to pan, ctrl/cmd+scroll to zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    if (e.ctrlKey || e.metaKey) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const zoomFactor = 1 - e.deltaY * 0.01;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, ZOOM_MIN), ZOOM_MAX);

      const mouseOffsetX = mouseX - centerX - pan.x;
      const mouseOffsetY = mouseY - centerY - pan.y;
      const newPanX = pan.x - mouseOffsetX * (newZoom / zoom - 1);
      const newPanY = pan.y - mouseOffsetY * (newZoom / zoom - 1);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [zoom, pan, containerRef]);

  // Attach wheel handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel, containerRef]);

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

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { x: screenX, y: screenY };

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const relX = screenX - rect.left - centerX;
    const relY = screenY - rect.top - centerY;

    const canvasX = (relX - pan.x) / zoom + centerX;
    const canvasY = (relY - pan.y) / zoom + centerY;

    return { x: canvasX, y: canvasY };
  }, [zoom, pan, containerRef, canvasRef]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: canvasX, y: canvasY };

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const screenX = (canvasX - centerX) * zoom + pan.x + centerX;
    const screenY = (canvasY - centerY) * zoom + pan.y + centerY;

    return { x: screenX, y: screenY };
  }, [zoom, pan, containerRef]);

  return {
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
  };
}
