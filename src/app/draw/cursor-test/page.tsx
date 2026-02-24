'use client';

import { useState, useCallback, useRef } from 'react';
import '../draw.css';

// React cursor components (same as main draw page)
import { CustomCursor, CursorMode } from '../components/CustomCursor';
import { ClaudePencilCursor } from '../components/icons/claude-pencil-cursor';
import { ClaudeEraserCursor } from '../components/icons/claude-eraser-cursor';
import { ClaudeAsciiCursor } from '../components/icons/claude-ascii-cursor';
import { PencilCursor } from '../components/icons/pencil-cursor';
import { UserCursor } from '../components/icons/user-cursor';
import { PointerCursor } from '../components/icons/pointer-cursor';
import { GrabCursor } from '../components/icons/grab-cursor';
import { GrabbingCursor } from '../components/icons/grabbing-cursor';
import { CommentCursor } from '../components/icons/comment-cursor';
import { CommentBubble, CommentDialKit } from '../components/CommentSystem';
import type { Comment as DrawComment } from '../types';

// Types for drawing simulation
type Point = { x: number; y: number };
type Stroke = {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
};
type AsciiChar = {
  id: string;
  x: number;
  y: number;
  char: string;
};

// ASCII characters for ASCII brush
const ASCII_CHARS = ['#', '@', '*', '+', '~', '%', '&', '=', '-', '/', '\\', '|', '_', '^'];

// Cursor definitions for the sidebar (labels + which React component to render)
type CursorKey = 'user' | 'pointer' | 'grab' | 'grabbing' | 'pencil' | 'eraser' | 'ascii' | 'comment';
type ClaudeCursorKey = 'pencil' | 'eraser' | 'ascii';

const CURSOR_INFO: Record<CursorKey, { label: string; hotspot: [number, number] }> = {
  user: { label: 'Default Pointer', hotspot: [3, 3] },
  pointer: { label: 'Pointer (Clickable)', hotspot: [10, 2] },
  grab: { label: 'Grab (Ready)', hotspot: [11, 5] },
  grabbing: { label: 'Grabbing (Active)', hotspot: [11, 10] },
  pencil: { label: 'Pencil', hotspot: [3, 3] },
  eraser: { label: 'Eraser', hotspot: [3, 3] },
  ascii: { label: 'ASCII', hotspot: [8, 8] },
  comment: { label: 'Comment', hotspot: [3, 21] },
};

const CLAUDE_CURSOR_INFO: Record<ClaudeCursorKey, { label: string }> = {
  pencil: { label: 'Claude Pencil' },
  eraser: { label: 'Claude Eraser' },
  ascii: { label: 'Claude ASCII' },
};

