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

  return (
    <>
      {/* Backdrop */}
      <div
        className="draw-comment-input-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      />
      <form
        onSubmit={onSubmit}
        className="draw-comment-input-form"
        style={{
          position: 'absolute',
          left: screenPosition.x,
          top: screenPosition.y,
          zIndex: 40,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="draw-comment-input-bubble" onMouseEnter={onMouseEnterBubble} onMouseLeave={onMouseLeaveBubble}>
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
                if (e.key === 'Escape') onCancel();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (commentText.trim()) {
                    onSubmit(e as unknown as React.FormEvent);
                  }
                }
              }}
              onInput={handleTextareaResize}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`draw-comment-submit${commentText.trim() ? '' : ' draw-comment-submit--empty'}`}
              style={commentText.trim() ? { backgroundColor: strokeColor } : undefined}
            >
              <SubmitArrowIcon />
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
