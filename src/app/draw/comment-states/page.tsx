'use client';
import '../draw.css';
import { useState, useRef, useCallback } from 'react';
import { CommentBubble } from '../components/CommentSystem';
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
  visualState: 'collapsed' | 'preview' | 'open';
  isReplying?: boolean;
}

function ShowcaseBubble({ comment, visualState, isReplying = false }: ShowcaseBubbleProps) {
  const [replyText, setReplyText] = useState('');
  return (
    <CommentBubble
      comment={comment}
      commentIndex={0}
      visualState={visualState}
      isUserComment={comment.from === 'human'}
      isTemp={comment.status === 'temp'}
      isReplying={isReplying}
      replyText={replyText}
      setReplyText={setReplyText}
      strokeColor="#888"
      onOpen={() => {}}
      onDelete={() => {}}
      onReplyStart={() => {}}
      onReplyCancel={() => {}}
      onReplySubmit={() => {}}
      onSave={comment.status === 'temp' ? () => {} : undefined}
      onDismiss={comment.status === 'temp' ? () => {} : undefined}
    />
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
          className={`draw-comment-submit${text.trim() ? '' : ' draw-comment-submit--empty'}`}
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
      <div style={{ pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommentStatesPage() {
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
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={() => { if (isDrawing) stopDrawing(); }}
      >
        <h1 style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 400, color: 'var(--draw-text-primary)', letterSpacing: '0.04em', marginBottom: 56, opacity: 0.4 }}>
          /draw/comment-states — all comment bubble states (pencil mode active)
        </h1>

        <Section label="Collapsed">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="collapsed" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="collapsed" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="collapsed" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="collapsed" />
          </Tile>
        </Section>

        <Section label="Preview — short text">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="preview" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="preview" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="preview" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="preview" />
          </Tile>
        </Section>

        <Section label="Preview — long text (3-line clamp)">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(LONG, 'human')} visualState="preview" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(LONG, 'claude')} visualState="preview" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(LONG, 'human', 'temp')} visualState="preview" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(LONG, 'claude', 'temp')} visualState="preview" />
          </Tile>
        </Section>

        <Section label="Open — no replies">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(MEDIUM, 'human')} visualState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(MEDIUM, 'claude')} visualState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(MEDIUM, 'human', 'temp')} visualState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(MEDIUM, 'claude', 'temp')} visualState="open" />
          </Tile>
        </Section>

        <Section label="Open — with replies">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'human', 'saved', REPLIES)} visualState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'saved', REPLIES)} visualState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp', REPLIES)} visualState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp', REPLIES)} visualState="open" />
          </Tile>
        </Section>

        <Section label="Open — reply input active">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="open" isReplying />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="open" isReplying />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="open" isReplying />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="open" isReplying />
          </Tile>
        </Section>

        <Section label="Open — long text (scrollable)">
          <Tile label="user · saved">
            <ShowcaseBubble comment={makeComment(LONG, 'human')} visualState="open" />
          </Tile>
          <Tile label="claude · saved">
            <ShowcaseBubble comment={makeComment(LONG, 'claude')} visualState="open" />
          </Tile>
          <Tile label="user · temp">
            <ShowcaseBubble comment={makeComment(LONG, 'human', 'temp')} visualState="open" />
          </Tile>
          <Tile label="claude · temp">
            <ShowcaseBubble comment={makeComment(LONG, 'claude', 'temp')} visualState="open" />
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
  );
}
