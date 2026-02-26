'use client';

type ProgressBarProps = {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function ProgressBar({ total, current, onNavigate, onPrev, onNext }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <button
        className="progress-bar-btn"
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Previous stage"
      >
        &larr; Back
      </button>
      <div className="progress-bar-dots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={`progress-bar-dot ${i === current ? 'active' : ''}`}
            onClick={() => onNavigate(i)}
            aria-label={`Go to stage ${i + 1}`}
          />
        ))}
      </div>
      <button
        className="progress-bar-btn"
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Next stage"
      >
        Next &rarr;
      </button>
    </div>
  );
}
