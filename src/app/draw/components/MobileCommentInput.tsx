import { SubmitArrowIcon } from './icons';

interface MobileCommentInputProps {
  commentText: string;
  setCommentText: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function MobileCommentInput({
  commentText,
  setCommentText,
  onSubmit,
  onCancel,
}: MobileCommentInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onSubmit(e);
  };

  return (
    <div className="mobile-comment-input-backdrop" onClick={onCancel}>
      <form
        className="mobile-comment-input-bar"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-comment-input-field">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add your comment"
            rows={1}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (commentText.trim()) handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className={`mobile-comment-submit ${commentText.trim() ? '' : 'mobile-comment-submit--empty'}`}
          >
            <SubmitArrowIcon size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}
