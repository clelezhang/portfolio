import { memo, useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { useDialKit } from 'dialkit';
import { Comment, Point } from '../types';
import { CloseIcon, CheckmarkIcon, SubmitArrowIcon } from './icons';

// ─── Easing presets for DialKit select controls ─────────────────────────────
const EASING_OPTIONS = [
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'ease-out (default)' },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'ease-out-back' },
  { value: 'cubic-bezier(0.22, 1, 0.36, 1)', label: 'ease-out-quint' },
  { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'ease-out-expo' },
  { value: 'cubic-bezier(0.33, 1, 0.68, 1)', label: 'ease-out-cubic' },
  { value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', label: 'ease (CSS default)' },
  { value: 'cubic-bezier(0.4, 0, 1, 1)', label: 'ease-in' },
  { value: 'linear', label: 'linear' },
];

/** Convert a DialKit SpringConfig into a CSS linear() easing function. */
function springToLinearCSS(spring: { type: 'spring'; stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number }, samples = 40): string {
  let stiffness: number, damping: number, mass: number;
  if (spring.visualDuration !== undefined) {
    const dur = spring.visualDuration || 0.5;
    const dampingRatio = 1 - (spring.bounce || 0);
    const angularFreq = (2 * Math.PI) / dur;
    stiffness = angularFreq * angularFreq;
    damping = 2 * dampingRatio * angularFreq;
    mass = 1;
  } else {
    stiffness = spring.stiffness || 100;
    damping = spring.damping || 10;
    mass = spring.mass || 1;
  }
  let pos = 0, vel = 0;
  const dt = 1 / 120;
  const maxSteps = 720;
  const raw: number[] = [0];
  for (let i = 0; i < maxSteps; i++) {
    const accel = (-stiffness * (pos - 1) - damping * vel) / mass;
    vel += accel * dt;
    pos += vel * dt;
    raw.push(pos);
    if (i > 20 && Math.abs(pos - 1) < 0.001 && Math.abs(vel) < 0.001) break;
  }
  const values: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const idx = t * (raw.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, raw.length - 1);
    const frac = idx - lo;
    const val = raw[lo] * (1 - frac) + raw[hi] * frac;
    values.push((Math.round(val * 1000) / 1000).toString());
  }
  return `linear(${values.join(', ')})`;
}

/** Build a CSS linear() easing: holds near start, then accelerates to end. */
function fadeCurveCSS(holdPct: number, power: number, samples = 40): string {
  const hold = Math.max(0, Math.min(holdPct / 100, 0.99));
  const values: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    let val: number;
    if (t <= hold) {
      val = 0; // animation stays at start (opacity: 1)
    } else {
      const fadeT = (t - hold) / (1 - hold); // 0→1 within fade region
      val = Math.pow(fadeT, power); // power > 1 = slow start then fast
    }
    values.push((Math.round(val * 1000) / 1000).toString());
  }
  return `linear(${values.join(', ')})`;
}

