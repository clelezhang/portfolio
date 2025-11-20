'use client';

import React from 'react';
import { GradientLayer } from '../types';
import { GrainGradient } from '@paper-design/shaders-react';

type Props = {
  layer: GradientLayer;
  canvasWidth: number;
  canvasHeight: number;
  zIndex: number;
};

export const GradientRenderer: React.FC<Props> = ({ layer, canvasWidth, canvasHeight, zIndex }) => {
  if (!layer.visible) return null;

  return (
    <div
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
    >
      <GrainGradient
        width={canvasWidth}
        height={canvasHeight}
        colors={layer.colors}
        colorBack={layer.colorBack}
        softness={layer.softness}
        intensity={layer.intensity}
        noise={layer.noise}
        shape={layer.shape}
        speed={layer.speed}
        scale={layer.scale}
        rotation={layer.rotation}
        offsetX={layer.offsetX}
        offsetY={layer.offsetY}
      />
    </div>
  );
};
