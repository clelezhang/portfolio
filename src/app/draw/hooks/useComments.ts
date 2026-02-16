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
  saveComment: (index: number) => void;
  dismissComment: (index: number) => void;
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

    // Claude comments start in temp state; user comments start saved
    const newComment: Comment = {
      text,
      x: commentX!,
      y: commentY!,
      from,
      status: from === 'claude' ? 'temp' : 'saved',
      tempStartedAt: from === 'claude' ? Date.now() : undefined,
    };

    setComments((prev) => {
      const newComments = [...prev, newComment];
      // Auto-open Claude's comments
      if (from === 'claude') {
        setOpenCommentIndex(newComments.length - 1);
      }
      return newComments;
    });
  }, [canvasRef, lastDrawnPoint]);

  const deleteComment = useCallback((index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index));
    setOpenCommentIndex(null);
    setReplyingToIndex(null);
  }, []);

  const addReplyToComment = useCallback((index: number, text: string, from: 'human' | 'claude') => {
    setComments((prev) => prev.map((comment, i) => {
      if (i === index) {
        // Claude reply → make temp; User reply to temp → auto-save
        let newStatus = comment.status;
        let newTempStartedAt = comment.tempStartedAt;

        if (from === 'claude') {
          // Claude replying puts comment in temp state
          newStatus = 'temp';
          newTempStartedAt = Date.now();
        } else if (from === 'human' && comment.status === 'temp') {
          // User replying to temp comment auto-saves it
          newStatus = 'saved';
          newTempStartedAt = undefined;
        }

        return {
          ...comment,
          replies: [...(comment.replies || []), { text, from }],
          status: newStatus,
          tempStartedAt: newTempStartedAt,
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

  const saveComment = useCallback((index: number) => {
    setComments((prev) => prev.map((comment, i) => {
      if (i === index && comment.status === 'temp') {
        return {
          ...comment,
          status: 'saved',
          tempStartedAt: undefined,
        };
      }
      return comment;
    }));
  }, []);

  const dismissComment = useCallback((index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index));
    setOpenCommentIndex(null);
    setReplyingToIndex(null);
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
    saveComment,
    dismissComment,
  };
}
