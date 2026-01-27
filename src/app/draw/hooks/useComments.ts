import { useState, useCallback, RefObject } from 'react';
import { Comment, Point } from '../types';

interface UseCommentsProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  lastDrawnPoint: RefObject<Point | null>;
}

interface UseCommentsReturn {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  openCommentIndex: number | null;
  setOpenCommentIndex: React.Dispatch<React.SetStateAction<number | null>>;
  hoveredCommentIndex: number | null;
  setHoveredCommentIndex: React.Dispatch<React.SetStateAction<number | null>>;
  replyingToIndex: number | null;
  setReplyingToIndex: React.Dispatch<React.SetStateAction<number | null>>;
  replyText: string;
  setReplyText: React.Dispatch<React.SetStateAction<string>>;
  commentInput: Point | null;
  setCommentInput: React.Dispatch<React.SetStateAction<Point | null>>;
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  addComment: (text: string, from: 'human' | 'claude', x?: number, y?: number) => void;
  deleteComment: (index: number) => void;
  addReplyToComment: (index: number, text: string, from: 'human' | 'claude') => void;
  handleCommentCancel: () => void;
}

export function useComments({ canvasRef, lastDrawnPoint }: UseCommentsProps): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [openCommentIndex, setOpenCommentIndex] = useState<number | null>(null);
  const [hoveredCommentIndex, setHoveredCommentIndex] = useState<number | null>(null);
  const [replyingToIndex, setReplyingToIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentInput, setCommentInput] = useState<Point | null>(null);
  const [commentText, setCommentText] = useState('');

  const addComment = useCallback((text: string, from: 'human' | 'claude', x?: number, y?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let commentX = x;
    let commentY = y;

    if (commentX === undefined) {
      if (from === 'human' && lastDrawnPoint.current) {
        commentX = lastDrawnPoint.current.x + 10;
        commentY = lastDrawnPoint.current.y - 10;
      } else if (from === 'human') {
        commentX = 50;
        commentY = 50;
      } else {
        commentX = canvas.width - 200;
        commentY = 50;
      }
    }

    setComments((prev) => [...prev, { text, x: commentX!, y: commentY!, from }]);
  }, [canvasRef, lastDrawnPoint]);

  const deleteComment = useCallback((index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index));
    setOpenCommentIndex(null);
    setReplyingToIndex(null);
  }, []);

  const addReplyToComment = useCallback((index: number, text: string, from: 'human' | 'claude') => {
    setComments((prev) => prev.map((comment, i) => {
      if (i === index) {
        return {
          ...comment,
          replies: [...(comment.replies || []), { text, from }],
        };
      }
      return comment;
    }));
    setReplyingToIndex(null);
    setReplyText('');
  }, []);

  const handleCommentCancel = useCallback(() => {
    setCommentInput(null);
    setCommentText('');
  }, []);

  return {
    comments,
    setComments,
    openCommentIndex,
    setOpenCommentIndex,
    hoveredCommentIndex,
    setHoveredCommentIndex,
    replyingToIndex,
    setReplyingToIndex,
    replyText,
    setReplyText,
    commentInput,
    setCommentInput,
    commentText,
    setCommentText,
    addComment,
    deleteComment,
    addReplyToComment,
    handleCommentCancel,
  };
}
