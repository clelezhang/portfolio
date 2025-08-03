interface SpinningCDProps {
  artwork?: string;
  onClick: () => void;
  className?: string;
}

export default function SpinningCD({ 
  onClick,
  artwork = "https://picsum.photos/40/40?random=3", 
  className = "" 
}: SpinningCDProps) {
  return (
    <div className={`relative w-8 h-8 group ${className}`}>
      {/* Static Shadow */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-hover"
        style={{
          '--shadow-normal': '0 4px 8px rgba(75,49,48,0.2), 0 1px 2px rgba(75,49,48,0.1)',
          '--shadow-hover': '0 6px 12px rgba(75,49,48,0.25), 0 1px 2px rgba(75,49,48,0.15)',
          boxShadow: 'var(--shadow-normal)'
        } as React.CSSProperties}
      />
      
      <button
        onClick={onClick}
        className="absolute inset-0 rounded-full overflow-hidden bg-grey-200 transition-transform animate-spin cursor-pointer hover:scale-105"
        style={{
          animationDuration: '8s', // Slow rotation
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
        aria-label="Toggle music playback"
      >
      {/* Album Artwork with Center Hole Cutout */}
      <div 
        className="absolute inset-0 rounded-full bg-cover bg-center border border-grey-300"
        style={{
          backgroundImage: `url(${artwork})`,
          clipPath: 'circle(50% at 50% 50%)',
          WebkitClipPath: 'circle(50% at 50% 50%)',
          mask: 'radial-gradient(circle at center, transparent 0, transparent 15%, black 15%, black 100%)',
          WebkitMask: 'radial-gradient(circle at center, transparent 0, transparent 15%, black 15%, black 100%)'
        }}
      />

      {/* CD Data Rings */}
      <div className="absolute inset-0 rounded-full">
        {/* Center rings */}
        <div className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border border-grey-100 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-5 h-5 rounded-full border border-grey-100 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full border border-grey-100 transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Center Hole Ring */}
      <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full border border-grey-300 transform -translate-x-1/2 -translate-y-1/2" />
      </button>
    </div>
  );
}