'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 100
  isAnimating: boolean;
  className?: string;
}

const ProgressBar = memo(function ProgressBar({ 
  progress, 
  isAnimating, 
  className = "" 
}: ProgressBarProps) {
  return (
    <div className={`w-full h-0.5 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <motion.div 
        className="h-full bg-gray-500 rounded-full"
        style={{
          width: `${progress}%`
        }}
        transition={{
          duration: isAnimating ? 0.5 : 0.2,
          ease: isAnimating ? "linear" : "easeOut"
        }}
      />
    </div>
  );
});

export default ProgressBar;