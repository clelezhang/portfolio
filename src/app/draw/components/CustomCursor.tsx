import { Point, Tool } from '../types';
import { PencilCursor } from './icons/PencilCursor';
import { CommentCursor } from './icons/CommentCursor';

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
        <img
          src="/draw/asciicursor.svg"
          alt=""
          className="w-[34px] h-[34px]"
          style={{ transform: 'translate(-5px, -5px)' }}
        />
      )}
      {tool === 'erase' && (
        <img src="/draw/erasercursor..svg" alt="" className="w-6 h-6" />
      )}
      {tool === 'comment' && (
        <CommentCursor color={strokeColor} />
      )}
    </div>
  );
}
