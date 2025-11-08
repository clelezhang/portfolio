'use client';

import { useConversationIndex } from '@/app/hooks/useConversationIndex';
import { useEffect, useState } from 'react';
import { List, RefreshCw } from 'lucide-react';
import { IndexSection } from '@/app/lib/types';

interface ConversationIndexProps {
  conversationId: string;
  onSectionClick?: (startMessageId: string) => void;
}

/**
 * Example component showing how to use the conversation index
 * This displays the index and lazily loads section titles
 */
export default function ConversationIndex({ conversationId, onSectionClick }: ConversationIndexProps) {
  const { index, loading, error, getSectionTitle, regenerateIndex, titlesLoading } = useConversationIndex(conversationId);
  const [sectionTitles, setSectionTitles] = useState<Map<string, string>>(new Map());

  // Load titles for visible sections
  useEffect(() => {
    if (!index) return;

    // Load titles for all sections (could be optimized to load only visible ones)
    const loadTitles = async () => {
      for (const section of index.sections) {
        if (!sectionTitles.has(section.id) && !section.title) {
          const title = await getSectionTitle(section.id);
          setSectionTitles(prev => new Map(prev).set(section.id, title));
        } else if (section.title && !sectionTitles.has(section.id)) {
          setSectionTitles(prev => new Map(prev).set(section.id, section.title!));
        }
      }
    };

    loadTitles();
  }, [index, conversationId, getSectionTitle, sectionTitles]);

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 animate-pulse" />
          <span>Loading index...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading index: {error}
      </div>
    );
  }

  if (!index || index.sections.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        <div className="flex flex-col gap-2">
          <span>No sections yet. Chat more to build an index!</span>
          <p className="text-xs text-gray-400">
            Sections will be automatically created after 3+ messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5" />
          <h3 className="font-semibold">Index</h3>
          <span className="text-sm text-gray-500">({index.sections.length} sections)</span>
        </div>
        <button
          onClick={regenerateIndex}
          className="p-1 hover:bg-gray-100 rounded"
          title="Regenerate index"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {index.sections.map((section: IndexSection, idx: number) => {
          const title = sectionTitles.get(section.id) || section.title;
          const isLoading = titlesLoading.has(section.id);

          return (
            <button
              key={section.id}
              onClick={() => onSectionClick?.(section.startMessageId)}
              className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 mt-1 min-w-[1.5rem]">
                  {idx + 1}.
                </span>
                <div className="flex-1">
                  {isLoading ? (
                    <span className="text-sm text-gray-400 italic">Generating title...</span>
                  ) : title ? (
                    <span className="text-sm">{title}</span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Untitled section</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Last updated: {new Date(index.lastGenerated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

