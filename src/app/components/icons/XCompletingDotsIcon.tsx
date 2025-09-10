'use client';

interface XCompletingDotsIconProps {
  className?: string;
  size?: number;
}

export default function XCompletingDotsIcon({ 
  className = "", 
  size = 40 
}: XCompletingDotsIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      fill="red"
      viewBox="0 0 40 40"
      className={className}
    >
      {/* Diagonal dots - main line */}
      {/* Bottom-left dot */}
      <circle
        r="1.5"
        fill="#787B92"
        cx="15.075"
        cy="15.05"
      />
      
      {/* Center dot */}
      <circle
        r="1.5"
        fill="#787B92"
        cx="20.025"
        cy="20"
      />
      
      {/* Top-right dot */}
      <circle
        r="1.5"
        fill="#787B92"
        cx="24.975"
        cy="24.95"
      />
      
      {/* Additional dots to complete X pattern */}
      {/* Top-left dot - lighter opacity */}
      <circle
        r="1.5"
        fill="#2F3557"
        fillOpacity="0"
        cx="15.025"
        cy="24.95"
      />
      
      {/* Bottom-right dot */}
      <circle
        r="1.5"
        fillOpacity="0"
        fill="#2F3557"
        cx="19.975"
        cy="19.98"
      />
      
      {/* Top dot */}
      <circle
        r="1.5"
        fillOpacity="0"
        fill="#2F3557"
        cx="24.925"
        cy="15.05"
      />
    </svg>
  );
}