// Render a user cursor React component by key (for sidebar previews)
function renderUserCursor(key: CursorKey, color = '#2F3557') {
  switch (key) {
    case 'user': return <UserCursor />;
    case 'pointer': return <PointerCursor />;
    case 'grab': return <GrabCursor />;
    case 'grabbing': return <GrabbingCursor />;
    case 'pencil': return <PencilCursor color={color} />;
    case 'eraser': return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182"/>
        <path fill="#febed4" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182"/>
        <path fill="#000" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182M10.773 5.084A2 2 0 0 0 9.36 4.5H7.394a2 2 0 0 0-1.414.586L3.967 7.099a.75.75 0 0 0 0 1.06l2.91 2.91 4.94-4.94zm9.258 9.259-7.153-7.155-4.94 4.94 7.155 7.152a.75.75 0 0 0 1.06 0l3.88-3.88a.75.75 0 0 0 0-1.06z"/>
      </svg>
    );
    case 'ascii': return (
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25.9873 18.5616C26.128 18.7022 26.207 18.893 26.207 19.0919C26.207 19.2908 26.128 19.4816 25.9873 19.6222L24.9267 20.6829C24.515 21.0945 24.0132 21.4047 23.4609 21.5888C22.9086 21.7729 22.321 21.8259 21.7447 21.7435C21.827 22.3199 21.774 22.9074 21.5899 23.4597C21.4058 24.012 21.0957 24.5139 20.684 24.9255L19.6234 25.9862C19.4827 26.1268 19.292 26.2058 19.093 26.2058C18.8941 26.2058 18.7034 26.1268 18.5627 25.9862C18.4221 25.8455 18.343 25.6548 18.343 25.4558C18.343 25.2569 18.4221 25.0662 18.5627 24.9255L19.6234 23.8649C20.0453 23.4429 20.2824 22.8706 20.2824 22.2739C20.2824 21.6771 20.0453 21.1048 19.6234 20.6829L16.9717 18.0312L15.9111 19.0919C15.7704 19.2325 15.5796 19.3116 15.3807 19.3116C15.1818 19.3116 14.9911 19.2325 14.8504 19.0919C14.7098 18.9512 14.6307 18.7605 14.6307 18.5616C14.6307 18.3626 14.7098 18.1719 14.8504 18.0312L15.9111 16.9706L13.2594 14.3189C12.8375 13.897 12.2652 13.6599 11.6684 13.6599C11.0717 13.6599 10.4994 13.897 10.0774 14.3189L9.01677 15.3796C8.87612 15.5202 8.68535 15.5992 8.48644 15.5992C8.28753 15.5992 8.09676 15.5202 7.95611 15.3796C7.81546 15.2389 7.73644 15.0482 7.73644 14.8492C7.73644 14.6503 7.81546 14.4596 7.95611 14.3189L9.01677 13.2583C9.42843 12.8466 9.93027 12.5364 10.4826 12.3523C11.0349 12.1682 11.6224 12.1153 12.1988 12.1976C12.1164 11.6213 12.1694 11.0337 12.3535 10.4814C12.5376 9.92911 12.8478 9.42727 13.2594 9.01561L14.3201 7.95495C14.4607 7.8143 14.6515 7.73528 14.8504 7.73528C15.0493 7.73528 15.2401 7.8143 15.3807 7.95495C15.5214 8.0956 15.6004 8.28637 15.6004 8.48528C15.6004 8.68419 15.5214 8.87496 15.3807 9.01561L14.3201 10.0763C13.8981 10.4982 13.6611 11.0705 13.6611 11.6673C13.6611 12.264 13.8981 12.8363 14.3201 13.2583L16.9717 15.9099L18.0324 14.8492C18.173 14.7086 18.3638 14.6296 18.5627 14.6296C18.7616 14.6296 18.9524 14.7086 19.093 14.8492C19.2337 14.9899 19.3127 15.1807 19.3127 15.3796C19.3127 15.5785 19.2337 15.7693 19.093 15.9099L18.0324 16.9706L20.684 19.6222C21.106 20.0442 21.6783 20.2812 22.275 20.2812C22.8718 20.2812 23.4441 20.0442 23.866 19.6222L24.9267 18.5616C25.0673 18.4209 25.2581 18.3419 25.457 18.3419C25.6559 18.3419 25.8467 18.4209 25.9873 18.5616Z" fill="black"/>
        <path d="M8.66322 12.9047L8.84276 12.7348C9.27259 12.3523 9.77647 12.0604 10.324 11.8779C10.7566 11.7337 11.2088 11.6617 11.6622 11.661C11.6629 11.2076 11.7348 10.7554 11.879 10.3228C12.0877 9.69702 12.4394 9.1285 12.9059 8.66206L13.9665 7.6014C14.2009 7.36698 14.5189 7.23542 14.8504 7.23542C15.1819 7.23542 15.4999 7.36698 15.7343 7.6014C15.9687 7.83582 16.1003 8.15376 16.1003 8.48528C16.1003 8.8168 15.9687 9.13475 15.7343 9.36917L14.6736 10.4298C14.3454 10.758 14.1612 11.2031 14.1612 11.6673C14.1612 12.1314 14.3454 12.5765 14.6736 12.9047L16.9717 15.2028L17.6788 14.4957C17.9132 14.2613 18.2312 14.1297 18.5627 14.1297C18.8942 14.1297 19.2122 14.2613 19.4466 14.4957C19.681 14.7301 19.8126 15.0481 19.8126 15.3796C19.8126 15.7111 19.681 16.029 19.4466 16.2635L18.7395 16.9706L21.0376 19.2687L21.166 19.3847C21.4774 19.6399 21.8689 19.781 22.275 19.781C22.7392 19.781 23.1843 19.5968 23.5125 19.2687L24.5731 18.208C24.8075 17.9736 25.1255 17.842 25.457 17.842C25.7885 17.842 26.1065 17.9736 26.3409 18.208C26.5753 18.4424 26.7069 18.7604 26.7069 19.0919C26.7069 19.4234 26.5753 19.7413 26.3409 19.9758L25.2802 21.0364C24.8138 21.5029 24.2453 21.8546 23.6195 22.0633C23.1867 22.2075 22.7342 22.2788 22.2805 22.2794C22.28 22.733 22.2087 23.1855 22.0644 23.6183C21.8557 24.2441 21.504 24.8126 21.0376 25.2791L19.9769 26.3397C19.7425 26.5741 19.4246 26.7057 19.093 26.7057C18.7615 26.7057 18.4436 26.5741 18.2092 26.3397C17.9747 26.1053 17.8432 25.7874 17.8432 25.4558C17.8432 25.1243 17.9747 24.8064 18.2092 24.572L19.2698 23.5113L19.3858 23.3829C19.641 23.0714 19.7822 22.68 19.7822 22.2739C19.7822 21.8097 19.598 21.3646 19.2698 21.0364L16.9717 18.7383L16.2646 19.4454C16.0302 19.6799 15.7123 19.8114 15.3807 19.8114C15.0492 19.8114 14.7313 19.6799 14.4968 19.4454C14.2624 19.211 14.1309 18.8931 14.1309 18.5616C14.1309 18.23 14.2624 17.9121 14.4968 17.6777L15.204 16.9706L12.9059 14.6725C12.5777 14.3443 12.1326 14.1601 11.6684 14.1601C11.2043 14.1601 10.7592 14.3443 10.431 14.6725L9.37032 15.7331C9.1359 15.9675 8.81796 16.0991 8.48644 16.0991C8.15492 16.0991 7.83698 15.9675 7.60256 15.7331C7.36814 15.4987 7.23657 15.1808 7.23657 14.8492C7.23657 14.5177 7.36814 14.1998 7.60256 13.9654L8.66322 12.9047Z" stroke="white" strokeWidth="1.25"/>
      </svg>
    );
    case 'comment': return <CommentCursor />;
  }
}

