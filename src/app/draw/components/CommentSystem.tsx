import { memo } from 'react';
import { Comment, Point, Tool } from '../types';
import { COMMENT_DOT_SIZE, COMMENT_HIT_AREA_SIZE } from '../constants';
import { useAutoResizeTextarea } from '../hooks';
import { CloseIcon, SubmitArrowIcon } from './icons';

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
  tool: Tool;
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
  tool,
}: CommentSystemProps) {
  // Only allow comment interaction in comment/select mode, otherwise let drawing pass through
  const isInteractive = tool === 'comment' || tool === 'select';

  return (
    <>
      {comments.map((comment, i) => {
        const screenPos = canvasToScreen(comment.x, comment.y);
        const isOpen = openCommentIndex === i;
        const isHovered = hoveredCommentIndex === i && !isOpen;
        const isReplying = replyingToIndex === i;

        return (
          <div
            key={i}
            className="draw-comment-hit-area"
            style={{
              left: screenPos.x - COMMENT_HIT_AREA_SIZE / 2,
              pointerEvents: isInteractive ? 'auto' : 'none',
              top: screenPos.y - COMMENT_HIT_AREA_SIZE / 2,
              width: COMMENT_HIT_AREA_SIZE,
              height: COMMENT_HIT_AREA_SIZE,
            }}
            onMouseEnter={() => setHoveredCommentIndex(i)}
            onMouseLeave={() => setHoveredCommentIndex(null)}
            onClick={(e) => {
              e.stopPropagation();
              setOpenCommentIndex(isOpen ? null : i);
              setReplyingToIndex(null);
            }}
          >
            <div className="absolute inset-0" />
            {/* Visible dot */}
            <div
              className="draw-comment-dot"
              style={{
                width: COMMENT_DOT_SIZE,
                height: COMMENT_DOT_SIZE,
                top: (COMMENT_HIT_AREA_SIZE - COMMENT_DOT_SIZE) / 2,
                left: (COMMENT_HIT_AREA_SIZE - COMMENT_DOT_SIZE) / 2,
                backgroundColor: strokeColor,
              }}
            />

            {/* Single popup for both hover and open states */}
            {(isHovered || isOpen) && (
              <CommentPopup
                comment={comment}
                isOpen={isOpen}
                top={COMMENT_HIT_AREA_SIZE / 2}
                left={COMMENT_HIT_AREA_SIZE / 2}
                onMouseEnter={() => setHoveredCommentIndex(i)}
                onMouseLeave={(e) => {
                  if (isOpen) return;
                  const relatedTarget = e.relatedTarget;
                  if (!relatedTarget) {
                    setHoveredCommentIndex(null);
                    return;
                  }
                  const parent = e.currentTarget.parentElement;
                  if (parent && relatedTarget instanceof Node && parent.contains(relatedTarget)) return;
                  setHoveredCommentIndex(null);
                }}
                onOpen={() => {
                  if (hasCommentInput && onCloseCommentInput) {
                    onCloseCommentInput();
                    return;
                  }
                  setOpenCommentIndex(i);
                }}
                onDelete={() => deleteComment(i)}
                isReplying={isReplying}
                replyText={replyText}
                setReplyText={setReplyText}
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
                strokeColor={strokeColor}
              />
            )}
          </div>
        );
      })}
    </>
  );
});

interface CommentPopupProps {
  comment: Comment;
  isOpen: boolean;
  top: number;
  left: number;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onOpen?: () => void;
  onDelete?: () => void;
  isReplying?: boolean;
  replyText?: string;
  setReplyText?: (text: string) => void;
  onReplyStart?: () => void;
  onReplyCancel?: () => void;
  onReplySubmit?: () => void;
  strokeColor?: string;
}

function CommentPopup({
  comment,
  isOpen,
  top,
  left,
  onMouseEnter,
  onMouseLeave,
  onOpen,
  onDelete,
  isReplying,
  replyText,
  setReplyText,
  onReplyStart,
  onReplyCancel,
  onReplySubmit,
  strokeColor,
}: CommentPopupProps) {
  const handleTextareaResize = useAutoResizeTextarea(80);

  return (
    <div
      className={`draw-comment-popup ${isOpen ? 'draw-comment-popup--open' : ''}`}
      style={{ top, left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
        if (!isOpen && onOpen) {
          onOpen();
        }
      }}
    >
      {/* Main comment */}
      <div className="draw-comment-row">
        <img
          src={comment.from === 'human' ? '/draw/user.svg' : '/draw/claude.svg'}
          alt=""
          className="draw-comment-icon"
        />
        <span className="draw-comment-text">{comment.text}</span>
        {isOpen && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="draw-comment-delete"
            title="Delete comment"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Replies */}
      {comment.replies?.map((reply, ri) => (
        <div key={ri} className="draw-comment-row">
          <img
            src={reply.from === 'human' ? '/draw/user.svg' : '/draw/claude.svg'}
            alt=""
            className="draw-comment-icon"
          />
          <span className="draw-comment-text">{reply.text}</span>
        </div>
      ))}

      {/* Reply input (only when open) */}
      {isOpen && isReplying && setReplyText && onReplyCancel && onReplySubmit && strokeColor && (
        <div className="draw-comment-row draw-comment-row--reply">
          <img src="/draw/user.svg" alt="" draggable={false} className="draw-reply-btn-icon draw-img-no-anim" />
          <div className="flex-1 relative">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply..."
              className="draw-comment-input"
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
              className="draw-comment-submit"
              style={{
                backgroundColor: strokeColor,
                opacity: replyText?.trim() ? 1 : 0.6,
              }}
            >
              <SubmitArrowIcon />
            </button>
          </div>
        </div>
      )}

      {/* Reply button (only when open and not replying) */}
      {isOpen && !isReplying && onReplyStart && (
        <div className="draw-reply-btn" onClick={(e) => { e.stopPropagation(); onReplyStart(); }}>
          <img src="/draw/user.svg" alt="" draggable={false} className="draw-reply-btn-icon draw-img-no-anim" />
          <span className="draw-reply-btn-text">Reply...</span>
        </div>
      )}
    </div>
  );
}
