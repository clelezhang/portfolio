import { useCallback } from 'react';

/**
 * Hook for auto-resizing textarea height based on content.
 * Returns an onInput handler to attach to the textarea.
 */
export function useAutoResizeTextarea(maxHeight = 100) {
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, maxHeight) + 'px';
  }, [maxHeight]);

  return handleInput;
}
