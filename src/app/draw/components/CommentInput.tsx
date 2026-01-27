import { Point } from '../types';

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
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="draw-comment-submit draw-comment-submit--top"
            style={{
              backgroundColor: strokeColor,
              opacity: commentText.trim() ? 1 : 0.4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 10V2M3 5l3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </form>
    </>
  );
}
