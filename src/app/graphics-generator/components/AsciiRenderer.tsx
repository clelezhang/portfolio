'use client';

import React from 'react';
import { AsciiLayer } from '../types';
import { ImageDithering } from '@paper-design/shaders-react';

type Props = {
  layer: AsciiLayer;
  canvasWidth: number;
  canvasHeight: number;
  zIndex: number;
};

const mapDitheringType = (type: string): '2x2' | '4x4' | '8x8' | 'random' => {
  if (type === '2x2' || type === '4x4' || type === '8x8' || type === 'random') {
    return type;
  }
  return '8x8';
};

export const AsciiRenderer: React.FC<Props> = ({ layer, canvasWidth, canvasHeight, zIndex }) => {
  const ditherContainerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number>();
  const compositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  
  // Convert dither to ASCII
  const updateAsciiFromDither = React.useCallback(() => {
    if (!ditherContainerRef.current || !canvasRef.current) return;
    if (layer.showDitherOnly) return;
    
    const ditherCanvas = ditherContainerRef.current.querySelector('canvas');
    if (!ditherCanvas || !layer.visible || !layer.source.img.complete) return;
    
    // Apply blur & stretch effects to a composite canvas
    if (!compositeCanvasRef.current) {
      compositeCanvasRef.current = document.createElement('canvas');
    }
    
    const composite = compositeCanvasRef.current;
    const ditherWidth = ditherCanvas.width;
    const ditherHeight = ditherCanvas.height;
    
    // Set composite canvas size based on stretch
    composite.width = ditherWidth;
    composite.height = ditherHeight;
    
    const compCtx = composite.getContext('2d', { willReadFrequently: true });
    if (!compCtx) return;
    
    // Clear composite
    compCtx.clearRect(0, 0, composite.width, composite.height);
    
    // Apply blur using canvas filter (will be exported properly)
    if (layer.dithering.blur > 0) {
      compCtx.filter = `blur(${layer.dithering.blur}px)`;
    }
    
    // Draw dither to composite with stretch (separate X and Y)
    const scaleX = layer.dithering.stretchX;
    const scaleY = layer.dithering.stretchY;
    const offsetX = (ditherWidth - ditherWidth * scaleX) / 2;
    const offsetY = (ditherHeight - ditherHeight * scaleY) / 2;
    
    compCtx.drawImage(
      ditherCanvas,
      offsetX,
      offsetY,
      ditherWidth * scaleX,
      ditherHeight * scaleY
    );
    
    // Reset filter
    compCtx.filter = 'none';
    
    // Get character set
    let charSet = '';
    if (layer.charSet === 'numbers') {
      charSet = '0123456789';
    } else if (layer.charSet === 'normal') {
      charSet = ' .`\'-,:;~!<>+*?][}{1)(|/0#&8%@$';
    } else if (layer.charSet === 'custom' && layer.customCharSet) {
      charSet = layer.customCharSet;
    }
    
    if (!charSet) {
      charSet = ' .`\'-,:;~!<>+*?][}{1)(|/0#&8%@$';
    }
    
    // Read from composite canvas
    let pixelData: Uint8Array;
    try {
      const imageData = compCtx.getImageData(0, 0, composite.width, composite.height);
      pixelData = imageData.data;
    } catch (err) {
      return;
    }
    
    const outputCanvas = canvasRef.current;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and draw
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const fontSize = layer.dithering.pixelSize;
    ctx.font = `${fontSize}px "AS Thermal Regular"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const charsX = Math.floor(canvasWidth / layer.dithering.pixelSize);
    const charsY = Math.floor(canvasHeight / layer.dithering.pixelSize);
    
    for (let y = 0; y < charsY; y++) {
      for (let x = 0; x < charsX; x++) {
        const sampleX = Math.floor((x / charsX) * composite.width);
        const sampleY = Math.floor((y / charsY) * composite.height);
        const idx = (sampleY * composite.width + sampleX) * 4;
        
        const r = pixelData[idx];
        const g = pixelData[idx + 1];
        const b = pixelData[idx + 2];
        const a = pixelData[idx + 3];
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        const charIndex = layer.reverseCharacterMapping
          ? Math.floor(luminance * (charSet.length - 1))
          : Math.floor((1 - luminance) * (charSet.length - 1));
        const char = charSet[charIndex];
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        
        const drawX = x * layer.dithering.pixelSize + layer.dithering.pixelSize / 2;
        const drawY = y * layer.dithering.pixelSize + layer.dithering.pixelSize / 2;
        
        ctx.fillText(char.toUpperCase(), drawX, drawY);
      }
    }
    
    // Continue animation loop if enabled
    if (layer.dithering.animate) {
      animationFrameRef.current = requestAnimationFrame(updateAsciiFromDither);
    }
  }, [
    layer.showDitherOnly,
    layer.visible,
    layer.source.img,
    layer.charSet,
    layer.customCharSet,
    layer.reverseCharacterMapping,
    layer.dithering.pixelSize,
    layer.dithering.animate,
    layer.dithering.blur,
    layer.dithering.stretchX,
    layer.dithering.stretchY,
    canvasWidth,
    canvasHeight,
  ]);
  
  // Start/stop animation loop
  React.useEffect(() => {
    if (layer.dithering.animate && !layer.showDitherOnly) {
      // Wait a bit for Paper to render
      const timeout = setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(updateAsciiFromDither);
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      // Static mode - update once
      const timeout = setTimeout(updateAsciiFromDither, 500);
      return () => clearTimeout(timeout);
    }
  }, [
    layer.dithering.animate,
    layer.showDitherOnly,
    layer.visible,
    layer.source.img,
    layer.dithering.type,
    layer.dithering.colorSteps,
    layer.dithering.pixelSize,
    layer.dithering.originalColors,
    layer.dithering.colorFront,
    layer.dithering.colorBack,
    layer.dithering.colorHighlight,
    layer.dithering.blur,
    layer.dithering.stretchX,
    layer.dithering.stretchY,
    layer.charSet,
    layer.customCharSet,
    layer.reverseCharacterMapping,
    canvasWidth,
    canvasHeight,
    updateAsciiFromDither,
  ]);
  
  const ditherStyle = layer.showDitherOnly ? {
    position: 'absolute' as const,
    top: layer.offset.y,
    left: layer.offset.x,
    width: canvasWidth,
    height: canvasHeight,
    opacity: layer.opacity,
    mixBlendMode: layer.blendMode,
    zIndex,
    overflow: 'hidden',
  } : {
    position: 'absolute' as const,
    left: -9999,
    top: -9999,
    width: canvasWidth,
    height: canvasHeight,
    pointerEvents: 'none' as const,
  };
  
  // For "show dither only" mode, apply effects via CSS for preview
  const ditherTransformStyle = layer.showDitherOnly && (layer.dithering.blur > 0 || layer.dithering.stretchX !== 1 || layer.dithering.stretchY !== 1) ? {
    filter: `blur(${layer.dithering.blur}px)`,
    transform: `scale(${layer.dithering.stretchX}, ${layer.dithering.stretchY})`,
    transformOrigin: 'center',
  } : {};
  
  return (
    <>
      {layer.visible && layer.source.img.complete && (
        <div 
          ref={ditherContainerRef}
          style={ditherStyle}
        >
          <div style={ditherTransformStyle}>
            <ImageDithering
              image={layer.source.img.src}
              type={mapDitheringType(layer.dithering.type)}
              colorSteps={layer.dithering.colorSteps}
              size={layer.dithering.pixelSize}
              originalColors={layer.dithering.originalColors}
              colorFront={layer.dithering.colorFront}
              colorBack={layer.dithering.colorBack}
              colorHighlight={layer.dithering.colorHighlight}
              width={canvasWidth}
              height={canvasHeight}
              style={{ width: canvasWidth, height: canvasHeight }}
            />
          </div>
        </div>
      )}
      
      {!layer.showDitherOnly && (
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: 'absolute',
            top: layer.offset.y,
            left: layer.offset.x,
            width: canvasWidth,
            height: canvasHeight,
            opacity: layer.opacity,
            mixBlendMode: layer.blendMode,
            zIndex,
          }}
        />
      )}
    </>
  );
};
