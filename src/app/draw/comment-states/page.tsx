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

// ─── CSS Override toggles ────────────────────────────────────────────────────
// Each toggle represents one change from the animation fix attempt.
// Checked = change is ACTIVE (current state). Unchecked = REVERTED to original.

interface ChangeToggle {
  id: string;
  label: string;
  description: string;
  /** CSS to inject when this change is REVERTED (unchecked) */
  revertCSS: string;
  group: 'css' | 'js';
}

const CHANGE_TOGGLES: ChangeToggle[] = [
  {
    id: 'max-height-removed',
    label: '1. Removed max-height: 300px from --open',
    description: 'Originally .draw-comment-bubble--open had max-height: 300px, constraining the bubble during animation. Removed so grid can expand freely.',
    revertCSS: `.draw-comment-bubble--open { max-height: 300px !important; }`,
    group: 'css',
  },
  {
    id: 'open-settled-css',
    label: '2. --open-settled CSS class (scroll constraints after settle)',
    description: 'Adds max-height + overflow-y: auto to bubble-inner after animation finishes. Disabling removes scroll constraints.',
    revertCSS: `.draw-comment-bubble--open-settled .draw-comment-bubble-inner { max-height: unset !important; overflow-y: visible !important; overflow-x: visible !important; overscroll-behavior: auto !important; padding-right: 0 !important; }`,
    group: 'css',
  },
  {
    id: 'js-settle-system',
    label: '3-7. JS settle system (isOpenSettled + imperative max-height)',
    description: 'Groups: isOpenSettled state, bubbleOuterRef, imperative max-height animation, cleanup on close, scroll fade dependency. These are JS — toggle #1 and #2 to see CSS effects.',
    revertCSS: '', // JS-only, no CSS override
    group: 'js',
  },
  {
    id: 'min-width',
    label: '8. min-width: 250px on open-grid-inner',
    description: 'Locks content width so text doesn\'t reflow during the bubble width transition (42px→260px).',
    revertCSS: `.draw-comment-open-grid-inner { min-width: 0 !important; }`,
    group: 'css',
  },
  {
    id: 'gap-removed',
    label: '9. Removed gap: 8px from bubble-inner in open state',
    description: 'Originally added gap: 8px between main row and open-grid. Snapped instantly instead of animating.',
    revertCSS: `.draw-comment-bubble--open .draw-comment-bubble-inner { gap: 8px !important; }`,
    group: 'css',
  },
  {
    id: 'padding-top',
    label: '10. padding-top: 8px on open-grid-inner',
    description: 'Replaces the gap with padding inside the grid, so spacing animates with 0fr→1fr. May leak and make collapsed state too tall.',
    revertCSS: `.draw-comment-open-grid-inner { padding-top: 0px !important; }`,
    group: 'css',
  },
  {
    id: 'reply-body-widths',
    label: '11. Fixed reply body widths in open state',
    description: 'Locks .draw-comment-row-body in open-grid-inner to flex: none; width: 220px to prevent text reflow.',
    revertCSS: `.draw-comment-bubble--open .draw-comment-open-grid-inner .draw-comment-row-body { flex: 1 !important; width: auto !important; }`,
    group: 'css',
  },
];

function ChangeTogglePanel({ toggles, onChange }: {
  toggles: Record<string, boolean>;
  onChange: (id: string, checked: boolean) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: '#1a1a1a', color: '#ccc', borderRadius: 8,
        padding: '12px 16px', fontSize: 11, fontFamily: 'monospace',
        maxWidth: 420, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
        border: '1px solid #333', lineHeight: 1.5,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Change toggles — uncheck to revert
      </div>
      {CHANGE_TOGGLES.map((t) => (
        <label key={t.id} style={{ display: 'flex', gap: 8, marginBottom: 6, cursor: 'pointer', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={toggles[t.id] ?? true}
            onChange={(e) => onChange(t.id, e.target.checked)}
            disabled={t.group === 'js'}
            style={{ marginTop: 2, accentColor: '#4a9' }}
          />
          <span style={{ opacity: t.group === 'js' ? 0.4 : 1 }}>
            <span style={{ color: toggles[t.id] === false ? '#f88' : '#8f8' }}>
              {toggles[t.id] === false ? '✗' : '✓'}
            </span>{' '}
            {t.label}
            {t.group === 'js' && <span style={{ color: '#666' }}> (JS — not toggleable)</span>}
          </span>
        </label>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid #333', paddingTop: 8, fontSize: 10, color: '#666' }}>
        Hover description shown on toggle focus. CSS changes inject !important overrides.
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

  // Change toggle state — all start checked (current/changed state)
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHANGE_TOGGLES.map(t => [t.id, true]))
  );
  const handleToggle = useCallback((id: string, checked: boolean) => {
    setToggles(prev => ({ ...prev, [id]: checked }));
  }, []);

  // Build CSS override string from unchecked toggles
  const overrideCSS = CHANGE_TOGGLES
    .filter(t => toggles[t.id] === false && t.revertCSS)
    .map(t => t.revertCSS)
    .join('\n');

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
      {/* CSS override injection for change toggles */}
      {overrideCSS && <style dangerouslySetInnerHTML={{ __html: overrideCSS }} />}
      <ChangeTogglePanel toggles={toggles} onChange={handleToggle} />
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
