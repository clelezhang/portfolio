'use client';
import '../draw.css';
import { useState, useRef, useCallback } from 'react';
import { CommentBubble, CommentDialKit } from '../components/CommentSystem';
import { CommentInput } from '../components/CommentInput';
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

const MANY_REPLIES_3: Comment['replies'] = [
  { text: 'I like the direction here.', from: 'claude' },
  { text: 'Thanks! I was experimenting.', from: 'human' },
  { text: 'The texture in the upper left is really interesting — reminds me of watercolor.', from: 'claude' },
];

const MANY_REPLIES_5: Comment['replies'] = [
  { text: 'Great start on the composition.', from: 'claude' },
  { text: 'Should I add more detail?', from: 'human' },
  { text: 'Yes, maybe some cross-hatching in the shadows would help create depth.', from: 'claude' },
  { text: 'Like this?', from: 'human' },
  { text: 'Exactly! The contrast is much better now. The negative space on the right balances the dense area on the left.', from: 'claude' },
];

const MANY_REPLIES_7: Comment['replies'] = [
  { text: 'Interesting approach with the curved lines.', from: 'claude' },
  { text: 'I want to make it feel organic.', from: 'human' },
  { text: 'It definitely does. The flowing quality reminds me of Art Nouveau.', from: 'claude' },
  { text: 'Should I lean into that more?', from: 'human' },
  { text: 'Could be cool! Maybe add some vine-like tendrils branching off the main forms.', from: 'claude' },
  { text: 'Done! What do you think?', from: 'human' },
  { text: 'Love it — the secondary lines add rhythm without overwhelming the composition. The weight variation is particularly nice.', from: 'claude' },
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

  const isTemp = localComment.status === 'temp';
  const isHoveredEffective = isHovered && !isTemp;
  const visualState: 'collapsed' | 'preview' | 'open' = isOpen
    ? 'open'
    : isHoveredEffective || initialState === 'preview'
      ? 'preview'
      : 'collapsed';

  const handleBubbleMouseEnter = () => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setIsHovered(true);
  };
  const handleBubbleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setIsHovered(false);
      if (isOpen) {
        setIsOpen(false);
        setIsReplying(false);
        setReplyText('');
      }
    }, 80);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CommentBubble
        comment={localComment}
        commentIndex={0}
        visualState={visualState}
        isUserComment={localComment.from === 'human'}
        isTemp={isTemp}
        isReplying={isReplying}
        replyText={replyText}
        setReplyText={setReplyText}
        strokeColor="#888"
        onBubbleMouseEnter={handleBubbleMouseEnter}
        onBubbleMouseLeave={handleBubbleMouseLeave}
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
        onSave={isTemp ? () => setLocalComment(prev => ({ ...prev, status: 'saved' })) : undefined}
        onDismiss={isTemp ? () => {} : undefined}
      />
    </div>
  );
}

// ─── Interactive Comment Input showcase ──────────────────────────────────────

function ShowcaseCommentInput({ prefilled = false }: { prefilled?: boolean }) {
  const [text, setText] = useState(prefilled ? 'Nice composition overall!' : '');
  const [visible, setVisible] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [closingAs, setClosingAs] = useState<'close' | 'send' | null>(null);
  const handleTextareaResize = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, []);

  const reset = useCallback(() => {
    setClosingAs(null);
    setText(prefilled ? 'Nice composition overall!' : '');
    setVisible(true);
  }, [prefilled]);

  const animateOut = useCallback((type: 'close' | 'send') => {
    if (closingAs) return;
    setClosingAs(type);
    if (type === 'send') {
      const bubble = bubbleRef.current;
      if (bubble) {
        bubble.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'width') { setVisible(false); setTimeout(reset, 400); }
        }, { once: true });
      }
    } else {
      const form = formRef.current;
      if (form) {
        form.addEventListener('animationend', () => { setVisible(false); setTimeout(reset, 400); }, { once: true });
      }
    }
  }, [closingAs, reset]);

  if (!visible) return null;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) animateOut('send'); }}
      className={`draw-comment-input-form${closingAs === 'close' ? ' draw-comment-input-form--closing' : ''}${closingAs === 'send' ? ' draw-comment-input-form--sending' : ''}`}
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div ref={bubbleRef} className="draw-comment-input-bubble" style={{ '--stroke-color': '#888' } as React.CSSProperties}>
        <img src="/draw/user-icon.svg" alt="" className="draw-comment-input-icon" />
        <div className="draw-comment-input-field-wrapper">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment"
            className="draw-comment-input draw-comment-input--plain"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') animateOut('close');
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) animateOut('send');
              }
            }}
            onInput={handleTextareaResize}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className={`draw-comment-btn draw-comment-submit${text.trim() ? '' : ' draw-comment-submit--empty'}`}
          >
            <SubmitArrowIcon />
          </button>
        </div>
      </div>
    </form>
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

  // Comment input state
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentInputPos, setCommentInputPos] = useState<Point>({ x: 200, y: 200 });
  const [commentText, setCommentText] = useState('');

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
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCommentInputPos({ x: e.clientX, y: e.clientY });
          setShowCommentInput(true);
          setCommentText('');
        }}
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

        <Section label="⚡ Animation test — tall comments (3 replies)">
          <Tile label="user · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human', 'saved', MANY_REPLIES_3)} initialState="collapsed" />
          </Tile>
          <Tile label="claude · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'claude', 'saved', MANY_REPLIES_3)} initialState="collapsed" />
          </Tile>
          <Tile label="user · starts open">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human', 'saved', MANY_REPLIES_3)} initialState="open" />
          </Tile>
        </Section>

        <Section label="⚡ Animation test — tall comments (5 replies)">
          <Tile label="user · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'saved', MANY_REPLIES_5)} initialState="collapsed" />
          </Tile>
          <Tile label="claude · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'claude', 'saved', MANY_REPLIES_5)} initialState="collapsed" />
          </Tile>
          <Tile label="user · starts open">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(SHORT, 'human', 'saved', MANY_REPLIES_5)} initialState="open" />
          </Tile>
        </Section>

        <Section label="⚡ Animation test — very tall comments (7 replies)">
          <Tile label="user · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human', 'saved', MANY_REPLIES_7)} initialState="collapsed" />
          </Tile>
          <Tile label="claude · click to toggle">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'claude', 'saved', MANY_REPLIES_7)} initialState="collapsed" />
          </Tile>
          <Tile label="user · starts open">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(MEDIUM, 'human', 'saved', MANY_REPLIES_7)} initialState="open" />
          </Tile>
        </Section>

        <Section label="⚡ Animation test — long text + many replies">
          <Tile label="long text + 5 replies">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'human', 'saved', MANY_REPLIES_5)} initialState="collapsed" />
          </Tile>
          <Tile label="long text + 7 replies">
            <ShowcaseBubble closeKey={closeKey} comment={makeComment(LONG, 'claude', 'saved', MANY_REPLIES_7)} initialState="collapsed" />
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

      {/* Interactive comment input — double-click to place */}
      {showCommentInput && (
        <CommentInput
          position={commentInputPos}
          screenPosition={commentInputPos}
          commentText={commentText}
          setCommentText={setCommentText}
          strokeColor={STROKE_COLOR}
          onSubmit={() => {}}
          onCancel={() => setShowCommentInput(false)}
        />
      )}
    </div>
  );
}