/** Standalone DialKit panel + CSS var applicator for comment animations. */
export function CommentDialKit() {
  const dial = useDialKit('Comments', {
    '✅ input (comment box appear/close/send)': {
      'appear duration (ms)': [380, 50, 600] as [number, number, number],
      'appear easing': { type: 'spring' as const, stiffness: 278, damping: 21, mass: 1.03 },
      'appear scale from': [0.83, 0.5, 1] as [number, number, number],
      'close duration (ms)': [80, 50, 600] as [number, number, number],
      'close easing': { type: 'select' as const, options: EASING_OPTIONS, default: 'cubic-bezier(0.4, 0, 1, 1)' },
      'send duration (ms)': [325, 50, 600] as [number, number, number],
      'send easing': { type: 'spring' as const, stiffness: 335, damping: 41, mass: 1.93 },
    },
    '✅ hover (collapsed → preview)': {
      'duration (ms)': [435, 50, 600] as [number, number, number],
      easing: { type: 'spring' as const, stiffness: 470, damping: 40, mass: 1.42 },
      'delay (ms)': [60, 0, 300] as [number, number, number],
    },
    '✅ open (preview → expanded)': {
      'duration (ms)': [320, 50, 600] as [number, number, number],
      easing: { type: 'spring' as const, stiffness: 418, damping: 35, mass: 1.27 },
    },
    '✅ unhover (preview → collapsed)': {
      'duration (ms)': [380, 50, 600] as [number, number, number],
      easing: { type: 'spring' as const, stiffness: 430, damping: 25, mass: 0.62 },
      'delay (ms)': [20, 0, 300] as [number, number, number],
      'scale to': [1, 0.5, 1] as [number, number, number],
      'blur to (px)': [0, 0, 10] as [number, number, number],
    },
    '✅ close (expanded → collapsed)': {
      'duration (ms)': [380, 50, 600] as [number, number, number],
      easing: { type: 'spring' as const, stiffness: 673, damping: 25, mass: 0.43 },
      'scale to': [1, 0.5, 1] as [number, number, number],
      'blur to (px)': [0, 0, 10] as [number, number, number],
    },
    '✅ temp fade (auto-dismiss lifetime)': {
      'lifetime (s)': [60, 5, 120] as [number, number, number],
      'blur max (px)': [1, 0, 5] as [number, number, number],
      'hold (%)': [10, 0, 90] as [number, number, number],
      'acceleration': [1.25, 1, 6] as [number, number, number],
    },
    '✅ delete (bubble removal)': {
      'duration (ms)': [160, 50, 600] as [number, number, number],
      easing: { type: 'select' as const, options: EASING_OPTIONS, default: 'cubic-bezier(0, 0, 0.58, 1)' },
      'scale to': [0.70, 0.5, 1] as [number, number, number],
    },
    '✅ temp style (border/outline transition)': {
      'transition (ms)': [100, 50, 600] as [number, number, number],
    },
    '✅ temp buttons (slide in/out)': {
      'duration (ms)': [120, 50, 400] as [number, number, number],
      'slide-in easing': { type: 'select' as const, options: EASING_OPTIONS, default: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      'slide-out easing': { type: 'select' as const, options: EASING_OPTIONS, default: 'cubic-bezier(0.4, 0, 1, 1)' },
    },
  });

  useEffect(() => {
    const root = document.documentElement;
    const input = dial['✅ input (comment box appear/close/send)'];
    const hover = dial['✅ hover (collapsed → preview)'];
    const open = dial['✅ open (preview → expanded)'];
    const unhover = dial['✅ unhover (preview → collapsed)'];
    const close = dial['✅ close (expanded → collapsed)'];
    const fade = dial['✅ temp fade (auto-dismiss lifetime)'];
    const del = dial['✅ delete (bubble removal)'];
    const tempStyle = dial['✅ temp style (border/outline transition)'];
    const tempButtons = dial['✅ temp buttons (slide in/out)'];
    const vars: Record<string, string> = {
      '--comment-hover-duration': `${hover['duration (ms)']}ms`,
      '--comment-hover-easing': springToLinearCSS(hover.easing),
      '--comment-hover-delay': `${hover['delay (ms)']}ms`,
      '--comment-open-duration': `${open['duration (ms)']}ms`,
      '--comment-open-easing': springToLinearCSS(open.easing),
      '--comment-unhover-duration': `${unhover['duration (ms)']}ms`,
      '--comment-unhover-easing': springToLinearCSS(unhover.easing),
      '--comment-unhover-delay': `${unhover['delay (ms)']}ms`,
      '--comment-unhover-scale-to': String(unhover['scale to']),
      '--comment-unhover-blur-to': `${unhover['blur to (px)']}px`,
      '--comment-close-duration': `${close['duration (ms)']}ms`,
      '--comment-close-easing': springToLinearCSS(close.easing),
      '--comment-close-scale-to': String(close['scale to']),
      '--comment-close-blur-to': `${close['blur to (px)']}px`,
      '--comment-input-duration': `${input['appear duration (ms)']}ms`,
      '--comment-input-easing': springToLinearCSS(input['appear easing']),
      '--comment-input-scale-from': String(input['appear scale from']),
      '--comment-input-close-duration': `${input['close duration (ms)']}ms`,
      '--comment-input-close-easing': input['close easing'],
      '--comment-input-send-duration': `${input['send duration (ms)']}ms`,
      '--comment-input-send-easing': springToLinearCSS(input['send easing']),
      '--comment-delete-duration': `${del['duration (ms)']}ms`,
      '--comment-delete-easing': del.easing,
      '--comment-delete-scale-to': String(del['scale to']),
      '--comment-fade-total': `${fade['lifetime (s)']}s`,
      '--comment-fade-blur-max': `${fade['blur max (px)']}px`,
      '--comment-fade-easing': fadeCurveCSS(fade['hold (%)'], fade.acceleration),
      '--comment-temp-slide-duration': `${tempButtons['duration (ms)']}ms`,
      '--comment-temp-slide-in-easing': tempButtons['slide-in easing'],
      '--comment-temp-slide-out-easing': tempButtons['slide-out easing'],
      '--comment-temp-style-transition': `${tempStyle['transition (ms)']}ms`,
    };
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [dial]);

  // Auto-collapse ✅ folders on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.dialkit-folder-title').forEach(el => {
        if (el.textContent?.includes('✅')) {
          const header = el.closest('.dialkit-folder-header');
          if (header) (header as HTMLElement).click();
        }
      });
    });
  }, []);

  return null;
}

