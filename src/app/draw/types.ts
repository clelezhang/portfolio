// Draw page type definitions

export interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

export interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][];
  d?: string;
}

export type DrawMode = 'all' | 'shapes' | 'ascii';

export type Tool = 'draw' | 'erase' | 'comment';

export interface Turn {
  who: 'human' | 'claude';
  description?: string;
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
