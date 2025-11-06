import { useState, useEffect, useCallback } from 'react';
import { ConversationIndex, IndexSection } from '@/app/lib/types';

interface UseConversationIndexResult {
  index: ConversationIndex | null;
  loading: boolean;
  error: string | null;
  getSectionTitle: (sectionId: string) => Promise<string>;
  regenerateIndex: () => Promise<void>;
  titlesLoading: Set<string>;
}

/**
 * Hook to manage conversation index with lazy title generation
 */
export function useConversationIndex(conversationId: string): UseConversationIndexResult {
  const [index, setIndex] = useState<ConversationIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titlesLoading, setTitlesLoading] = useState<Set<string>>(new Set());

  // Fetch initial index
  useEffect(() => {
    const fetchIndex = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/conversations/${conversationId}/index`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch index');
        }
        
        const data = await response.json();
        setIndex(data);
      } catch (err) {
        console.error('Error fetching index:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchIndex();
    }
  }, [conversationId]);

  // Generate title for a specific section
  const getSectionTitle = useCallback(async (sectionId: string): Promise<string> => {
    if (!index) return '';
    
    // Check if title already exists
    const section = index.sections.find(s => s.id === sectionId);
    if (section?.title) {
      return section.title;
    }

    // Mark as loading
    setTitlesLoading(prev => new Set(prev).add(sectionId));

    try {
      const response = await fetch(`/api/conversations/${conversationId}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to generate title';
        console.error('Failed to generate title:', errorMsg);
        throw new Error(errorMsg);
      }

      const { title } = await response.json();

      // Update index with new title
      setIndex(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId
              ? { ...s, title, generatedAt: Date.now() }
              : s
          ),
        };
      });

      return title;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error generating title for section', sectionId, ':', errorMsg);
      return 'Untitled Section';
    } finally {
      setTitlesLoading(prev => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  }, [conversationId, index]);

  // Regenerate entire index
  const regenerateIndex = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/index`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate index');
      }

      const data = await response.json();
      setIndex(data);
    } catch (err) {
      console.error('Error regenerating index:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  return {
    index,
    loading,
    error,
    getSectionTitle,
    regenerateIndex,
    titlesLoading,
  };
}

