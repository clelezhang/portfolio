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
      className={`expand-button ${className}`}
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
          rotate: -90,
          transition: { 
            type: "spring",
            stiffness: 500,
            damping: 25,
          }
        } : {
          rotate: 0,
          transition: { 
            type: "spring",
            stiffness: 400,
            damping: 38,
            mass: 1.8,
          }
        }}
      >
        <XCompletingDotsIcon size={size} />
      </motion.div>
    </button>
  );
}
