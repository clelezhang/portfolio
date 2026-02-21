'use client';
import '../draw.css';
import { useState, useRef, useCallback } from 'react';
import { CommentBubble, CommentDialKit } from '../components/CommentSystem';
import { SubmitArrowIcon } from '../components/icons';
import type { Comment, Point, HumanStroke } from '../types';

// ─── Sample data ────────────────────────────────────────────────────────────

const SHORT = 'Nice line!';
const MEDIUM = 'I really like where this is heading — the composition feels balanced.';
const LONG =
  'This is a longer comment that should overflow the preview bubble and trigger the three-line clamp with an ellipsis at the end, demonstrating how truncation works. This is a longer comment that should overflow the preview bubble and trigger the three-line clamp with an ellipsis at the end, demonstrating how truncation works. This is a longer comment that should overflow the preview bubble and trigger the three-line clamp with an ellipsis at the end, demonstrating how truncation works.';

const REPLIES: Comment['replies'] = [
  { text: 'Thanks, I was going for that!', from: 'human' },
  { text: 'Agreed, the balance works well here.', from: 'claude' },
];

function makeComment(
  text: string,
  from: 'human' | 'claude',
  status: 'saved' | 'temp' = 'saved',
  replies?: Comment['replies'],
): Comment {
  return {
    text, x: 0, y: 0, from, status, replies,
    tempStartedAt: status === 'temp' ? Date.now() : undefined,
  };
}

// ─── Drawing constants ──────────────────────────────────────────────────────

const STROKE_COLOR = '#25667F';
const STROKE_WIDTH = 6;

// ─── Bubble wrapper with local reply state ───────────────────────────────────

interface ShowcaseBubbleProps {
  comment: Comment;
  initialState?: 'collapsed' | 'preview' | 'open';
  isReplying?: boolean;
  closeKey?: number;
}

function ShowcaseBubble({ comment, initialState = 'collapsed', isReplying: initialReplying = false, closeKey }: ShowcaseBubbleProps) {
  const [replyText, setReplyText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(initialState === 'open');
  const [isReplying, setIsReplying] = useState(initialReplying);
  const [localComment, setLocalComment] = useState(comment);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);
  const closeKeyRef = useRef(closeKey);

  // Close when backdrop is clicked (closeKey increments)
  if (closeKey !== closeKeyRef.current) {
    closeKeyRef.current = closeKey;
    if (isOpen) {
      setIsOpen(false);
      setIsReplying(false);
      setReplyText('');
    }
  }

  const visualState: 'collapsed' | 'preview' | 'open' = isOpen
    ? 'open'
    : isHovered || initialState === 'preview'
      ? 'preview'
      : 'collapsed';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        leaveTimer.current = setTimeout(() => {
          setIsHovered(false);
          if (isOpen) {
            setIsOpen(false);
            setIsReplying(false);
            setReplyText('');
          }
        }, 80);
      }}
    >
      <CommentBubble
        comment={localComment}
        commentIndex={0}
        visualState={visualState}
        isUserComment={localComment.from === 'human'}
        isTemp={localComment.status === 'temp'}
        isReplying={isReplying}
        replyText={replyText}
        setReplyText={setReplyText}
        strokeColor="#888"
        onOpen={() => setIsOpen(true)}
        onDelete={() => {}}
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
        onSave={localComment.status === 'temp' ? () => setLocalComment(prev => ({ ...prev, status: 'saved' })) : undefined}
        onDismiss={localComment.status === 'temp' ? () => {} : undefined}
      />
    </div>
  );
}

// ─── Comment Input showcase (no backdrop/positioning) ────────────────────────

