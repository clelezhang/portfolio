interface ProgressBarProps {
  progress: number; // 0 to 100
  isAnimating: boolean;
  className?: string;
}

export default function ProgressBar({ 
  progress, 
  isAnimating, 
  className = "" 
}: ProgressBarProps) {
  return (
    <div className={`w-full h-0.5 bg-grey-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full bg-red rounded-full transition-all duration-200 ${
          isAnimating ? 'ease-linear' : 'ease-out'
        }`}
        style={{
          width: `${progress}%`,
          transition: isAnimating ? 'width 0.5s linear' : 'width 0.2s ease-out'
        }}
      />
    </div>
  );
}