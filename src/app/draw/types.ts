// Draw page type definitions

export interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

export interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path' | 'ellipse' | 'polygon';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  opacity?: number; // 0-1 for atmospheric depth, shadows, glows
  transform?: string; // SVG transform: "translate(x,y)" "rotate(deg)" "scale(x,y)"
  layer?: 'back' | 'front'; // render order: back (behind), front (default)
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number; // ellipse x-radius
  ry?: number; // ellipse y-radius
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][]; // for polygon/polyline: [[x1,y1], [x2,y2], ...]
  d?: string;
}

export type DrawMode = 'all' | 'shapes' | 'ascii';

export type Tool = 'select' | 'draw' | 'erase' | 'comment';

export interface UploadedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Turn {
  who: 'human' | 'claude';
  description?: string;
  shapes?: Shape[]; // Claude's actual shape output for continuity
  blocks?: AsciiBlock[]; // Claude's actual ASCII output
}

export interface CommentReply {
  text: string;
  from: 'human' | 'claude';
}

export interface Comment {
  text: string;
  x: number;
  y: number;
  from: 'human' | 'claude';
  replies?: CommentReply[];
}

export interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

export interface HumanAsciiChar {
  char: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface DrawingElement {
  id: string;
  source: 'human' | 'claude';
  type: 'stroke' | 'shape';
  data: HumanStroke | Shape;
}

export interface Point {
  x: number;
  y: number;
}

export type CanvasBackground = 'none' | 'grid' | 'dots';
