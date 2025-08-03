interface ScrollingTitleProps {
  title: string;
  className?: string;
}

export default function ScrollingTitle({ 
  title, 
  className = "" 
}: ScrollingTitleProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div 
        className="whitespace-nowrap animate-scroll text-xs font-sans"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, currentColor 10%, currentColor 90%, transparent 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'scroll 15s linear infinite'
        }}
      >
        {title}
      </div>
      
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .animate-scroll {
          animation: scroll 15s linear infinite;
        }
      `}</style>
    </div>
  );
}