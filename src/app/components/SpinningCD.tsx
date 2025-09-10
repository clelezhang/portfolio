'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import ShinesIcon from './icons/ShinesIcon';

interface SpinningCDProps {
  artwork?: string;
  className?: string;
}

const SpinningCD = memo(function SpinningCD({ 
  artwork = "https://picsum.photos/40/40?random=3", 
  className = "" 
}: SpinningCDProps) {
  return (
    <div className={`relative w-8 h-8 group ${className}`}>
      {/* Static Shadow */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-hover"
        style={{
          '--shadow-normal': '0 4px 8px rgba(75,49,48,0.25), 0 1px 2px rgba(75,49,48,0.1)',
          '--shadow-hover': '0 4px 12px rgba(75,49,48,0.5), 0 1px 2px rgba(75,49,48,0.6)',
          boxShadow: 'var(--shadow-normal)'
        } as React.CSSProperties}
      />
      
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden bg-gray-300"
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        whileHover={{ scale: 1.05 }}
        style={{
          willChange: 'transform',
          transform: 'translate3d(0, 0, 0)'
        }}
      >
      {/* Album Artwork with Center Hole Cutout */}
      <div 
        className="absolute inset-0 rounded-full bg-cover bg-center border border-gray-300"
        style={{
          backgroundImage: `url(${artwork})`,
          clipPath: 'circle(50% at 50% 50%)',
          WebkitClipPath: 'circle(50% at 50% 50%)',
          mask: 'radial-gradient(circle at center, transparent 0, transparent 15%, black 15%, black 100%)',
          WebkitMask: 'radial-gradient(circle at center, transparent 0, transparent 15%, black 15%, black 100%)',
          willChange: 'transform'
        }}
      />

      {/* CD Data Rings */}
      <div className="absolute inset-0 rounded-full">
        {/* Center rings */}
        <div 
          className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2" 
          style={{ willChange: 'transform' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-5 h-5 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2" 
          style={{ willChange: 'transform' }}
        />
                <div 
          className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2" 
          style={{ willChange: 'transform' }}
        />
      </div>

      {/* Center Hole Ring */}
      <div 
        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full border border-gray-300 transform -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: 'transform' }}
      />
    </motion.div>
      
      {/* Shines overlay - doesn't spin */}
      <div className="absolute inset-0 pointer-events-none">
        <ShinesIcon className="w-full h-full opacity-60" />
      </div>
    </div>
  );
});

export default SpinningCD;