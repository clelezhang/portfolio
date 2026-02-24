import { useRef, useEffect, useState, useCallback } from 'react';
import { Comment } from '../types';
import { SubmitArrowIcon } from './icons';

type AnimState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing';

interface MobileCommentMorphProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  comments: Comment[];
  replyingToIndex: number | null;
  setReplyingToIndex: (index: number | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  addReplyToComment: (index: number, text: string, from: 'human' | 'claude') => void;
  deleteComment: (index: number) => void;
  onUserReply?: (index: number, text: string) => void;
}

function CommentIcon({ from }: { from: 'human' | 'claude' }) {
  return (
    <img
      src={from === 'claude' ? '/draw/claude.svg' : '/draw/user-icon.svg'}
      alt=""
      width={20}
      height={20}
      draggable={false}
      style={{ flexShrink: 0 }}
    />
  );
}

export function MobileCommentMorph({
  isOpen,
  onToggle,
  onClose,
  comments,
  replyingToIndex,
  setReplyingToIndex,
  replyText,
  setReplyText,
  addReplyToComment,
  onUserReply,
}: MobileCommentMorphProps) {
  const [animState, setAnimState] = useState<AnimState>('collapsed');
  const morphRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const hasComments = comments.length > 0;

  // Scroll fade overlays — toggle classes directly on DOM for performance
  const updateScrollFades = useCallback(() => {
    const el = contentRef.current;
    const wrapper = contentWrapperRef.current;
    if (!el || !wrapper) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    wrapper.classList.toggle('mobile-comment-morph-scroll-fade-top', top);
    wrapper.classList.toggle('mobile-comment-morph-scroll-fade-bottom', bottom);
  }, []);

  // Sync animState with isOpen prop
  useEffect(() => {
    if (isOpen && (animState === 'collapsed' || animState === 'collapsing')) {
      requestAnimationFrame(() => {
        setAnimState('expanding');
      });
    } else if (!isOpen && (animState === 'expanded' || animState === 'expanding')) {
      setAnimState('collapsing');
    }
  }, [isOpen, animState]);

  // Listen for transitionend to advance state
  useEffect(() => {
    const el = morphRef.current;
    if (!el) return;
    const handler = (e: TransitionEvent) => {
      if (e.target !== el) return;
      if (e.propertyName !== 'width') return;
      if (animState === 'expanding') setAnimState('expanded');
      if (animState === 'collapsing') setAnimState('collapsed');
    };
    el.addEventListener('transitionend', handler);
    return () => el.removeEventListener('transitionend', handler);
  }, [animState]);

  // Scroll to bottom when expanded, then update fades
  useEffect(() => {
    if (animState === 'expanded' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
      updateScrollFades();
    }
  }, [animState, comments.length, updateScrollFades]);

  const isVisuallyOpen = animState === 'expanding' || animState === 'expanded';
  const isVisuallyCollapsed = animState === 'collapsed' || animState === 'collapsing';

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    if (hasComments) {
      const targetIndex = replyingToIndex ?? comments.length - 1;
      if (onUserReply) {
        onUserReply(targetIndex, replyText.trim());
      } else {
        addReplyToComment(targetIndex, replyText.trim(), 'human');
      }
      setReplyingToIndex(null);
    }
    setReplyText('');
  };

  const morphClassName = [
    'mobile-comment-morph',
    isVisuallyOpen ? 'mobile-comment-morph--expanded' : '',
    isVisuallyOpen && hasComments ? 'mobile-comment-morph--has-comments' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Backdrop */}
      {animState !== 'collapsed' && (
        <div
          className={`mobile-comment-morph-backdrop ${isVisuallyOpen ? 'mobile-comment-morph-backdrop--visible' : ''}`}
          onClick={onClose}
        />
      )}

      {/* Morphing element */}
      <div
        ref={morphRef}
        className={morphClassName}
        onClick={isVisuallyCollapsed ? onToggle : undefined}
        role={isVisuallyCollapsed ? 'button' : undefined}
        aria-label={isVisuallyCollapsed ? 'Comments' : undefined}
      >
        {/* Button icon — fades out on expand */}
        <div className={`mobile-comment-morph-icon ${isVisuallyOpen ? 'mobile-comment-morph-icon--hidden' : ''}`}>
          <img src="/draw/mobile-comment.svg" alt="" draggable={false} width={40} height={40} />
        </div>

        {/* Sheet content — fades in with delay */}
        <div ref={contentWrapperRef} className={`mobile-comment-morph-content ${isVisuallyOpen ? 'mobile-comment-morph-content--visible' : ''}`}>
          {/* Comment list — only when there are comments */}
          {hasComments && (
            <>
              <div className="mobile-comment-sheet-handle" />
              <div className="mobile-comment-sheet-content" ref={contentRef} onScroll={updateScrollFades}>
                {comments.map((comment, index) => (
                  <div key={index} className="mobile-comment-item">
                    <div className="mobile-comment-item-main">
                      <CommentIcon from={comment.from} />
                      <span className="mobile-comment-item-text">{comment.text}</span>
                    </div>
                    {comment.replies?.map((reply, ri) => (
                      <div key={ri} className="mobile-comment-item-reply">
                        <CommentIcon from={reply.from} />
                        <span className="mobile-comment-item-text">{reply.text}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Input bar — always present */}
          <div className="mobile-comment-sheet-input">
            <textarea
              value={replyText}
              onChange={(e) => {
                if (hasComments && replyingToIndex === null) {
                  setReplyingToIndex(comments.length - 1);
                }
                setReplyText(e.target.value);
              }}
              placeholder={hasComments ? 'Reply...' : 'Add your comment'}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onFocus={() => {
                if (hasComments && replyingToIndex === null) {
                  setReplyingToIndex(comments.length - 1);
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!replyText.trim()}
              className={`mobile-comment-reply-btn ${replyText.trim() ? '' : 'mobile-comment-reply-btn--empty'}`}
            >
              <SubmitArrowIcon size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