function ShowcaseCommentInput({ prefilled = false }: { prefilled?: boolean }) {
  const text = prefilled ? 'Nice composition overall!' : '';
  return (
    <div className="draw-comment-input-bubble" style={{ pointerEvents: 'none', '--stroke-color': '#888' } as React.CSSProperties}>
      <img src="/draw/user-icon.svg" alt="" className="draw-comment-input-icon" />
      <div className="draw-comment-input-field-wrapper">
        <textarea
          value={text}
          readOnly
          placeholder="Add a comment"
          className="draw-comment-input draw-comment-input--plain"
          rows={1}
        />
        <button
          type="button"
          disabled={!text.trim()}
          className={`draw-comment-btn draw-comment-submit${text.trim() ? '' : ' draw-comment-submit--empty'}`}
        >
          <SubmitArrowIcon />
        </button>
      </div>
    </div>
  );
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <p style={{
        fontFamily: 'monospace', fontSize: 10, color: '#999', marginBottom: 20,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        {children}
      </div>
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ccc', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommentStatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [closeKey, setCloseKey] = useState(0);
  const lastPoint = useRef<Point | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);

  // ─── Drawing handlers ────────────────────────────────────────────────

  const getPoint = useCallback((e: React.MouseEvent): Point => {
    return { x: e.clientX, y: e.clientY };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true);
    const point = getPoint(e);
    lastPoint.current = point;
    setCurrentStroke({
      d: `M ${point.x} ${point.y}`,
      color: STROKE_COLOR,
      strokeWidth: STROKE_WIDTH,
    });
  }, [getPoint]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !lastPoint.current) return;
    const point = getPoint(e);
    setCurrentStroke(prev => prev ? {
      ...prev,
      d: `${prev.d} L ${point.x} ${point.y}`,
    } : null);
    lastPoint.current = point;
  }, [isDrawing, getPoint]);

  const stopDrawing = useCallback(() => {
    if (currentStroke && currentStroke.d.includes('L')) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPoint.current = null;
  }, [currentStroke]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <CommentDialKit />
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--draw-bg-canvas)',
          backgroundImage: `
            linear-gradient(to right, #e5e5e5 1px, transparent 1px),
            linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* SVG drawing layer (fixed so strokes stay in viewport position) */}
      <svg className="fixed inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 1 }}>
        {strokes.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            stroke={stroke.color}
            strokeWidth={stroke.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {currentStroke && (
          <path
            d={currentStroke.d}
            stroke={currentStroke.color}
            strokeWidth={currentStroke.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Scrollable content with comment states — drawing handlers here so scroll works */}
      <div
        className="absolute inset-0"
        style={{ overflowY: 'auto', padding: '56px 64px', fontFamily: 'sans-serif', zIndex: 2, cursor: 'crosshair' }}
        onClick={() => setCloseKey(k => k + 1)}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={() => { if (isDrawing) stopDrawing(); }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 56 }}>
          <h1 style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 400, color: 'var(--draw-text-primary)', letterSpacing: '0.04em', opacity: 0.4 }}>
            /draw/comment-states — all comment bubble states (pencil mode active)
          </h1>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            style={{
              fontFamily: 'monospace', fontSize: 11, padding: '4px 12px',
              border: '1px solid #ccc', borderRadius: 4, background: '#fff',
              cursor: 'pointer', opacity: 0.6, flexShrink: 0,
            }}
          >
            Refresh
          </button>
        </div>

        <div key={refreshKey}>
        <Section label="Collapsed">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human')} initialState="collapsed" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude')} initialState="collapsed" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'temp')} initialState="collapsed" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'temp')} initialState="collapsed" />
          </Tile>
        </Section>

        <Section label="Preview — short text">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human')} initialState="preview" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude')} initialState="preview" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'temp')} initialState="preview" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'temp')} initialState="preview" />
          </Tile>
        </Section>

        <Section label="Preview — long text (3-line clamp)">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'human')} initialState="preview" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'claude')} initialState="preview" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'human', 'temp')} initialState="preview" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'claude', 'temp')} initialState="preview" />
          </Tile>
        </Section>

        <Section label="Open — no replies">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human')} initialState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'claude')} initialState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human', 'temp')} initialState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'claude', 'temp')} initialState="open" />
          </Tile>
        </Section>

        <Section label="Open — with replies">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'saved', REPLIES)} initialState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'saved', REPLIES)} initialState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'temp', REPLIES)} initialState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'temp', REPLIES)} initialState="open" />
          </Tile>
        </Section>

        <Section label="Open — reply input active">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human')} initialState="open" isReplying />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude')} initialState="open" isReplying />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'temp')} initialState="open" isReplying />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'temp')} initialState="open" isReplying />
          </Tile>
        </Section>

        <Section label="Open — long text (scrollable)">
          <Tile label="user · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'human')} initialState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'claude')} initialState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'human', 'temp')} initialState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'claude', 'temp')} initialState="open" />
          </Tile>
        </Section>

        <Section label="Comment Input">
          <Tile label="empty">
            <ShowcaseCommentInput />
          </Tile>
          <Tile label="with text">
            <ShowcaseCommentInput prefilled />
          </Tile>
        </Section>
        </div>
      </div>
    </div>
  );
}
