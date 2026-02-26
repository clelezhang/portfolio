import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Comment, Point } from '../types';
import { LOCALSTORAGE_DEBOUNCE_MS } from '../constants';

const COMMENTS_STORAGE_KEY = 'draw-comments';

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

  // Load saved comments from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Comment[];
        // Only restore saved comments (drop temp ones), and clear streaming state
        const restored = parsed
          .filter(c => c.status !== 'temp')
          .map(c => ({
            ...c,
            replies: c.replies?.map(r => ({ ...r, isStreaming: false, displayLength: undefined })),
          }));
        if (restored.length > 0) setComments(restored);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  }, []);

  // Save comments to localStorage when they change (debounced)
  useEffect(() => {
    // Only save non-temp, saved comments
    const toSave = comments.filter(c => c.status !== 'temp');
    if (toSave.length === 0 && comments.length === 0) return;
    const timeoutId = setTimeout(() => {
      try {
        if (toSave.length === 0) {
          localStorage.removeItem(COMMENTS_STORAGE_KEY);
        } else {
          localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(toSave));
        }
      } catch (e) {
        console.error('Failed to save comments:', e);
      }
    }, LOCALSTORAGE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [comments]);

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
      // Auto-open newly created comments
      setOpenCommentIndex(newComments.length - 1);
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
        // User reply to temp → auto-save
        let newStatus = comment.status;
        let newTempStartedAt = comment.tempStartedAt;

        if (from === 'human' && comment.status === 'temp') {
          newStatus = 'saved';
          newTempStartedAt = undefined;
        }

        const newReply = from === 'claude'
          ? { text, from, isStreaming: true, displayLength: 0 }
          : { text, from };
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
          status: newStatus,
          tempStartedAt: newTempStartedAt,
        };
      }
      return comment;
    }));
    setReplyingToIndex(null);
    setReplyText('');
  }, []);

  // Streaming interval: increment displayLength on streaming replies
  const hasStreaming = comments.some(c =>
    c.replies?.some(r => r.isStreaming)
  );

  useEffect(() => {
    if (!hasStreaming) return;

    // Read speed from CSS custom property (default 30ms/char)
    const speedStr = getComputedStyle(document.documentElement)
      .getPropertyValue('--comment-stream-speed').trim();
    const speed = speedStr ? Number(speedStr) : 30;

    const interval = setInterval(() => {
      setComments(prev => {
        let changed = false;
        const next = prev.map(comment => {
          if (!comment.replies?.some(r => r.isStreaming)) return comment;
          const updatedReplies = comment.replies!.map(reply => {
            if (!reply.isStreaming) return reply;
            const len = (reply.displayLength ?? 0) + 1;
            if (len >= reply.text.length) {
              changed = true;
              return { ...reply, displayLength: reply.text.length, isStreaming: false };
            }
            changed = true;
            return { ...reply, displayLength: len };
          });
          return { ...comment, replies: updatedReplies };
        });
        return changed ? next : prev;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [hasStreaming]);

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
