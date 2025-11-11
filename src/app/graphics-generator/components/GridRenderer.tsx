'use client';

import React from 'react';
import { GridLayer } from '../types';
import { createGridShaderCanvas } from '../shaders/grid';

type Props = {
  layer: GridLayer;
  canvasWidth: number;
  canvasHeight: number;
  zIndex: number;
};

export const GridRenderer: React.FC<Props> = ({ layer, canvasWidth, canvasHeight, zIndex }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Generate grid using WebGL shader
  React.useEffect(() => {
    if (!layer.visible || !canvasRef.current) return;
    
    const canvas = createGridShaderCanvas(
      canvasWidth,
      canvasHeight,
      layer.columns,
      layer.rows,
      layer.lineColor,
      layer.lineWidth,
      layer.opacity
    );
    
    // Draw to our ref canvas
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(canvas, 0, 0);
    }
  }, [canvasWidth, canvasHeight, layer.columns, layer.rows, layer.lineColor, layer.lineWidth, layer.opacity, layer.visible]);
  
  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        opacity: layer.opacity,
        mixBlendMode: layer.blendMode,
        zIndex,
      }}
    />
  );
};
