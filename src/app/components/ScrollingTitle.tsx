'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface ScrollingTitleProps {
  title: string;
  className?: string;
}

function ScrollingTitle({ 
  title, 
  className = "" 
}: ScrollingTitleProps) {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{
        mask: 'linear-gradient(90deg, transparent 0%, var(--grey-500) 10%, var(--grey-500) 90%, transparent 100%)',
        WebkitMask: 'linear-gradient(90deg, transparent 0%, var(--grey-500) 10%, var(--grey-500) 90%, transparent 100%)'
      }}
    >
      <motion.div 
        className="whitespace-nowrap text-xs font-sans"
        animate={{
          x: [0, -300] // Move from 0px to -300px (fixed distance)
        }}
        transition={{
          duration: 25, // Fixed duration for consistent speed
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {title} {title} {title} {title} {title} {title} {title} {title}
      </motion.div>
    </div>
  );
}

export default memo(ScrollingTitle);