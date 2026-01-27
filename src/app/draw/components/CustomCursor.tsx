import { Point, Tool } from '../types';
import { PencilCursor } from './icons/PencilCursor';
import { CommentCursor } from './icons/CommentCursor';
import { AsciiCursor } from './icons/AsciiCursor';
import { EraserCursor } from './icons/EraserCursor';

interface CustomCursorProps {
  cursorPos: Point | null;
  isPanning: boolean;
  tool: Tool;
  asciiStroke: boolean;
  strokeColor: string;
}

export function CustomCursor({
  cursorPos,
  isPanning,
  tool,
  asciiStroke,
  strokeColor,
}: CustomCursorProps) {
  if (!cursorPos || isPanning) return null;

  return (
    <div
      className="draw-cursor"
      style={{
        left: cursorPos.x,
        top: cursorPos.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {tool === 'draw' && !asciiStroke && (
        <PencilCursor color={strokeColor} />
      )}
      {tool === 'draw' && asciiStroke && (
        <div style={{ transform: 'translate(-5px, -5px)' }}>
          <AsciiCursor />
        </div>
      )}
      {tool === 'erase' && (
        <EraserCursor />
      )}
      {tool === 'comment' && (
        <CommentCursor color={strokeColor} />
      )}
    </div>
  );
}
