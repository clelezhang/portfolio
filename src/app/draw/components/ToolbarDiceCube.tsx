// 3D Dice Cube component for toolbar palette switching

// Dice face rotations for 3D cube animation
const DICE_ROTATIONS: Record<number, string> = {
  0: 'rotateX(0deg) rotateY(0deg)',
  1: 'rotateX(0deg) rotateY(180deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(0deg) rotateY(90deg)',
  4: 'rotateX(-90deg) rotateY(0deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
};

const DICE_FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;

interface ToolbarDiceCubeProps {
  isAnimating: boolean;
  finalFace: number;
  clickCount?: number;
}

export function ToolbarDiceCube({ isAnimating, finalFace, clickCount = 1 }: ToolbarDiceCubeProps) {
  const spinMultiplier = clickCount * 360;

  return (
    <div className="toolbar-dice-cube-container">
      <div
        className={`toolbar-dice-cube ${isAnimating ? 'toolbar-dice-cube-rolling' : ''}`}
        style={{
          '--final-rotation': DICE_ROTATIONS[finalFace],
          '--cube-duration': '450ms',
          '--cube-easing': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          '--spin-x': `${spinMultiplier}deg`,
          '--spin-y': `${spinMultiplier * 0.7}deg`,
        } as React.CSSProperties}
      >
        {DICE_FACES.map((face, i) => (
          <div key={face} className={`toolbar-dice-face toolbar-dice-${face}`}>
            <img src={`/draw/dice${i + 1}.svg`} alt={String(i + 1)} />
          </div>
        ))}
      </div>
    </div>
  );
}
