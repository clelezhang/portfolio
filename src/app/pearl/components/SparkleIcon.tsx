'use client';

import React from 'react';

interface SparkleIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function SparkleIcon({ size = 16, color = 'currentColor', className = '' }: SparkleIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      style={{ color }}
    >
      <path 
        d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" 
        fill="currentColor"
      />
    </svg>
  );
}

