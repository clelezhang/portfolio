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
}

export function CommentInput({
  screenPosition,
  commentText,
  setCommentText,
  strokeColor,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const handleTextareaResize = useAutoResizeTextarea(100);

  return (
    <>
      {/* Backdrop */}
      <div
        className="draw-comment-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      />
      <form
        onSubmit={onSubmit}
        className="draw-comment-popup draw-comment-popup--open draw-comment-popup--input"
        style={{
          left: screenPosition.x,
          top: screenPosition.y,
          zIndex: 40,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
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
            className="draw-comment-submit draw-comment-submit--top"
            style={{
              backgroundColor: strokeColor,
              opacity: commentText.trim() ? 1 : 0.6,
            }}
          >
            <SubmitArrowIcon />
          </button>
        </div>
      </form>
    </>
  );
}
