import { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Comment, Point } from '../types';
import { useAutoResizeTextarea } from '../hooks';
import { CloseIcon, SubmitArrowIcon } from './icons';

// Checkmark icon for save button
function CheckmarkIcon() {
  return <span className="draw-icon-mask draw-icon-checkmark" />;
}

// X icon for dismiss button
function DismissIcon() {
  return <span className="draw-icon-mask draw-icon-close" />;
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
}

// Hover delay in milliseconds to prevent jittering
const HOVER_DELAY = 80;

// Animation duration matches CSS transition (0.2s)
const TRANSITION_MS = 210;

// Anchor that delays z-index decreases so they happen after the CSS transition finishes
function CommentAnchor({
  screenPos,
  desiredZIndex,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  screenPos: Point;
  desiredZIndex: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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
      // Increasing or same: apply immediately so the element rises above others
      setZIndex(desiredZIndex);
    } else {
      // Decreasing: wait for the CSS transition to finish before dropping z-index
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
}: CommentSystemProps) {
  // Ref to track hover timer for debouncing
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced hover handlers to prevent jittering
  const handleMouseEnter = useCallback((index: number) => {
    // Clear any pending leave timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Set hover after delay
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCommentIndex(index);
    }, HOVER_DELAY);
  }, [setHoveredCommentIndex]);

  const handleMouseLeave = useCallback(() => {
    // Clear any pending enter timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Clear hover after delay
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCommentIndex(null);
    }, HOVER_DELAY);
  }, [setHoveredCommentIndex]);

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
      {comments.map((comment, i) => {
        const screenPos = canvasToScreen(comment.x, comment.y);
        const isOpen = openCommentIndex === i;
        const isHovered = hoveredCommentIndex === i && !isOpen;
        const isReplying = replyingToIndex === i;
        const isUserComment = comment.from === 'human';
        const isTemp = comment.status === 'temp';

        // Determine visual state
        const visualState = isOpen ? 'open' : isHovered ? 'preview' : 'collapsed';

        // z-index: open > hovered > temp > normal
        const zIndex = isOpen ? 100 : isHovered ? 50 : isTemp ? 20 : 10;

        return (
          <CommentAnchor
            key={i}
            screenPos={screenPos}
            desiredZIndex={zIndex}
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
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
}: CommentBubbleProps) {
  const handleTextareaResize = useAutoResizeTextarea(80);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Mark as animated after mount to enable transitions
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top when collapsing
  useEffect(() => {
    if (visualState === 'collapsed' && bubbleRef.current) {
      bubbleRef.current.scrollTop = 0;
    }
  }, [visualState]);

  // Auto-dismiss timer for temp comments (60s)
  const handleAutoDismiss = useCallback(() => {
    if (onDismiss) {
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
  const visualStateClass = `draw-comment-bubble--${visualState}`;
  const animateClass = hasAnimated ? 'draw-comment-bubble--animated' : '';

  const isExpanded = visualState === 'preview' || visualState === 'open';

  return (
    <div
      className={`draw-comment-wrapper ${isTemp ? 'draw-comment-wrapper--temp' : ''}`}
      style={{
        animationDelay: comment.tempStartedAt ? `-${(Date.now() - comment.tempStartedAt) / 1000}s` : '0s',
      }}
    >
      <div
        ref={bubbleRef}
        className={`draw-comment-bubble ${authorClass} ${stateClass} ${visualStateClass} ${animateClass}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {/* First row: Icon + Content - wrapped to prevent breaking during transitions */}
        <div className="draw-comment-first-row">
          {/* Icon - always visible */}
          <div className="draw-comment-bubble-icon">
            <img
              src={comment.from === 'human' ? '/draw/user-icon.svg' : '/draw/claude.svg'}
              alt=""
              className="draw-comment-icon-img"
            />
          </div>

          {/* Content - scales in on expand */}
          <div className="draw-comment-bubble-content">
            {/* Main comment text */}
            <span className="draw-comment-text">{comment.text}</span>

            {/* Delete button for saved, open state */}
            {visualState === 'open' && !isTemp && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="draw-comment-delete"
                title="Delete comment"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        {/* Replies - only in expanded states */}
        {isExpanded && comment.replies?.map((reply, ri) => (
          <div key={ri} className="draw-comment-row draw-comment-row--reply-item">
            <img
              src={reply.from === 'human' ? '/draw/user-icon.svg' : '/draw/claude.svg'}
              alt=""
              className="draw-comment-icon"
            />
            <span className="draw-comment-text">{reply.text}</span>
          </div>
        ))}

        {/* Reply input - only when open and replying */}
        {visualState === 'open' && isReplying && (
          <div className="draw-comment-row draw-comment-row--reply">
            <img src="/draw/user-icon.svg" alt="" draggable={false} className="draw-comment-icon draw-img-no-anim" />
            <div className="draw-comment-reply-input-wrapper">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply..."
                className="draw-comment-input draw-comment-input--plain"
                rows={1}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onReplyCancel();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReplySubmit();
                  }
                }}
                onInput={handleTextareaResize}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onReplySubmit(); }}
                disabled={!replyText?.trim()}
                className={`draw-comment-submit${replyText?.trim() ? '' : ' draw-comment-submit--empty'}`}
                style={replyText?.trim() ? { backgroundColor: strokeColor } : undefined}
              >
                <SubmitArrowIcon />
              </button>
            </div>
          </div>
        )}

        {/* Reply button - when open and not already replying */}
        {visualState === 'open' && !isReplying && (
          <div className="draw-comment-reply-btn" onClick={(e) => { e.stopPropagation(); onReplyStart(); }}>
            <img src="/draw/user-icon.svg" alt="" draggable={false} className="draw-comment-icon draw-img-no-anim" />
            <div className="draw-comment-reply-btn-inner">
              <span className="draw-comment-reply-btn-text">Reply...</span>
              <SubmitArrowIcon />
            </div>
          </div>
        )}
      </div>

      {/* Temp state action buttons (save/dismiss) - outside bubble for flex layout */}
      {isTemp && (onSave || onDismiss) && (
        <div className="draw-comment-temp-actions">
          {onSave && (
            <button
              className="draw-comment-temp-btn draw-comment-temp-btn--save"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              title="Save comment"
            >
              <CheckmarkIcon />
            </button>
          )}
          {onDismiss && (
            <button
              className="draw-comment-temp-btn draw-comment-temp-btn--dismiss"
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              title="Dismiss comment"
            >
              <DismissIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