// Render a Claude cursor React component by key (for sidebar previews)
function renderClaudeCursor(key: ClaudeCursorKey, color = '#F3381A') {
  switch (key) {
    case 'pencil': return <ClaudePencilCursor color={color} />;
    case 'eraser': return <ClaudeEraserCursor />;
    case 'ascii': return <ClaudeAsciiCursor />;
  }
}

function CursorPreview({
  cursorKey,
  renderCursor,
  label,
  hotspot,
  isActive,
  onClick,
}: {
  cursorKey: string;
  renderCursor: React.ReactNode;
  label: string;
  hotspot?: [number, number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        background: isActive ? 'var(--gray-100, rgba(47, 53, 87, 0.08))' : 'white',
        border: isActive ? '2px solid var(--slate, #2F3557)' : '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
        borderRadius: 12,
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 80,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {renderCursor}
      </div>
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--slate, #2F3557)',
          marginBottom: 2,
        }}>
          {label}
        </div>
        {hotspot && (
          <div style={{
            fontSize: 11,
            color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
          }}>
            Hotspot: ({hotspot[0]}, {hotspot[1]})
          </div>
        )}
      </div>
    </button>
  );
}

function InteractiveZone({
  title,
  description,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: 24,
        background: 'white',
        borderRadius: 16,
        border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--slate, #2F3557)' }}>
          {title}
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>
          {description}
        </p>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
        borderRadius: 8,
        padding: 16,
      }}>
        {children || (
          <span style={{ color: 'var(--gray-400, rgba(47, 53, 87, 0.35))', fontSize: 13 }}>
            Move cursor here to test
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableBox({ onDragStateChange }: { onDragStateChange: (isDragging: boolean) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onDragStateChange(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onDragStateChange(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          position: 'absolute',
          left: `calc(50% + ${position.x}px - 30px)`,
          top: `calc(50% + ${position.y}px - 30px)`,
          boxShadow: isDragging
            ? '0 10px 30px rgba(102, 126, 234, 0.4)'
            : '0 4px 12px rgba(102, 126, 234, 0.3)',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        Drag me
      </div>
    </div>
  );
}

function ClickableButtons() {
  const [clickCount, setClickCount] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button
        onClick={() => setClickCount(c => c + 1)}
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Clicks: {clickCount}
      </button>
      <button
        onClick={() => setClickCount(0)}
        style={{
          padding: '10px 20px',
          background: 'var(--gray-200, rgba(47, 53, 87, 0.1))',
          border: 'none',
          borderRadius: 8,
          color: 'var(--slate, #2F3557)',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Reset
      </button>
    </div>
  );
}

// Comment bubble wrapper with local state (same pattern as comment-states/page.tsx ShowcaseBubble)
function CanvasComment({ comment, index, onDelete, strokeColor }: {
  comment: DrawComment;
  index: number;
  onDelete: () => void;
  strokeColor: string;
}) {
  const [replyText, setReplyText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [localComment, setLocalComment] = useState(comment);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);

  const isTemp = localComment.status === 'temp';
  const visualState: 'collapsed' | 'preview' | 'open' = isOpen
    ? 'open'
    : isHovered && !isTemp
      ? 'preview'
      : 'collapsed';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CommentBubble
        comment={localComment}
        commentIndex={index}
        visualState={visualState}
        isUserComment={localComment.from === 'human'}
        isTemp={isTemp}
        isReplying={isReplying}
        replyText={replyText}
        setReplyText={setReplyText}
        strokeColor={strokeColor}
        onBubbleMouseEnter={() => {
          if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
          setIsHovered(true);
        }}
        onBubbleMouseLeave={() => {
          leaveTimer.current = setTimeout(() => {
            setIsHovered(false);
            if (isOpen) { setIsOpen(false); setIsReplying(false); setReplyText(''); }
          }, 80);
        }}
        onOpen={() => setIsOpen(true)}
        onDelete={onDelete}
        onReplyStart={() => setIsReplying(true)}
        onReplyCancel={() => { setIsReplying(false); setReplyText(''); }}
        onReplySubmit={() => {
          if (replyText.trim()) {
            setLocalComment(prev => ({
              ...prev,
              replies: [...(prev.replies || []), { text: replyText, from: 'human' as const }],
            }));
            setReplyText('');
            setIsReplying(false);
          }
        }}
        onSave={isTemp ? () => setLocalComment(prev => ({ ...prev, status: 'saved' })) : undefined}
        onDismiss={isTemp ? onDelete : undefined}
      />
    </div>
  );
}

// Functional Drawing Canvas with real CommentBubble
function DrawingCanvas({
  tool,
  isClaudeSide,
}: {
  tool: 'pencil' | 'eraser' | 'ascii' | 'comment';
  isClaudeSide: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [asciiChars, setAsciiChars] = useState<AsciiChar[]>([]);
  const [comments, setComments] = useState<DrawComment[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState<Point | null>(null);

  const strokeColor = isClaudeSide ? '#F3381A' : '#2F3557';

  const getRelativePos = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePos(e);
    if (tool === 'pencil') {
      setIsDrawing(true);
      setCurrentStroke([pos]);
    } else if (tool === 'eraser') {
      setIsDrawing(true);
      eraseAt(pos);
    } else if (tool === 'ascii') {
      const char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
      setAsciiChars(prev => [...prev, { id: `ascii-${Date.now()}`, x: pos.x, y: pos.y, char }]);
    } else if (tool === 'comment') {
      setPendingCommentPos(pos);
      setCommentInput('');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getRelativePos(e);
    if (tool === 'pencil') {
      setCurrentStroke(prev => [...prev, pos]);
    } else if (tool === 'eraser') {
      eraseAt(pos);
    }
  };

  const handleMouseUp = () => {
    if (tool === 'pencil' && currentStroke.length > 1) {
      setStrokes(prev => [...prev, {
        id: `stroke-${Date.now()}`,
        points: currentStroke,
        color: strokeColor,
        strokeWidth: 3,
      }]);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const eraseAt = (pos: Point) => {
    const eraseRadius = 15;
    setStrokes(prev => prev.filter(stroke =>
      !stroke.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < eraseRadius)
    ));
    setAsciiChars(prev => prev.filter(char =>
      Math.hypot(char.x - pos.x, char.y - pos.y) >= eraseRadius
    ));
    setComments(prev => prev.filter(comment =>
      Math.hypot(comment.x - pos.x, comment.y - pos.y) >= eraseRadius + 20
    ));
  };

  const submitComment = () => {
    if (pendingCommentPos && commentInput.trim()) {
      setComments(prev => [...prev, {
        text: commentInput.trim(),
        x: pendingCommentPos.x,
        y: pendingCommentPos.y,
        from: isClaudeSide ? 'claude' as const : 'human' as const,
        status: 'saved' as const,
      }]);
    }
    setPendingCommentPos(null);
    setCommentInput('');
  };

  const pointsToPath = (points: Point[]): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Clear button */}
      <button
        onClick={() => { setStrokes([]); setAsciiChars([]); setComments([]); }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 8px',
          fontSize: 10,
          background: 'white',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 4,
          zIndex: 10,
        }}
      >
        Clear
      </button>

      {/* Drawing area */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      >
        {/* SVG layer for strokes */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {strokes.map(stroke => (
            <path
              key={stroke.id}
              d={pointsToPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke.length > 1 && (
            <path
              d={pointsToPath(currentStroke)}
              stroke={strokeColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}
        </svg>

        {/* ASCII characters */}
        {asciiChars.map(char => (
          <div
            key={char.id}
            style={{
              position: 'absolute',
              left: char.x,
              top: char.y,
              transform: 'translate(-50%, -50%)',
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: 'bold',
              color: strokeColor,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {char.char}
          </div>
        ))}

        {/* Real CommentBubble components */}
        {comments.map((comment, i) => (
          <div
            key={i}
            className="draw-comment-anchor"
            style={{
              position: 'absolute',
              left: comment.x,
              top: comment.y,
              transform: 'translate(-10px, -100%)',
              pointerEvents: 'auto',
            }}
          >
            <CanvasComment
              comment={comment}
              index={i}
              onDelete={() => setComments(prev => prev.filter((_, j) => j !== i))}
              strokeColor={strokeColor}
            />
          </div>
        ))}

        {/* Comment input popup */}
        {pendingCommentPos && (
          <div
            style={{
              position: 'absolute',
              left: pendingCommentPos.x,
              top: pendingCommentPos.y,
              transform: 'translate(-10px, -100%)',
              background: 'white',
              border: '2px solid #2F3557',
              borderRadius: 8,
              padding: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              zIndex: 20,
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitComment();
                if (e.key === 'Escape') setPendingCommentPos(null);
              }}
              placeholder="Add comment..."
              autoFocus
              style={{ border: 'none', outline: 'none', fontSize: 12, width: 120 }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button
                onClick={submitComment}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: '#2F3557',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                Add
              </button>
              <button
                onClick={() => setPendingCommentPos(null)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: '#eee',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tool indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '4px 8px',
            background: isClaudeSide ? 'rgba(243, 56, 26, 0.1)' : 'rgba(47, 53, 87, 0.05)',
            borderRadius: 4,
            fontSize: 10,
            color: isClaudeSide ? '#F3381A' : '#666',
            pointerEvents: 'none',
          }}
        >
          {tool.charAt(0).toUpperCase() + tool.slice(1)} tool active
        </div>
      </div>
    </div>
  );
}

export default function CursorTestPage() {
  const [selectedCursor, setSelectedCursor] = useState<CursorKey>('user');
  const [selectedClaudeTool, setSelectedClaudeTool] = useState<ClaudeCursorKey>('pencil');

  // Page-level cursor tracking (same as main draw page)
  const [pageCursorPos, setPageCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);

  // Zone-level cursor overrides
  const [zoneCursorOverride, setZoneCursorOverride] = useState<CursorMode | null>(null);
  const [showClaudeCursor, setShowClaudeCursor] = useState(false);
  const [claudeTestTool, setClaudeTestTool] = useState<ClaudeCursorKey>('pencil');
  const isOnCanvasRef = useRef(false);

  // Compute cursor mode (same priority chain as main draw page)
  const cursorMode: CursorMode = (() => {
    if (zoneCursorOverride) return zoneCursorOverride;
    if (isOnCanvasRef.current) {
      const toolMap: Record<string, CursorMode> = { pencil: 'pencil', eraser: 'eraser', ascii: 'ascii', comment: 'comment' };
      if (toolMap[selectedCursor]) return toolMap[selectedCursor];
    }
    if (isHoveringInteractive) return 'pointer';
    return 'user';
  })();

  return (
    <div
      className="draw-page"
      style={{
        position: 'relative',
        minHeight: '100vh',
        height: 'auto',
        overflow: 'auto',
        background: 'var(--lightgray, #FBFBFC)',
        fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      onMouseMove={(e) => {
        setPageCursorPos({ x: e.clientX, y: e.clientY });
        const target = e.target as HTMLElement;
        const interactive = target.closest('button, a, label, [role="button"], .cursor-pointer, input[type="range"]');
        setIsHoveringInteractive(interactive !== null);
      }}
      onMouseLeave={() => setPageCursorPos(null)}
    >
      {/* CommentDialKit for CSS variables */}
      <CommentDialKit />

      {/* Header */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
        background: 'white',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--slate, #2F3557)', letterSpacing: '-0.02em' }}>
          Cursor Test Page
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>
          Test custom cursors for the draw app. Uses the same React cursor components as the main page.
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 85px)' }}>
        {/* Sidebar - Cursor Selection */}
        <div style={{
          width: 340,
          padding: 24,
          borderRight: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
          background: 'white',
          overflowY: 'auto',
        }}>
          {/* Navigation Cursors */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Navigation Cursors
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['user', 'pointer', 'grab', 'grabbing'] as CursorKey[]).map((key) => (
                <CursorPreview
                  key={key}
                  cursorKey={key}
                  renderCursor={renderUserCursor(key)}
                  label={CURSOR_INFO[key].label}
                  hotspot={CURSOR_INFO[key].hotspot}
                  isActive={selectedCursor === key}
                  onClick={() => setSelectedCursor(key)}
                />
              ))}
            </div>
          </div>

          {/* Tool Cursors */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tool Cursors (User)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                <CursorPreview
                  key={key}
                  cursorKey={key}
                  renderCursor={renderUserCursor(key)}
                  label={CURSOR_INFO[key].label}
                  hotspot={CURSOR_INFO[key].hotspot}
                  isActive={selectedCursor === key}
                  onClick={() => setSelectedCursor(key)}
                />
              ))}
            </div>
          </div>

          {/* Claude Cursors */}
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Claude Cursors (Opus)
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--gray-400, rgba(47, 53, 87, 0.35))' }}>
              React components with OpusLabel pill badge
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['pencil', 'eraser', 'ascii'] as ClaudeCursorKey[]).map((key) => (
                <CursorPreview
                  key={`claude-${key}`}
                  cursorKey={key}
                  renderCursor={renderClaudeCursor(key)}
                  label={CLAUDE_CURSOR_INFO[key].label}
                  isActive={selectedClaudeTool === key}
                  onClick={() => setSelectedClaudeTool(key)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Test Zones */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {/* Selected User Cursor Test */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--slate, #2F3557)' }}>
              Selected User Cursor: {CURSOR_INFO[selectedCursor].label}
            </h2>
            <div
              onMouseEnter={() => { isOnCanvasRef.current = true; }}
              onMouseLeave={() => { isOnCanvasRef.current = false; }}
              style={{
                padding: 32,
                background: 'white',
                borderRadius: 16,
                border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'var(--gray-400, rgba(47, 53, 87, 0.35))', fontSize: 14 }}>
                Move your cursor here to test the selected user cursor
              </span>
            </div>
          </div>

          {/* Selected Claude Cursor Test */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--slate, #2F3557)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Selected Claude Cursor: {CLAUDE_CURSOR_INFO[selectedClaudeTool].label}
              <span style={{
                fontSize: 10, padding: '3px 8px',
                background: 'rgba(243, 56, 26, 0.1)', color: 'rgba(243, 56, 26, 0.8)',
                borderRadius: 4, fontWeight: 600,
              }}>
                + opus
              </span>
            </h2>
            <div
              onMouseEnter={() => { setShowClaudeCursor(true); setClaudeTestTool(selectedClaudeTool); }}
              onMouseLeave={() => { setShowClaudeCursor(false); }}
              style={{
                padding: 32,
                background: 'linear-gradient(135deg, rgba(243, 56, 26, 0.05) 0%, rgba(243, 56, 26, 0.02) 100%)',
                borderRadius: 16,
                border: '1px solid rgba(243, 56, 26, 0.15)',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'rgba(243, 56, 26, 0.5)', fontSize: 14 }}>
                Move your cursor here to test the Claude cursor with OpusLabel
              </span>
            </div>
          </div>

          {/* Interactive Test Zones */}
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--slate, #2F3557)' }}>
            Interactive Test Zones
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Pointer Test */}
            <InteractiveZone
              title="Clickable Elements"
              description="Hover over buttons to see pointer cursor"
            >
              <ClickableButtons />
            </InteractiveZone>

            {/* Grab/Hand Test */}
            <InteractiveZone
              title="Draggable Element"
              description="Drag the box to see grab/hand cursors"
              style={{ minHeight: 220 }}
              onMouseEnter={() => setZoneCursorOverride('grab')}
              onMouseLeave={() => setZoneCursorOverride(null)}
            >
              <DraggableBox
                onDragStateChange={(isDragging) => setZoneCursorOverride(isDragging ? 'grabbing' : 'grab')}
              />
            </InteractiveZone>

            {/* All Tool Cursors */}
            <InteractiveZone
              title="All Tool Cursors (User)"
              description="Hover each section to see different tool cursors"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%' }}>
                {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                  <div
                    key={key}
                    onMouseEnter={() => setZoneCursorOverride(key as CursorMode)}
                    onMouseLeave={() => setZoneCursorOverride(null)}
                    style={{
                      padding: 16,
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
                      fontWeight: 500,
                    }}
                  >
                    {CURSOR_INFO[key].label}
                  </div>
                ))}
              </div>
            </InteractiveZone>

            {/* All Claude Cursors */}
            <InteractiveZone
              title="All Claude Cursors (Opus)"
              description="Hover each section to see Claude cursors with Opus label"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
                {(['pencil', 'eraser', 'ascii'] as ClaudeCursorKey[]).map((key) => (
                  <div
                    key={key}
                    onMouseEnter={() => { setShowClaudeCursor(true); setClaudeTestTool(key); }}
                    onMouseLeave={() => { setShowClaudeCursor(false); }}
                    style={{
                      padding: 16,
                      background: 'rgba(243, 56, 26, 0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(243, 56, 26, 0.15)',
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'rgba(243, 56, 26, 0.7)',
                      fontWeight: 500,
                    }}
                  >
                    {CURSOR_INFO[key].label}
                  </div>
                ))}
              </div>
            </InteractiveZone>
          </div>

          {/* Canvas Simulation */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--slate, #2F3557)' }}>
              Canvas Simulation
            </h2>
            <div style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
              overflow: 'hidden',
            }}>
              {/* Toolbar */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
                display: 'flex',
                gap: 32,
                alignItems: 'center',
              }}>
                {/* User tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', fontWeight: 500 }}>User:</span>
                  {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCursor(key)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: selectedCursor === key ? '2px solid var(--slate, #2F3557)' : '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                        borderRadius: 6,
                        background: selectedCursor === key ? 'var(--gray-100, rgba(47, 53, 87, 0.08))' : 'white',
                        color: 'var(--slate, #2F3557)',
                      }}
                    >
                      {CURSOR_INFO[key].label}
                    </button>
                  ))}
                </div>

                {/* Claude tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(243, 56, 26, 0.7)', fontWeight: 500 }}>Claude:</span>
                  {(['pencil', 'eraser', 'ascii'] as ClaudeCursorKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedClaudeTool(key)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: selectedClaudeTool === key ? '2px solid rgba(243, 56, 26, 0.8)' : '1px solid rgba(243, 56, 26, 0.2)',
                        borderRadius: 6,
                        background: selectedClaudeTool === key ? 'rgba(243, 56, 26, 0.1)' : 'white',
                        color: 'rgba(243, 56, 26, 0.8)',
                      }}
                    >
                      {CURSOR_INFO[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas Area */}
              <div style={{
                height: 400,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 20px)',
                position: 'relative',
                display: 'flex',
              }}>
                {/* User drawing area */}
                <div
                  onMouseEnter={() => { isOnCanvasRef.current = true; setShowClaudeCursor(false); }}
                  onMouseLeave={() => { isOnCanvasRef.current = false; }}
                  style={{
                    flex: 1,
                    height: '100%',
                    borderRight: '2px dashed var(--gray-200, rgba(47, 53, 87, 0.1))',
                    position: 'relative',
                  }}
                >
                  <DrawingCanvas
                    tool={(['pencil', 'eraser', 'ascii', 'comment'].includes(selectedCursor) ? selectedCursor : 'pencil') as 'pencil' | 'eraser' | 'ascii' | 'comment'}
                    isClaudeSide={false}
                  />
                </div>

                {/* Claude drawing area */}
                <div
                  onMouseEnter={() => { isOnCanvasRef.current = true; setShowClaudeCursor(true); setClaudeTestTool(selectedClaudeTool); }}
                  onMouseLeave={() => { isOnCanvasRef.current = false; setShowClaudeCursor(false); }}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'rgba(243, 56, 26, 0.02)',
                    position: 'relative',
                  }}
                >
                  <DrawingCanvas
                    tool={selectedClaudeTool as 'pencil' | 'eraser' | 'ascii' | 'comment'}
                    isClaudeSide={true}
                  />
                </div>
              </div>

              {/* Legend */}
              <div style={{
                padding: 16,
                borderTop: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 4,
                    background: 'white', border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                  }} />
                  User cursor (no label)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 4,
                    background: 'rgba(243, 56, 26, 0.1)', border: '1px solid rgba(243, 56, 26, 0.2)',
                  }} />
                  Claude cursor (+ opus label)
                </div>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          <div style={{
            marginTop: 32,
            padding: 20,
            background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
            borderRadius: 12,
            fontSize: 12,
            color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--slate, #2F3557)' }}>
              How Cursor Implementation Works
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Native cursor hidden via <code>.draw-page, .draw-page * {'{'} cursor: none !important {'}'}</code></li>
              <li>User cursors rendered as React SVG components in a fixed-position <code>CustomCursor</code> div</li>
              <li>Claude cursors use dedicated React components with <code>OpusLabel</code> pill badge</li>
              <li>Mouse position tracked via <code>onMouseMove</code> at page level (clientX/clientY)</li>
              <li>CursorMode computed from state priority chain (zone override &gt; canvas tool &gt; interactive hover &gt; default)</li>
              <li>Hotspot offsets applied via CSS <code>transform: translate()</code> on inner wrapper</li>
              <li>Drop shadow via <code>filter: drop-shadow()</code> on the cursor container</li>
              <li>Comments use real <code>CommentBubble</code> component with hover/open/reply states</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Page-level custom cursor — same as main draw page */}
      {!showClaudeCursor && (
        <CustomCursor
          position={pageCursorPos}
          mode={cursorMode}
          strokeColor="#2F3557"
        />
      )}

      {/* Claude cursor overlay — shown when hovering Claude zones */}
      {showClaudeCursor && pageCursorPos && (
        <div
          className="draw-cursor"
          style={{
            position: 'fixed',
            left: pageCursorPos.x,
            top: pageCursorPos.y,
            filter: 'drop-shadow(0px 0.5px 2px rgba(0, 0, 0, 0.25))',
          }}
        >
          <div style={{ transform: 'translate(-3px, -3px)' }}>
            {claudeTestTool === 'ascii' ? <ClaudeAsciiCursor /> :
             claudeTestTool === 'eraser' ? <ClaudeEraserCursor /> :
             <ClaudePencilCursor color="#F3381A" />}
          </div>
        </div>
      )}
    </div>
  );
}
