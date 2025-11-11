export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'color-burn'
  | 'color-dodge';

export type BaseLayer = {
  id: string;
  type: 'ascii' | 'gradient' | 'grid';
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
};

export type DitheringType = 'random' | '2x2' | '4x4' | '8x8';

export type AsciiLayer = BaseLayer & {
  type: 'ascii';
  source: { img: HTMLImageElement };
  charSet: 'numbers' | 'normal' | 'custom';
  customCharSet?: string;
  charSize: number; // px cell size - each dithered pixel becomes this size
  lineHeight: number;
  letterSpacing: number;
  color: string;
  glow: { enabled: boolean; radius: number; intensity: number; color?: string };
  offset: { x: number; y: number };
  // Dithering settings (always applied via Paper)
  dithering: {
    type: DitheringType;
    colorSteps: number; // Number of brightness levels (2-16)
    pixelSize: number; // Size of dithered pixels before ASCII mapping
    originalColors: boolean; // Use original image colors vs custom palette
    colorFront: string; // Primary color (when originalColors = false)
    colorBack: string; // Background color (when originalColors = false)
    colorHighlight: string; // Highlight color (when originalColors = false)
    animate: boolean; // Enable dither animation
    animationSpeed: number; // Animation speed multiplier (0.1 - 2.0)
    blur: number; // Blur amount for gradient-like effect (0-50)
    stretchX: number; // Horizontal stretch for gradient-like effect (1-5)
    stretchY: number; // Vertical stretch for gradient-like effect (1-5)
  };
  // Debug: show dithered output directly without ASCII conversion
  showDitherOnly: boolean;
  // Reverse character mapping (for dark backgrounds)
  reverseCharacterMapping: boolean;
};

export type GradientLayer = BaseLayer & {
  type: 'gradient';
  colors: string[]; // Array of up to 7 colors for Paper's GrainGradient
  colorBack: string; // Background color
  softness: number; // Color transition sharpness (0-1)
  intensity: number; // Distortion between color bands (fixed at 0.08)
  noise: number; // Grainy noise overlay (fixed at 0)
  shape: 'wave' | 'dots' | 'truchet' | 'corners' | 'ripple' | 'blob' | 'sphere';
  speed: number; // Animation speed
  scale: number; // Scale of the gradient pattern
  rotation: number; // Rotation in degrees
  offsetX: number; // Horizontal offset
  offsetY: number; // Vertical offset
};

export type GridLayer = BaseLayer & {
  type: 'grid';
  columns: number;
  rows: number;
  lineColor: string;
  lineWidth: number;
};

export type Layer = AsciiLayer | GradientLayer | GridLayer;

export type AppState = {
  canvas: { width: number; height: number; background: string };
  layers: Layer[];
  selectedLayerIds: string[];
  history: {
    past: Omit<AppState, 'history'>[];
    future: Omit<AppState, 'history'>[];
  };
};

export type HistoryActions = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