interface CommentSystemProps {
  comments: Comment[];
  strokeColor: string;
  openCommentIndex: number | null;
  setOpenCommentIndex: (index: number | null) => void;
  hoveredCommentIndex: number | null;
  setHoveredCommentIndex: (index: number | null) => void;
  replyingToIndex: number | null;
  setReplyingToIndex: (index: number | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  deleteComment: (index: number) => void;
  addReplyToComment: (index: number, text: string, from: 'human' | 'claude') => void;
  canvasToScreen: (x: number, y: number) => Point;
  hasCommentInput?: boolean;
  onCloseCommentInput?: () => void;
  onUserReply?: (index: number, text: string) => void;
  saveComment?: (index: number) => void;
  dismissComment?: (index: number) => void;
  isDrawing?: boolean;
}

// Animation duration matches CSS transition (0.2s)
const TRANSITION_MS = 210;

// Anchor that delays z-index decreases so they happen after the CSS transition finishes
function CommentAnchor({
  screenPos,
  desiredZIndex,
  children,
}: {
  screenPos: Point;
  desiredZIndex: number;
  children: React.ReactNode;
}) {
  const [zIndex, setZIndex] = useState(desiredZIndex);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevDesiredRef = useRef(desiredZIndex);

  useEffect(() => {
    const prev = prevDesiredRef.current;
    prevDesiredRef.current = desiredZIndex;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (desiredZIndex >= prev) {
      setZIndex(desiredZIndex);
    } else {
      timerRef.current = setTimeout(() => setZIndex(desiredZIndex), TRANSITION_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [desiredZIndex]);

  return (
    <div
      className="draw-comment-anchor"
      style={{ position: 'absolute', left: screenPos.x, top: screenPos.y, zIndex, pointerEvents: 'auto' }}
    >
      {children}
    </div>
  );
}

export const CommentSystem = memo(function CommentSystem({
  comments,
  strokeColor,
  openCommentIndex,
  setOpenCommentIndex,
  hoveredCommentIndex,
  setHoveredCommentIndex,
  replyingToIndex,
  setReplyingToIndex,
  replyText,
  setReplyText,
  deleteComment,
  addReplyToComment,
  canvasToScreen,
  hasCommentInput,
  onCloseCommentInput,
  onUserReply,
  saveComment,
  dismissComment,
  isDrawing,
}: CommentSystemProps) {
  // Hover delay from CSS var default (80ms)
  const hoverDelay = 80;

  // Ref to track hover timer for debouncing
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hover handlers — enter is instant (so cursor switches immediately),
  // leave is debounced to prevent jitter when mouse briefly exits
  const handleMouseEnter = useCallback((index: number) => {
    if (isDrawing) return;
    // Clear any pending leave timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredCommentIndex(index);
  }, [setHoveredCommentIndex, isDrawing]);

  const handleMouseLeave = useCallback(() => {
    // Clear any pending enter timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Clear hover after delay
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCommentIndex(null);
    }, hoverDelay);
  }, [setHoveredCommentIndex, hoverDelay]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <CommentDialKit />
      {comments.map((comment, i) => {
        const screenPos = canvasToScreen(comment.x, comment.y);
        const isOpen = openCommentIndex === i;
        const isReplying = replyingToIndex === i;
        const isUserComment = comment.from === 'human';
        const isTemp = comment.status === 'temp';
        const isHovered = hoveredCommentIndex === i && !isOpen;

        // Determine visual state
        const visualState = isOpen ? 'open' : isHovered ? 'preview' : 'collapsed';

        // z-index: open > hovered > temp > normal
        const zIndex = isOpen ? 100 : isHovered ? 50 : isTemp ? 20 : 10;

        return (
          <CommentAnchor
            key={i}
            screenPos={screenPos}
            desiredZIndex={zIndex}
          >
            <CommentBubble
              comment={comment}
              commentIndex={i}
              visualState={visualState}
              isUserComment={isUserComment}
              isTemp={isTemp}
              isReplying={isReplying}
              replyText={replyText}
              setReplyText={setReplyText}
              strokeColor={strokeColor}
              onBubbleMouseEnter={() => handleMouseEnter(i)}
              onBubbleMouseLeave={handleMouseLeave}
              onOpen={() => {
                if (hasCommentInput && onCloseCommentInput) {
                  onCloseCommentInput();
                  return;
                }
                // Only open, don't toggle closed
                if (!isOpen) {
                  setOpenCommentIndex(i);
                  setReplyingToIndex(null);
                }
              }}
              onDelete={() => deleteComment(i)}
              onReplyStart={() => setReplyingToIndex(i)}
              onReplyCancel={() => {
                setReplyingToIndex(null);
                setReplyText('');
              }}
              onReplySubmit={() => {
                if (replyText.trim()) {
                  addReplyToComment(i, replyText.trim(), 'human');
                  onUserReply?.(i, replyText.trim());
                }
              }}
              onSave={saveComment ? () => saveComment(i) : undefined}
              onDismiss={dismissComment ? () => dismissComment(i) : undefined}
            />
          </CommentAnchor>
        );
      })}
    </>
  );
});

export interface CommentBubbleProps {
  comment: Comment;
  commentIndex: number;
  visualState: 'collapsed' | 'preview' | 'open';
  isUserComment: boolean;
  isTemp: boolean;
  isReplying: boolean;
  replyText: string;
  setReplyText: (text: string) => void;
  strokeColor: string;
  onOpen: () => void;
  onDelete: () => void;
  onReplyStart: () => void;
  onReplyCancel: () => void;
  onReplySubmit: () => void;
  onSave?: () => void;
  onDismiss?: () => void;
  onBubbleMouseEnter?: () => void;
  onBubbleMouseLeave?: () => void;
}

export function CommentBubble({
  comment,
  commentIndex,
  visualState,
  isUserComment,
  isTemp,
  isReplying,
  replyText,
  setReplyText,
  strokeColor,
  onOpen,
  onDelete,
  onReplyStart,
  onReplyCancel,
  onReplySubmit,
  onSave,
  onDismiss,
  onBubbleMouseEnter,
  onBubbleMouseLeave,
}: CommentBubbleProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleOuterRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tempActionsRef = useRef<HTMLDivElement>(null);
  const frozenVisualStateRef = useRef<'collapsed' | 'preview' | 'open' | null>(null);
  const prevVisualStateRef = useRef(visualState);
  const closingFromRef = useRef<'preview' | 'open' | null>(null);
  const prevIsTempRef = useRef(isTemp);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollFadeTopRef = useRef(false);
  const scrollFadeBottomRef = useRef(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const prevReplyCountRef = useRef(comment.replies?.length ?? 0);
  const [newReplyIndex, setNewReplyIndex] = useState<number | null>(null);
  const replyRowBodyRef = useRef<HTMLDivElement>(null);

  const updateInputOverflow = useCallback((textarea: HTMLTextAreaElement) => {
    const wrapper = replyRowBodyRef.current;
    if (!wrapper) return;
    wrapper.toggleAttribute('data-overflow-top', textarea.scrollTop > 0);
    wrapper.toggleAttribute('data-overflow-bottom', textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight > 1);
  }, []);

  const updateScrollFades = useCallback(() => {
    const el = bubbleRef.current;
    const outer = bubbleOuterRef.current;
    if (!el || !outer) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    scrollFadeTopRef.current = top;
    scrollFadeBottomRef.current = bottom;
    outer.classList.toggle('draw-comment-scroll-fade-top', top);
    outer.classList.toggle('draw-comment-scroll-fade-bottom', bottom);
  }, []);

  // When temp→saved, capture the current (faded) opacity so the CSS transition
  // can smoothly recover it instead of snapping from the removed animation value.
  useLayoutEffect(() => {
    const wasTemp = prevIsTempRef.current;
    prevIsTempRef.current = isTemp;
    if (wasTemp && !isTemp) {
      const el = bubbleOuterRef.current;
      if (el) {
        const currentOpacity = getComputedStyle(el).opacity;
        el.style.opacity = currentOpacity;
        requestAnimationFrame(() => {
          el.style.opacity = '';
        });
      }
    }
  }, [isTemp]);

  // Freeze visual state when deleting so classes don't change mid-animation
  if (isDeleting && frozenVisualStateRef.current === null) {
    frozenVisualStateRef.current = visualState;
  }
  const effectiveVisualState = isDeleting && frozenVisualStateRef.current ? frozenVisualStateRef.current : visualState;

  // Track where we're closing from — computed synchronously so the class is present on the same render as the state change
  const prev = prevVisualStateRef.current;
  if (effectiveVisualState !== prev) {
    prevVisualStateRef.current = effectiveVisualState;
    if (effectiveVisualState === 'collapsed' && (prev === 'preview' || prev === 'open')) {
      closingFromRef.current = prev;
    } else if (effectiveVisualState !== 'collapsed') {
      closingFromRef.current = null;
    }
  }
  const closingFrom = closingFromRef.current;

  // Mark as animated after mount to enable transitions
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top when collapsing
  useEffect(() => {
    if (effectiveVisualState === 'collapsed' && bubbleRef.current) {
      bubbleRef.current.scrollTop = 0;
    }
  }, [effectiveVisualState]);

  // Scroll fades + grid height management — direct DOM via useLayoutEffect.
  //
  // The CSS 0fr→1fr grid transition resolves 1fr to the item's full content
  // height.  For overflow comments (content > bubble max-height), the easing
  // curve plays out beyond the visible clip, making the open animation snap.
  //
  // Fix: use explicit pixel values for grid-template-rows so the browser
  // interpolates only the visible range.  We pin the grid at 0px in the
  // current frame (useLayoutEffect, before paint), then set the capped
  // target height in the NEXT frame (requestAnimationFrame).  This two-frame
  // approach is necessary because the CSS transition system compares values
  // between rendering frames — a mid-frame forced reflow doesn't reset its
  // baseline.  After the settle animation, we remove the inline override
  // so CSS 1fr takes over (enabling scrolling).  On close, if the inline
  // pixel value is still set (closed before settle), we transition it to
  // 0px; otherwise CSS handles the native 1fr→0fr transition.
  useLayoutEffect(() => {
    const outer = bubbleOuterRef.current;
    const gridEl = gridRef.current;
    if (!outer) return;
    let rafId = 0;

    if (effectiveVisualState !== 'open') {
      // If the grid still has an inline pixel value from the open phase
      // (user closed before settle), transition it to 0px.
      // If inline was already removed (after settle), CSS handles 1fr→0fr.
      if (gridEl && gridEl.style.gridTemplateRows) {
        gridEl.style.gridTemplateRows = '0px';
      }
      scrollFadeTopRef.current = false;
      scrollFadeBottomRef.current = false;
      outer.classList.remove('draw-comment-scroll-fade-top');
      outer.classList.remove('draw-comment-scroll-fade-bottom');
      return;
    }

    const el = bubbleRef.current;
    if (!el || !gridEl) return;

    // Pin grid at 0px so this frame commits a pixel value as the
    // transition baseline (the CSS 0fr is a <flex> type and can't
    // interpolate to a <length>).
    gridEl.style.gridTemplateRows = '0px';

    // Measure content and compute the capped target height.
    const gridInnerEl = gridEl.firstElementChild as HTMLElement | null;
    const gridContentHeight = gridInnerEl?.scrollHeight || 0;
    const mainRow = el.querySelector('.draw-comment-row--main') as HTMLElement | null;
    const mainRowHeight = mainRow?.offsetHeight || 0;
    const gap = 8; // CSS gap on .draw-comment-bubble-inner when open
    const maxInnerHeight = 282; // calc(300px bubble max-height − 18px border+padding)
    const maxVisibleGrid = maxInnerHeight - mainRowHeight - gap;
    const targetGridHeight = Math.min(gridContentHeight, maxVisibleGrid);

    // Set the target on the NEXT rendering frame so the browser can
    // transition from the committed 0px baseline to the target.
    rafId = requestAnimationFrame(() => {
      gridEl.style.gridTemplateRows = `${targetGridHeight}px`;
    });

    // Predict overflow for bottom scroll fade (present from first frame).
    const willOverflow = (mainRowHeight + gap + gridContentHeight) > maxInnerHeight;
    scrollFadeBottomRef.current = willOverflow;
    outer.classList.toggle('draw-comment-scroll-fade-bottom', willOverflow);

    // After settle (overflow-y: auto kicks in):
    // - Remove inline grid height so CSS 1fr takes over (enables scrolling)
    // - Suppress transition during the switch to avoid a visible jump
    // - Pin scroll to top and update fades
    const handleAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName === 'comment-settle') {
        gridEl.style.transition = 'none';
        gridEl.style.gridTemplateRows = '';  // CSS 1fr takes over
        void gridEl.offsetHeight;            // commit without transition
        gridEl.style.transition = '';         // restore CSS transition
        el.scrollTop = 0;
        updateScrollFades();
      }
    };
    el.addEventListener('animationend', handleAnimationEnd);
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('animationend', handleAnimationEnd);
    };
  }, [effectiveVisualState, updateScrollFades]);

