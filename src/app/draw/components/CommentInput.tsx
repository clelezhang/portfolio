import { useRef, useCallback, useState } from 'react';
import { Point } from '../types';
import { useAutoResizeTextarea } from '../hooks';
import { SubmitArrowIcon } from './icons';

interface CommentInputProps {
  position: Point;
  screenPosition: Point;
  commentText: string;
  setCommentText: (text: string) => void;
  strokeColor: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onMouseEnterBubble?: () => void;
  onMouseLeaveBubble?: () => void;
}

export function CommentInput({
  screenPosition,
  commentText,
  setCommentText,
  strokeColor,
  onSubmit,
  onCancel,
  onMouseEnterBubble,
  onMouseLeaveBubble,
}: CommentInputProps) {
  const handleTextareaResize = useAutoResizeTextarea(100);
  const formRef = useRef<HTMLFormElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const [closingAs, setClosingAs] = useState<'close' | 'send' | null>(null);

  // Animate out before calling a callback
  const animateOut = useCallback((type: 'close' | 'send', callback: () => void) => {
    if (closingAs) return;
    setClosingAs(type);
    if (type === 'send') {
      // Send morph: listen for width transition on the bubble
      const bubble = bubbleRef.current;
      if (bubble) {
        bubble.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'width') callback();
        }, { once: true });
      } else {
        callback();
      }
    } else {
      // Close: listen for keyframe animation on the form
      const form = formRef.current;
      if (form) {
        form.addEventListener('animationend', () => callback(), { once: true });
      } else {
        callback();
      }
    }
  }, [closingAs]);

  const handleClose = useCallback(() => {
    animateOut('close', onCancel);
  }, [animateOut, onCancel]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    // Submit immediately (adds comment + triggers API), then animate input form out
    onSubmit(e);
    animateOut('send', onCancel);
  }, [commentText, onSubmit, animateOut, onCancel]);

  return (
    <>
      {/* Backdrop */}
      {!closingAs && (
        <div
          className="draw-comment-input-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        />
      )}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`draw-comment-input-form${closingAs === 'close' ? ' draw-comment-input-form--closing' : ''}${closingAs === 'send' ? ' draw-comment-input-form--sending' : ''}`}
        style={{
          position: 'absolute',
          left: screenPosition.x,
          top: screenPosition.y,
          zIndex: 40,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={bubbleRef} className="draw-comment-input-bubble" style={{ '--stroke-color': strokeColor } as React.CSSProperties} onMouseEnter={() => { isHoveredRef.current = true; onMouseEnterBubble?.(); }} onMouseLeave={() => { isHoveredRef.current = false; onMouseLeaveBubble?.(); }}>
          <img
            src="/draw/user-icon.svg"
            alt=""
            className="draw-comment-input-icon"
          />
          <div className="draw-comment-input-field-wrapper">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment"
              className="draw-comment-input draw-comment-input--plain"
              rows={1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleClose();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (commentText.trim()) {
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }
              }}
              onInput={handleTextareaResize}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`draw-comment-btn draw-comment-submit${commentText.trim() ? '' : ' draw-comment-submit--empty'}`}
            >
              <SubmitArrowIcon />
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
