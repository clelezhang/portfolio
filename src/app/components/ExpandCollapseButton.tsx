'use client';

import { motion } from 'framer-motion';
import DiagonalDotsIcon from './icons/DiagonalDotsIcon';
import XCompletingDotsIcon from './icons/XCompletingDotsIcon';

interface ExpandCollapseButtonProps {
  isExpanded: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
}

export default function ExpandCollapseButton({ 
  isExpanded, 
  onClick, 
  className = "", 
  size = 40 
}: ExpandCollapseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 flex items-center justify-center bg-gray-50 backdrop-blur-[20px] hover:bg-gray-100 rounded-full transition-colors ${className}`}
      aria-label={isExpanded ? "Collapse menu" : "Expand menu"}
    >
      {/* First icon - diagonal dots (always stays in place) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <DiagonalDotsIcon size={size} />
      </div>

      {/* Second icon - completing X dots (rotates in when expanding) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={isExpanded ? {
          rotate: 0,
          transition: { 
            duration: 0.4, 
            ease: "easeInOut",
            delay: 0.1
          }
        } : {
          rotate: -90,
          transition: { 
            duration: 0.3, 
            ease: "easeInOut"
          }
        }}
      >
        <XCompletingDotsIcon size={size} />
      </motion.div>
    </button>
  );
}