  // Scroll to bottom and animate new reply when reply count increases
  useEffect(() => {
    const count = comment.replies?.length ?? 0;
    const prev = prevReplyCountRef.current;
    prevReplyCountRef.current = count;
    if (count > prev && effectiveVisualState === 'open') {
      setNewReplyIndex(count - 1);
      const el = bubbleRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
          updateScrollFades();
        });
      }
      const timer = setTimeout(() => setNewReplyIndex(null), 300);
      return () => clearTimeout(timer);
    }
  }, [comment.replies?.length, effectiveVisualState, updateScrollFades]);

  // Focus reply input without scrolling (autoFocus causes scroll-into-view)
  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      replyInputRef.current.focus({ preventScroll: true });
    }
  }, [isReplying]);

  // Auto-dismiss timer for temp comments (60s)
  const handleAutoDismiss = useCallback(() => {
    if (!onDismiss) return;
    const el = tempActionsRef.current;
    if (el) {
      el.classList.add('draw-comment-temp-actions--exiting');
      el.addEventListener('animationend', () => onDismiss(), { once: true });
    } else {
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    if (isTemp && comment.tempStartedAt && onDismiss) {
      const elapsed = Date.now() - comment.tempStartedAt;
      const remaining = 60000 - elapsed;

      if (remaining <= 0) {
        handleAutoDismiss();
      } else {
        timerRef.current = setTimeout(handleAutoDismiss, remaining);
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [isTemp, comment.tempStartedAt, onDismiss, handleAutoDismiss, commentIndex]);

  const authorClass = isUserComment ? 'draw-comment-bubble--user' : 'draw-comment-bubble--claude';
  const stateClass = isTemp ? 'draw-comment-bubble--temp' : 'draw-comment-bubble--saved';
  const visualStateClass = `draw-comment-bubble--${effectiveVisualState}`;
  const animateClass = hasAnimated ? 'draw-comment-bubble--animated' : '';
  const closingFromClass = closingFrom ? `draw-comment-bubble--closing-from-${closingFrom}` : '';
  // Extra animation time for comments with more content (replies add height)
  const replyCount = comment.replies?.length ?? 0;
  const extraDurationMs = replyCount * 40; // 40ms per reply row

  return (
    <div
      ref={wrapperRef}
      className={`draw-comment-wrapper ${isTemp ? 'draw-comment-wrapper--temp' : ''}${isDeleting ? ' draw-comment-wrapper--deleting' : ''}`}
      style={{
        animationDelay: isDeleting ? '0s' : comment.tempStartedAt ? `-${(Date.now() - comment.tempStartedAt) / 1000}s` : '0s',
      }}
      onMouseEnter={onBubbleMouseEnter}
      onMouseLeave={onBubbleMouseLeave}
    >
      <div
        ref={bubbleOuterRef}
        className={`draw-comment-bubble ${authorClass} ${stateClass} ${visualStateClass} ${animateClass} ${closingFromClass}${scrollFadeTopRef.current ? ' draw-comment-scroll-fade-top' : ''}${scrollFadeBottomRef.current ? ' draw-comment-scroll-fade-bottom' : ''}`}
        style={{ '--stroke-color': strokeColor, '--comment-extra-dur': `${extraDurationMs}ms` } as React.CSSProperties}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <div ref={bubbleRef} className="draw-comment-bubble-inner" onScroll={updateScrollFades}>
          {/* Main row */}
          <div className="draw-comment-row draw-comment-row--main">
            <img
              src={comment.from === 'human' ? '/draw/user-icon.svg' : '/draw/claude.svg'}
              alt=""
              className="draw-comment-row-icon"
            />
            <div className={`draw-comment-text-grid${effectiveVisualState !== 'collapsed' ? ' draw-comment-text-grid--visible' : ''}`}>
              <div className="draw-comment-text-grid-inner">
                <div className="draw-comment-row-body">
                  <span className="draw-comment-text">{comment.text}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open-only content — grid wrapper animates height from 0fr→1fr */}
          <div ref={gridRef} className={`draw-comment-open-grid${effectiveVisualState === 'open' ? ' draw-comment-open-grid--open' : ''}`}>
            <div className="draw-comment-open-grid-inner">
              {/* Reply items */}
              {comment.replies?.map((reply, ri) => {
                const displayText = reply.isStreaming
                  ? reply.text.slice(0, reply.displayLength ?? 0)
                  : reply.text;
                return (
                  <div key={ri} className={`draw-comment-row draw-comment-row--reply${ri === newReplyIndex ? ' draw-comment-row--reply-new' : ''}`}>
                    <img
                      src={reply.from === 'human' ? '/draw/user-icon.svg' : '/draw/claude.svg'}
                      alt=""
                      className="draw-comment-row-icon"
                    />
                    <div className="draw-comment-row-body">
                      <span className={`draw-comment-text${reply.isStreaming ? ' draw-comment-text--streaming' : ''}`}>{displayText}</span>
                    </div>
                  </div>
                );
              })}

              {/* Reply input — stays conditional for autoFocus */}
              {effectiveVisualState === 'open' && isReplying && (
                <div className="draw-comment-row draw-comment-row--reply-input">
                  <img src="/draw/user-icon.svg" alt="" draggable={false} className="draw-comment-row-icon draw-img-no-anim" />
                  <div ref={replyRowBodyRef} className="draw-comment-row-body">
                    <textarea
                      ref={replyInputRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply..."
                      className="draw-comment-input draw-comment-input--plain"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') onReplyCancel();
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onReplySubmit();
                        }
                      }}
                      onInput={(e) => requestAnimationFrame(() => updateInputOverflow(e.target as HTMLTextAreaElement))}
                      onScroll={(e) => updateInputOverflow(e.currentTarget)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); onReplySubmit(); }}
                      disabled={!replyText?.trim()}
                      className={`draw-comment-btn draw-comment-submit${replyText?.trim() ? '' : ' draw-comment-submit--empty'}`}
                    >
                      <SubmitArrowIcon />
                    </button>
                  </div>
                </div>
              )}

              {/* Reply button */}
              {(!isReplying || effectiveVisualState !== 'open') && (
                <div className="draw-comment-row draw-comment-row--reply-btn" onClick={(e) => { e.stopPropagation(); onReplyStart(); }}>
                  <img src="/draw/user-icon.svg" alt="" draggable={false} className="draw-comment-row-icon draw-img-no-anim" />
                  <div className="draw-comment-row-body">
                    <span className="draw-comment-reply-btn-text">Reply...</span>
                    <button
                      type="button"
                      className="draw-comment-btn draw-comment-submit draw-comment-submit--empty"
                      tabIndex={-1}
                    >
                      <SubmitArrowIcon />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete button - positioned outside scrollable bubble so it stays fixed */}
      {effectiveVisualState === 'open' && !isTemp && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDeleting) return;
            setIsDeleting(true);
            const el = wrapperRef.current;
            if (el) {
              el.addEventListener('animationend', () => onDelete(), { once: true });
            } else {
              onDelete();
            }
          }}
          className="draw-comment-btn draw-comment-delete"
          title="Delete comment"
        >
          <CloseIcon />
        </button>
      )}

      {/* Temp state action buttons (save/dismiss) - outside bubble for flex layout */}
      {isTemp && (onSave || onDismiss) && (
        <div
          ref={tempActionsRef}
          className="draw-comment-temp-actions"
        >
          {onSave && (
            <button
              className="draw-comment-btn draw-comment-temp-btn draw-comment-temp-btn--save"
              onClick={(e) => {
                e.stopPropagation();
                const el = tempActionsRef.current;
                if (el) {
                  el.style.setProperty('--comment-temp-slide-duration', '80ms');
                  el.classList.add('draw-comment-temp-actions--exiting');
                  el.addEventListener('animationend', () => onSave(), { once: true });
                } else {
                  onSave();
                }
              }}
              title="Save comment"
            >
              <CheckmarkIcon />
            </button>
          )}
          {onDismiss && (
            <button
              className="draw-comment-btn draw-comment-temp-btn draw-comment-temp-btn--dismiss"
              onClick={(e) => {
                e.stopPropagation();
                if (isDeleting) return;
                setIsDeleting(true);
                const el = wrapperRef.current;
                if (el) {
                  el.addEventListener('animationend', () => onDismiss(), { once: true });
                } else {
                  onDismiss();
                }
              }}
              title="Dismiss comment"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
