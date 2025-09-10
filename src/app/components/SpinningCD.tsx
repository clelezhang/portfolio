'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import ShinesIcon from './icons/ShinesIcon';

interface SpinningCDProps {
  artwork?: string;
  className?: string;
}

const SpinningCD = memo(function SpinningCD({ 
  artwork = "/cd.png", 
  className = "" 
}: SpinningCDProps) {
  return (
    <div className={`relative w-8 h-8 group ${className}`}>
      {/* Static Shadow */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-hover cd-shadow-container"
      />
      
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden bg-gray-300 cd-spinning-disc"
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        whileHover={{ scale: 1.05 }}
      >
      {/* Album Artwork with Center Hole Cutout */}
      <div 
        className="absolute inset-0 rounded-full bg-cover bg-center border border-gray-300 cd-artwork-mask"
        style={{
          backgroundImage: `url(${artwork})`
        }}
      />

      {/* CD Data Rings */}
      <div className="absolute inset-0 rounded-full">
        {/* Center rings */}
        <div 
          className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
        />
        <div 
          className="absolute top-1/2 left-1/2 w-5 h-5 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
        />
                <div 
          className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
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