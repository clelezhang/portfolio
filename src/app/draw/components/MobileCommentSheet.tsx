import { useRef, useEffect } from 'react';
import { Comment } from '../types';
import { useAutoResizeTextarea } from '../hooks';
import { SubmitArrowIcon } from './icons';

interface MobileCommentSheetProps {
  isOpen: boolean;
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

export function MobileCommentSheet({
  isOpen,
  onClose,
  comments,
  replyingToIndex,
  setReplyingToIndex,
  replyText,
  setReplyText,
  addReplyToComment,
  onUserReply,
}: MobileCommentSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handleTextareaResize = useAutoResizeTextarea(80);

  // Scroll to bottom when sheet opens
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [isOpen, comments.length]);

  const handleReplySubmit = (index: number) => {
    if (!replyText.trim()) return;
    if (onUserReply) {
      onUserReply(index, replyText.trim());
    } else {
      addReplyToComment(index, replyText.trim(), 'human');
    }
    setReplyingToIndex(null);
    setReplyText('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-comment-sheet-backdrop" onClick={onClose} />
      <div className="mobile-comment-sheet">
        <div className="mobile-comment-sheet-handle" />
        <div className="mobile-comment-sheet-content" ref={contentRef}>
          {comments.length === 0 ? (
            <div className="mobile-comment-sheet-empty">No comments yet</div>
          ) : (
            comments.map((comment, index) => (
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
                {replyingToIndex === index && (
                  <div className="mobile-comment-item-reply-input">
                    <CommentIcon from="human" />
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply..."
                      rows={1}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setReplyingToIndex(null);
                          setReplyText('');
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleReplySubmit(index);
                        }
                      }}
                      onInput={handleTextareaResize}
                    />
                    <button
                      onClick={() => handleReplySubmit(index)}
                      disabled={!replyText.trim()}
                      className={`mobile-comment-reply-btn ${replyText.trim() ? '' : 'mobile-comment-reply-btn--empty'}`}
                    >
                      <SubmitArrowIcon size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom reply input */}
        <div className="mobile-comment-sheet-input">
          <textarea
            value={replyingToIndex !== null ? '' : replyText}
            onChange={(e) => {
              if (replyingToIndex === null && comments.length > 0) {
                setReplyingToIndex(comments.length - 1);
              }
              setReplyText(e.target.value);
            }}
            placeholder="Reply..."
            rows={1}
            onInput={handleTextareaResize}
            onFocus={() => {
              if (replyingToIndex === null && comments.length > 0) {
                setReplyingToIndex(comments.length - 1);
              }
            }}
          />
          <button
            onClick={() => {
              if (replyingToIndex !== null) handleReplySubmit(replyingToIndex);
            }}
            disabled={!replyText.trim()}
            className={`mobile-comment-reply-btn ${replyText.trim() ? '' : 'mobile-comment-reply-btn--empty'}`}
          >
            <SubmitArrowIcon size={12} />
          </button>
        </div>
      </div>
    </>
  );
}
