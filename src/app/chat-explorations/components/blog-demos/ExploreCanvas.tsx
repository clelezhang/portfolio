'use client';

import { useState, useRef, useEffect } from 'react';
import { ExploreSegment, Exploration } from '@/app/lib/types';
import { ArrowUp, Plus, Minus, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './EditableChatCanvas.css';

interface ExploreCanvasProps {
  initialExploration: Exploration;
  onExplorationChange: (exploration: Exploration) => void;
  explorationId: string;
  initialRecommendations?: Array<{ title: string; description: string }>;
  demoId?: string; // Unique ID for this demo instance to avoid conflicts
  triggerTopic?: string; // Topic to trigger generation externally
  onTopicProcessed?: () => void; // Callback when topic generation starts
}

// Generate stable ID from title and depth
function generateStableId(title: string, depth: number, index: number): string {
  // Simple hash function for stable IDs
  const hash = title.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `section-${depth}-${index}-${Math.abs(hash)}`;
}

// Parse markdown sections from content
function parseSections(content: string, depth: number = 0): ExploreSegment[] {
  const sections: ExploreSegment[] = [];
  const lines = content.split('\n');
  
  const headerPattern = depth === 0 ? /^## / : new RegExp(`^${'#'.repeat(depth + 2)} `);
  
  let currentSection: { title: string; content: string } | null = null;
  let sectionIndex = 0;
  
  for (const line of lines) {
    if (headerPattern.test(line)) {
      // Save previous section
      if (currentSection) {
        sections.push({
          id: generateStableId(currentSection.title, depth, sectionIndex),
          title: currentSection.title,
          description: '',
          content: currentSection.content.trim(),
          depth: depth,
          isExpanded: false,
        });
        sectionIndex++;
      }
      
      // Start new section
      currentSection = {
        title: line.replace(/^#+\s/, '').trim(),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  
  // Save last section
  if (currentSection) {
    sections.push({
      id: generateStableId(currentSection.title, depth, sectionIndex),
      title: currentSection.title,
      description: '',
      content: currentSection.content.trim(),
      depth: depth,
      isExpanded: false,
    });
  }
  
  return sections;
}

interface SectionButtonProps {
  segment: ExploreSegment;
  onExpand: (segment: ExploreSegment) => Promise<void>;
  isExpanding: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  justFinished?: boolean;
  streamingSegments?: Map<string, string>;
  justFinishedTitles?: Set<string>;
  expandingSegmentId?: string | null;
  lastExpandedSegmentId?: string | null;
  parentSegmentId?: string | null;
}

function SectionButton({
  segment,
  onExpand,
  isExpanding,
  isStreaming = false,
  streamingContent,
  justFinished = false,
  streamingSegments,
  justFinishedTitles,
  expandingSegmentId,
  lastExpandedSegmentId,
  parentSegmentId
}: SectionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Handle fade out animation when streaming finishes
  useEffect(() => {
    if (justFinished && !isFadingOut) {
      setIsFadingOut(true);
      // Animation duration matches CSS transition
      const timer = setTimeout(() => {
        setIsFadingOut(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justFinished]);

  const titleSize = {
    0: 'text-xl font-semibold',
    1: 'text-lg font-semibold',
    2: 'text-base font-semibold',
  }[Math.min(segment.depth, 2)] || 'text-base font-semibold';

  // Progressive darkening based on depth - mathematically infinite
  const getBackgroundColor = () => {
    // If currently streaming or expanding, show green
    if ((isExpanding || isStreaming) && !isFadingOut) {
      return 'var(--color-light-green)';
    }

    // If this segment's parent was the most recently expanded, show light green for subsections
    if (parentSegmentId && parentSegmentId === lastExpandedSegmentId) {
      return 'var(--color-light-green)';
    }

    // Depth 0: use CSS variable --color-white
    if (segment.depth === 0) {
      // For depth 0, use the defined white color (with slight darkening on hover)
      if (isHovered) {
        return 'var(--color-off-white)';
      }
      return 'var(--color-white)';
    }

    // Depth 1+: off-white and progressively darker
    // Off-white is hsl(60, 6%, 94%)
    const baseLightness = 94;
    const darkeningPerLevel = 2;
    const hoverAdjustment = isHovered ? 2 : 0;
    const depthAdjustment = (segment.depth - 1) * darkeningPerLevel;
    const lightness = Math.max(baseLightness - depthAdjustment - hoverAdjustment, 68);
    return `hsl(60, 6%, ${lightness}%)`;
  };

  const getTextColor = () => {
    if ((isExpanding || isStreaming) && !isFadingOut) {
      return 'var(--color-olive-dark)';
    }
    // If this segment's parent was the most recently expanded, use olive text
    if (parentSegmentId && parentSegmentId === lastExpandedSegmentId) {
      return 'var(--color-olive-dark)';
    }
    return 'var(--color-black)';
  };

  const getIconColor = () => {
    if ((isExpanding || isStreaming) && !isFadingOut) {
      return 'var(--color-olive-dark)';
    }
    // When collapsed (showing +), use olive green; when expanded (showing -), use black
    return segment.isExpanded ? 'var(--color-black)' : 'var(--color-olive-dark)';
  };

  // Use streaming content if available, otherwise use segment content
  const displayContent = streamingContent || segment.content;

  return (
    <div className={`mb-1.5`} style={{ position: 'relative' }}>
      {segment.isExpanded && (
        <button
          onClick={() => onExpand(segment)}
          disabled={isExpanding}
          style={{
            position: 'absolute',
            left: '16px',
            top: '48px',
            bottom: '0',
            width: '2px',
            backgroundColor: 'var(--color-off-white)',
            borderRadius: '1px',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        />
      )}

      <div className="flex items-start gap-1.5">
        <button
          onClick={() => onExpand(segment)}
          disabled={isExpanding}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex-shrink-0 disabled:opacity-50"
          style={{

            borderRadius: '8px',
            border: 'none',
            backgroundColor: segment.isExpanded ? getBackgroundColor() : 'var(--color-light-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '0.5rem',
            transition: 'background-color 200ms ease-in-out',
          }}
        >
          {(isExpanding || isStreaming) && !isFadingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-olive-dark)' }} />
          ) : segment.isExpanded ? (
            <Minus className="w-4 h-4" style={{ color: getIconColor(), transition: 'color 200ms ease-in-out' }} strokeWidth={2.5} />
          ) : (
            <Plus className="w-4 h-4" style={{ color: getIconColor(), transition: 'color 200ms ease-in-out' }} strokeWidth={2.5} />
          )}
        </button>

        <button
          onClick={() => onExpand(segment)}
          disabled={isExpanding}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex-1 text-left"
          style={{
            backgroundColor: getBackgroundColor(),
            borderRadius: '8px',
            padding: '0.25rem 0.5rem',
            transition: 'background-color 200ms ease-in-out',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {/* Section Title */}
          <div className="flex items-start gap-2 mb-1">
            <h3 className={`${titleSize} flex-1`} style={{ color: getTextColor(), transition: 'color 200ms ease-in-out' }}>
            {segment.title}
          </h3>
        </div>

        {/* Section Content */}
        <div className="message-content" style={{ color: getTextColor(), transition: 'color 200ms ease-in-out' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent}
          </ReactMarkdown>
        </div>
        </button>
      </div>

      {/* Expanded subsections */}
      {segment.isExpanded && segment.subSegments && segment.subSegments.length > 0 && (
        <div className="mt-1.5" style={{ marginLeft: '40px' }}>
          {segment.subSegments.map((subSegment) => (
            <SectionButton
              key={subSegment.id}
              segment={subSegment}
              onExpand={onExpand}
              isExpanding={expandingSegmentId === subSegment.id}
              isStreaming={streamingSegments?.has(subSegment.id) && !justFinishedTitles?.has(subSegment.title)}
              streamingContent={streamingSegments?.get(subSegment.id)}
              justFinished={justFinishedTitles?.has(subSegment.title)}
              streamingSegments={streamingSegments}
              justFinishedTitles={justFinishedTitles}
              expandingSegmentId={expandingSegmentId}
              lastExpandedSegmentId={lastExpandedSegmentId}
              parentSegmentId={segment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExploreCanvas({
  initialExploration,
  onExplorationChange,
  explorationId,
  initialRecommendations = [],
  demoId = 'default',
  triggerTopic,
  onTopicProcessed
}: ExploreCanvasProps) {
  const [exploration, setExploration] = useState<Exploration>(initialExploration);
  const [topicInput, setTopicInput] = useState(initialExploration.rootTopic || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [expandingSegmentId, setExpandingSegmentId] = useState<string | null>(null);
  const [lastExpandedSegmentId, setLastExpandedSegmentId] = useState<string | null>(null);
  const [streamingSegments, setStreamingSegments] = useState<Map<string, string>>(new Map()); // Track streaming content per segment
  const [justFinishedTitles, setJustFinishedTitles] = useState<Set<string>>(new Set()); // Track section titles that just finished streaming
  const [completedSectionTitles, setCompletedSectionTitles] = useState<Set<string>>(new Set()); // Track which section titles are complete
  const [recommendedTopics] = useState<Array<{ title: string; description: string }>>(initialRecommendations);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousSectionsRef = useRef<ExploreSegment[]>([]);

  // Sync with initial exploration when it changes
  useEffect(() => {
    setExploration(initialExploration);
    setTopicInput(initialExploration.rootTopic || '');
    setStreamingContent(initialExploration.fullContent || '');
  }, [initialExploration]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [topicInput]);

  // Handle external topic trigger
  useEffect(() => {
    if (triggerTopic) {
      handleGenerateInitial(triggerTopic);
      onTopicProcessed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerTopic]);

  // Debounced save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onExplorationChange(exploration);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [exploration, onExplorationChange]);

  const handleGenerateInitial = async (customTopic?: string) => {
    const topic = customTopic || topicInput.trim();
    if (!topic || isGenerating) return;

    setIsGenerating(true);
    setStreamingContent('');
    setCompletedSectionTitles(new Set());
    previousSectionsRef.current = [];

    // Update title immediately when generation starts
    setExploration(prev => ({
      ...prev,
      title: topic,
      rootTopic: topic,
    }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateInitial',
          topic: topic,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = ''; // Buffer for incomplete lines

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              if (!data) continue; // Skip empty data lines

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                  
                  // Parse current sections and detect completed ones
                  const currentSections = parseSections(accumulatedContent, 0);
                  const previousSections = previousSectionsRef.current;
                  
                  // When a new section appears, the previous last section is complete
                  if (currentSections.length > previousSections.length && previousSections.length > 0) {
                    // The previous last section is now complete
                    const previousLast = previousSections[previousSections.length - 1];
                    if (previousLast && !completedSectionTitles.has(previousLast.title)) {
                      setCompletedSectionTitles(prev => new Set(prev).add(previousLast.title));
                      setJustFinishedTitles(prev => new Set(prev).add(previousLast.title));
                      
                      // Clear fade state after animation
                      setTimeout(() => {
                        setJustFinishedTitles(prev => {
                          const next = new Set(prev);
                          next.delete(previousLast.title);
                          return next;
                        });
                      }, 500);
                    }
                  }
                  
                  previousSectionsRef.current = currentSections;
                }
              } catch (e) {
                // Silently skip incomplete JSON chunks - they'll be completed in the next chunk
                // Only log if it's not a typical "Unterminated string" error from incomplete streaming
                if (e instanceof SyntaxError && !e.message.includes('Unterminated')) {
                  console.error('Error parsing stream data:', e);
                }
              }
            }
          }
        }
      }

      // Parse sections from the complete content
      const sections = parseSections(accumulatedContent, 0);
      
      // Mark the last section as complete too
      const lastSection = sections[sections.length - 1];
      if (lastSection && !completedSectionTitles.has(lastSection.title)) {
        setJustFinishedTitles(prev => new Set(prev).add(lastSection.title));
        setTimeout(() => {
          setJustFinishedTitles(prev => {
            const next = new Set(prev);
            next.delete(lastSection.title);
            return next;
          });
        }, 500);
      }
      
      const updatedExploration = {
        ...exploration,
        rootTopic: topic,
        title: topic,
        fullContent: accumulatedContent,
        segments: sections,
        updatedAt: Date.now(),
      };
      
      setExploration(updatedExploration);

      // Dispatch event to update sidebar
      const event = new CustomEvent(`explorationUpdated-${demoId}`, {
        detail: { explorationId }
      });
      window.dispatchEvent(event);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation cancelled by user');
      } else {
        console.error('Error generating response:', error);
      }
    } finally {
      setIsGenerating(false);
      setCompletedSectionTitles(new Set());
      previousSectionsRef.current = [];
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateInitial();
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Helper to update a segment in the tree
  const updateSegmentInTree = (
    segments: ExploreSegment[],
    segmentId: string,
    updater: (segment: ExploreSegment) => ExploreSegment
  ): ExploreSegment[] => {
    return segments.map(segment => {
      if (segment.id === segmentId) {
        return updater(segment);
      }
      if (segment.subSegments) {
        return {
          ...segment,
          subSegments: updateSegmentInTree(segment.subSegments, segmentId, updater),
        };
      }
      return segment;
    });
  };

  const handleExpandSection = async (segment: ExploreSegment) => {
    // If already expanded, collapse it
    if (segment.isExpanded) {
      const updatedSegments = updateSegmentInTree(
        exploration.segments,
        segment.id,
        (seg) => ({ ...seg, isExpanded: false })
      );
      setExploration({ ...exploration, segments: updatedSegments });
      // Clear last expanded when collapsing
      if (lastExpandedSegmentId === segment.id) {
        setLastExpandedSegmentId(null);
      }
      return;
    }

    // Set this as the most recently expanded section
    setLastExpandedSegmentId(segment.id);

    // If already has subsections, just expand
    if (segment.subSegments && segment.subSegments.length > 0) {
      const updatedSegments = updateSegmentInTree(
        exploration.segments,
        segment.id,
        (seg) => ({ ...seg, isExpanded: true })
      );
      setExploration({ ...exploration, segments: updatedSegments });
      return;
    }

    // Need to generate expanded content with streaming
    setExpandingSegmentId(segment.id);
    
    try {
      const payload = {
        action: 'expandSection',
        sectionTitle: segment.title,
        sectionContent: segment.content || '',
        parentContext: exploration.rootTopic,
        depth: segment.depth,
      };
      
      console.log('Expanding section with payload:', payload);
      
      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Expand section failed:', response.status, errorText);
        throw new Error(`Failed to expand section: ${response.status} ${errorText}`);
      }

      // Read the streamed response and update UI progressively
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let expandedContent = '';
      let previousSubSections: ExploreSegment[] = [];
      const completedSubTitles = new Set<string>();
      let buffer = ''; // Buffer for incomplete lines

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              if (!data) continue; // Skip empty data lines

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  expandedContent = parsed.content;
                  
                  // Parse and update subsections progressively
                  const subSegments = parseSections(expandedContent, segment.depth + 1);
                  
                  // Only mark the LAST subsection as streaming (the one currently being generated)
                  const lastSubSegment = subSegments[subSegments.length - 1];
                  if (lastSubSegment) {
                    const content = lastSubSegment.content;
                    if (content) {
                      setStreamingSegments(prev => new Map(prev).set(lastSubSegment.id, content));
                    }
                  }
                  
                  // When a new subsection appears, previous subsections are complete
                  if (subSegments.length > previousSubSections.length) {
                    // The previous last subsection is now complete
                    const previousLast = previousSubSections[previousSubSections.length - 1];
                    if (previousLast && !completedSubTitles.has(previousLast.title)) {
                      completedSubTitles.add(previousLast.title);
                      setJustFinishedTitles(prev => new Set(prev).add(previousLast.title));
                      
                      // Clear fade state after animation
                      setTimeout(() => {
                        setJustFinishedTitles(prev => {
                          const next = new Set(prev);
                          next.delete(previousLast.title);
                          return next;
                        });
                        setStreamingSegments(prev => {
                          const next = new Map(prev);
                          next.delete(previousLast.id);
                          return next;
                        });
                      }, 500);
                    }
                  }
                  
                  previousSubSections = subSegments;
                  
                  const updatedSegments = updateSegmentInTree(
                    exploration.segments,
                    segment.id,
                    (seg) => ({
                      ...seg,
                      subSegments,
                      isExpanded: true,
                    })
                  );
                  setExploration({ ...exploration, segments: updatedSegments, updatedAt: Date.now() });
                }
              } catch (e) {
                // Silently skip incomplete JSON chunks - they'll be completed in the next chunk
                // Only log if it's not a typical "Unterminated string" error from incomplete streaming
                if (e instanceof SyntaxError && !e.message.includes('Unterminated')) {
                  console.error('Error parsing stream data:', e);
                }
              }
            }
          }
        }
      }

      // Mark the last subsection as complete too
      const lastSubSection = previousSubSections[previousSubSections.length - 1];
      if (lastSubSection && !completedSubTitles.has(lastSubSection.title)) {
        setJustFinishedTitles(prev => new Set(prev).add(lastSubSection.title));
        setTimeout(() => {
          setJustFinishedTitles(prev => {
            const next = new Set(prev);
            next.delete(lastSubSection.title);
            return next;
          });
          setStreamingSegments(prev => {
            const next = new Map(prev);
            next.delete(lastSubSection.id);
            return next;
          });
        }, 500);
      }
      
      // Clean up any remaining streaming states
      setTimeout(() => {
        previousSubSections.forEach(sub => {
          setStreamingSegments(prev => {
            const next = new Map(prev);
            next.delete(sub.id);
            return next;
          });
        });
      }, 500);
      
    } catch (error) {
      console.error('Error expanding section:', error);
    } finally {
      setExpandingSegmentId(null);
    }
  };

  // Show streaming content if generating
  const displaySegments = isGenerating ? parseSections(streamingContent, 0) : exploration.segments;

  return (
    <>


      {/* Content Display */}
      <div className="messages-container">
        <div className="messages-wrapper">

        {/* Input Section at top - Only show if no content yet */}
      {!exploration.fullContent && (
        <div className="input-container" style={{ position: 'relative', paddingBottom: '0', paddingLeft: '0', background: 'none' }}>
          <div className="input-wrapper" style={{ padding: '0' }}>
            <div className="input-box">
              <textarea
                ref={textareaRef}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Dig deeper with clod..."
                className="input-textarea"
                rows={1}
                disabled={isGenerating}
              />
              
              <div className="input-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                  onClick={isGenerating ? stopGeneration : () => handleGenerateInitial()}
                  disabled={!isGenerating && !topicInput.trim()}
                  className={`send-button ${isGenerating ? 'stop-mode' : ''}`}
                  style={{
                    backgroundColor: isGenerating 
                      ? 'var(--color-button-disabled)' 
                      : (topicInput.trim() ? 'var(--color-olive-dark)' : 'var(--color-button-disabled)')
                  }}
                  type="button"
                  aria-label={isGenerating ? "Stop generation" : "Send message"}
                >
                  {isGenerating ? (
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'var(--color-black)',
                        borderRadius: '2px'
                      }}
                    />
                  ) : (
                    <ArrowUp className="w-5 h-5" style={{ color: 'var(--color-white)' }} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
          {exploration.fullContent ? (
            // Show title once content is generated
            <div className="ml-12 mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-black)' }}>
                {exploration.title || exploration.rootTopic}
              </h1>
            </div>
          ) : null}
          
          {displaySegments.length > 0 ? (
            <div>
              {displaySegments.map((segment) => (
                <SectionButton
                  key={segment.id}
                  segment={segment}
                  onExpand={handleExpandSection}
                  isExpanding={expandingSegmentId === segment.id}
                  isStreaming={(isGenerating || streamingSegments.has(segment.id)) && !justFinishedTitles.has(segment.title) && !completedSectionTitles.has(segment.title)}
                  streamingContent={streamingSegments.get(segment.id)}
                  justFinished={justFinishedTitles.has(segment.title)}
                  streamingSegments={streamingSegments}
                  justFinishedTitles={justFinishedTitles}
                  expandingSegmentId={expandingSegmentId}
                  lastExpandedSegmentId={lastExpandedSegmentId}
                />
              ))}
            </div>
          ) : (
            !isGenerating && !exploration.fullContent && (
              <div className="flex flex-col text-start mt-20 gap-4">
                <p style={{ color: 'var(--color-gray)'}} className="text-lg">
                  Start exploring
                </p>
                {recommendedTopics.length > 0 && (
                  <div className="flex flex-row gap-3 justify-center items-stretch mx-auto w-full">
                    {recommendedTopics.slice(0, 3).map((topic, index) => {
                      // Assign colors in a stable, deterministic way based on topic
                      const greenColors = [
                        'var(--color-olive-dark)',
                        'var(--color-olive-light)',
                        'var(--color-light-green)',
                      ];
                      // Use a simple hash of the title to pick a color
                      const colorHash = topic.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const colorIndex = colorHash % greenColors.length;
                      const topicColor = greenColors[(colorIndex + index) % greenColors.length];
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            const fullTopic = `${topic.title}: ${topic.description}`;
                            setTopicInput(fullTopic);
                            // Auto-submit with the topic directly
                            handleGenerateInitial(fullTopic);
                          }}
                          className="p-4 flex-1 text-left flex flex-col gap-8 topic-button"
                          style={{
                            backgroundColor: 'var(--color-off-white)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'var(--color-gray)',
                            fontSize: 'var(--font-size-message)',
                            transition: 'background-color 200ms ease-in-out',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-hover-off-white)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-off-white)';
                          }}
                        >
                          {/* Green dot */}
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: topicColor,
                            }}
                          />
                          <div className="flex flex-col gap-1">
                            <div style={{ 
                              color: 'var(--color-black)', 
                              lineHeight: '1.2',
                              marginBottom: '0.25rem'
                            }}>
                              {topic.title}
                            </div>
                            <div style={{ 
                              color: 'var(--color-gray)', 
                              fontSize: '0.875rem',
                              lineHeight: '1.3'
                            }}>
                              {topic.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
