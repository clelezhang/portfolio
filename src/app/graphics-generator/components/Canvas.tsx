'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { AsciiRenderer } from './AsciiRenderer';
import { GradientRenderer } from './GradientRenderer';
import { GridRenderer } from './GridRenderer';

export const Canvas: React.FC = () => {
  const { canvas, layers } = useStore();
  
  const renderLayer = (layer: any, index: number) => {
    if (!layer.visible) return null;
    
    const key = layer.id;
    
    switch (layer.type) {
      case 'ascii':
        return (
          <AsciiRenderer
            key={key}
            layer={layer}
            canvasWidth={canvas.width}
            canvasHeight={canvas.height}
            zIndex={index}
          />
        );
      case 'gradient':
        return (
          <GradientRenderer
            key={key}
            layer={layer}
            canvasWidth={canvas.width}
            canvasHeight={canvas.height}
            zIndex={index}
          />
        );
      case 'grid':
        return (
          <GridRenderer
            key={key}
            layer={layer}
            canvasWidth={canvas.width}
            canvasHeight={canvas.height}
            zIndex={index}
          />
        );
      default:
        return null;
    }
  };
  
  // Calculate scale to fit canvas in viewport
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 64; // padding
      const containerHeight = container.clientHeight - 64;
      
      const scaleX = containerWidth / canvas.width;
      const scaleY = containerHeight / canvas.height;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
      
      setScale(newScale);
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [canvas.width, canvas.height]);
  
  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        overflow: 'auto',
        padding: '2rem',
        background: '#f0f0f0',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: canvas.width,
          height: canvas.height,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          background: canvas.background,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {/* Render all layers in order - they'll stack with z-index */}
        {layers.map((layer, index) => renderLayer(layer, index))}
      </div>
    </div>
  );
};

export default Canvas;
