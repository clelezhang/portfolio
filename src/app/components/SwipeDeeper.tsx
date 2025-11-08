'use client';

import { useState, useRef, useEffect } from 'react';
import { Exploration, ExploreSegment, SwipeDepthPage } from '@/app/lib/types';
import EditableSwipeSection from './EditableSwipeSection';
import { ArrowUp, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import './SwipeDeeper.css';
import './EditableChatCanvas.css';

interface SwipeDeeperProps {
  initialExploration: Exploration;
  onExplorationChange: (exploration: Exploration) => void;
  explorationId: string;
  triggerTopic?: string; // Topic to trigger generation externally
  onTopicProcessed?: () => void; // Callback when topic generation starts
}

// Parse markdown sections from content
function parseSections(content: string, depth: number = 0): ExploreSegment[] {
  const sections: ExploreSegment[] = [];
  const lines = content.split('\n');

  const headerPattern = depth === 0 ? /^## / : new RegExp(`^${'#'.repeat(depth + 3)} `);

  let currentSection: { title: string; content: string } | null = null;
  let sectionIndex = 0;

  for (const line of lines) {
    if (headerPattern.test(line)) {
      if (currentSection) {
        sections.push({
          id: `section-${depth}-${sectionIndex}-${Date.now()}`,
          title: currentSection.title,
          description: '',
          content: currentSection.content.trim(),
          depth: depth,
          isExpanded: false,
        });
        sectionIndex++;
      }

      currentSection = {
        title: line.replace(/^#+\s/, '').trim(),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push({
      id: `section-${depth}-${sectionIndex}-${Date.now()}`,
      title: currentSection.title,
      description: '',
      content: currentSection.content.trim(),
      depth: depth,
      isExpanded: false,
    });
  }

  return sections;
}

export default function SwipeDeeper({
  initialExploration,
  onExplorationChange,
  explorationId,
  triggerTopic,
  onTopicProcessed
}: SwipeDeeperProps) {
  const [exploration, setExploration] = useState<Exploration>(initialExploration);
  const [rootTopic, setRootTopic] = useState(initialExploration.rootTopic || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Calculate initial page from exploration
  const initialDepthPages = initialExploration.segments && initialExploration.segments.length > 0 
    ? [{
        depth: 0,
        parentPath: [initialExploration.title || initialExploration.rootTopic || 'Untitled'],
        sections: initialExploration.segments,
      }]
    : [];
  
  const [depthPages, setDepthPages] = useState<SwipeDepthPage[]>(initialDepthPages);
  const [currentDepthIndex, setCurrentDepthIndex] = useState(0);
  const [expandingSegmentId, setExpandingSegmentId] = useState<string | null>(null);
  const [streamingPageIndex, setStreamingPageIndex] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [snapTo, setSnapTo] = useState<number | null>(null); // Track snapping separately

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isExpandingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derive breadcrumb path from current state - no memoization needed
  const breadcrumbPath = depthPages[currentDepthIndex]?.parentPath || [];

  // Scroll to specific depth
  const scrollToDepth = (depthIndex: number) => {
    if (containerRef.current) {
      const scrollAmount = depthIndex * window.innerWidth;
      containerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth',
      });
      setCurrentDepthIndex(depthIndex);

      // Scroll the target depth-page to top
      setTimeout(() => {
        const depthPage = containerRef.current?.querySelector(`[data-depth="${depthIndex}"]`) as HTMLElement;
        if (depthPage) {
          depthPage.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }, 100); // Small delay to ensure horizontal scroll starts first
    }
  };

  // Handle scroll to update current depth (debounced to only update on snap)
  const handleScroll = () => {
    if (containerRef.current) {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll updates - only calculate on scroll END
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollLeft = containerRef.current?.scrollLeft ?? 0;
        const pageWidth = window.innerWidth;
        const newDepthIndex = Math.round(scrollLeft / pageWidth);
        if (newDepthIndex !== currentDepthIndex) {
          setCurrentDepthIndex(newDepthIndex);
        }
      }, 150); // Wait 150ms after scroll ends before updating
    }
  };

  // Generate initial exploration
  const handleGenerateInitial = async (customTopic?: string) => {
    const topic = customTopic || rootTopic;
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setStreamingPageIndex(0); // Set streaming for the first page
    setStreamingContent('');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateInitial',
          topic: topic,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate exploration');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') {
              if (data === '[DONE]') {
                // Finalize on [DONE]
                const sections = parseSections(accumulatedContent, 0);
                const updatedExploration = {
                  ...exploration,
                  rootTopic: topic,
                  title: topic,
                  fullContent: accumulatedContent,
                  segments: sections,
                  depthCache: {}, // Clear cache on new topic
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                const initialPage: SwipeDepthPage = {
                  depth: 0,
                  parentPath: [topic],
                  sections,
                };
                setDepthPages([initialPage]);
                setStreamingPageIndex(null);
                setStreamingContent('');
                setIsGenerating(false);
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.content) {
                accumulatedContent += parsed.content;
                // Update streaming content in real-time
                setStreamingContent(accumulatedContent);
              }

              if (parsed.title && !exploration.title) {
                const updatedExploration = {
                  ...exploration,
                  title: parsed.title,
                  rootTopic,
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);
              }

              if (parsed.done) {
                const sections = parseSections(accumulatedContent, 0);
                const updatedExploration = {
                  ...exploration,
                  rootTopic,
                  fullContent: accumulatedContent,
                  segments: sections,
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                const initialPage: SwipeDepthPage = {
                  depth: 0,
                  parentPath: [updatedExploration.title || rootTopic],
                  sections,
                };
                setDepthPages([initialPage]);
                setIsGenerating(false);
              }
            } catch (e) {
              if (e instanceof SyntaxError && !e.message.includes('Unterminated')) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error generating exploration:', error);
      }
      setIsGenerating(false);
    }
  };

  // Handle external topic trigger
  useEffect(() => {
    if (triggerTopic) {
      // Create a placeholder page with the new topic title immediately
      const placeholderPage: SwipeDepthPage = {
        depth: 0,
        parentPath: [triggerTopic],
        sections: [],
      };

      setDepthPages([placeholderPage]);
      setCurrentDepthIndex(0);
      setStreamingPageIndex(0);
      setStreamingContent('');
      setExpandingSegmentId(null);
      setRootTopic(triggerTopic);

      // Update exploration with new topic
      const resetExploration = {
        ...exploration,
        rootTopic: triggerTopic,
        title: triggerTopic,
        fullContent: '',
        segments: [],
        depthCache: {},
      };
      setExploration(resetExploration);

      // Pass the topic directly to avoid stale state
      handleGenerateInitial(triggerTopic);
      onTopicProcessed?.();
    }
  }, [triggerTopic, onTopicProcessed]);

  // Handle section content update
  const handleSectionUpdate = (segmentId: string, newContent: string) => {
    setDepthPages(prevPages => {
      return prevPages.map(page => ({
        ...page,
        sections: page.sections.map(section =>
          section.id === segmentId
            ? { ...section, content: newContent }
            : section
        ),
      }));
    });
  };

  // Handle expand entire section (arrow button click)
  const handleExpandSection = async (parentSegment: ExploreSegment) => {
    if (isExpandingRef.current) {
      return;
    }

    // Prepare new depth page
    const newDepth = currentDepthIndex + 1;
    const parentPath = [
      ...(depthPages[currentDepthIndex]?.parentPath || []),
      parentSegment.title,
    ];

    // Check cache first
    const cacheKey = `${parentSegment.id}:${newDepth}`;
    const cachedData = exploration.depthCache?.[cacheKey];

    if (cachedData) {
      // Create page from cached data
      const cachedPage: SwipeDepthPage = {
        depth: newDepth,
        parentPath: cachedData.parentPath,
        parentSegmentId: cachedData.parentSegmentId,
        sections: cachedData.sections,
      };

      setDepthPages(prev => {
        const updated = [...prev];
        // Replace any existing page at this depth or add new one
        if (updated.length > newDepth) {
          updated.splice(newDepth);
        }
        updated.push(cachedPage);
        return updated;
      });

      // Small delay to ensure DOM update before scrolling
      setTimeout(() => {
        scrollToDepth(newDepth);
      }, 50);

      return; // Skip API call
    }

    isExpandingRef.current = true;
    setExpandingSegmentId(parentSegment.id);
    abortControllerRef.current = new AbortController();

    // Add or replace page at newDepth
    const newPage: SwipeDepthPage = {
      depth: newDepth,
      parentPath,
      parentSegmentId: parentSegment.id,
      sections: [],
    };

    setDepthPages(prev => {
      const updated = [...prev];
      // Replace any existing page at this depth or add new one
      if (updated.length > newDepth) {
        // Remove all pages at and after this depth
        updated.splice(newDepth);
      }
      updated.push(newPage);
      return updated;
    });

    // Set streaming state
    setStreamingPageIndex(newDepth);
    setStreamingContent('');

    // Small delay to ensure DOM update before scrolling
    setTimeout(() => {
      scrollToDepth(newDepth);
    }, 50);

    try {
      const requestBody = {
        action: 'expandSection',
        sectionTitle: parentSegment.title,
        sectionContent: parentSegment.content || '',
        parentContext: depthPages[currentDepthIndex]?.parentPath[0] || exploration.title || exploration.rootTopic,
        depth: newDepth,
      };

      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        console.error('[SwipeDeeper] Response not ok:', response.status);
        throw new Error('Failed to expand section');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = ''; // The full content from server (already accumulated)

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') {
              if (data === '[DONE]') {
                const sections = parseSections(fullContent, newDepth);
                setDepthPages(prev => {
                  const updated = [...prev];
                  // Find the page index for this depth (should be the last page since we just added it)
                  const pageIndex = updated.findIndex(p => p.depth === newDepth && !p.sections.length);
                  if (pageIndex !== -1) {
                    updated[pageIndex] = {
                      ...updated[pageIndex],
                      sections,
                    };
                  } else {
                    console.error('[SwipeDeeper] Could not find page to update at depth', newDepth);
                  }
                  return updated;
                });

                // Save to cache
                const cacheKey = `${parentSegment.id}:${newDepth}`;
                const updatedExploration = {
                  ...exploration,
                  depthCache: {
                    ...exploration.depthCache,
                    [cacheKey]: {
                      parentSegmentId: parentSegment.id,
                      parentPath,
                      sections,
                      generatedAt: Date.now(),
                    },
                  },
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                setExpandingSegmentId(null);
                isExpandingRef.current = false;
                setStreamingPageIndex(null);
                setStreamingContent('');
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.content) {
                // Server already accumulates, so just replace (don't use +=)
                fullContent = parsed.content;
                // Update streaming content live
                setStreamingContent(fullContent);
              }

              // Don't handle parsed.done - we only handle [DONE]
            } catch (e) {
              if (e instanceof SyntaxError && !e.message.includes('Unterminated')) {
                console.error('[SwipeDeeper] Error parsing stream data:', e, 'Data:', data.substring(0, 100));
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[SwipeDeeper] Error expanding section:', error);
      }
      setExpandingSegmentId(null);
      isExpandingRef.current = false;
      setStreamingPageIndex(null);
      setStreamingContent('');
    }
  };

  // Handle expand selection (dig deeper on selected text)
  const handleExpandSelection = async (selectedText: string, parentSegment: ExploreSegment) => {
    if (!selectedText.trim() || expandingSegmentId) return;

    // Prepare new depth page
    const newDepth = currentDepthIndex + 1;
    const parentPath = [
      ...(depthPages[currentDepthIndex]?.parentPath || []),
      selectedText,
    ];

    // Check cache first (use selected text as part of cache key for selections)
    const cacheKey = `${parentSegment.id}:${newDepth}:${selectedText.substring(0, 50)}`;
    const cachedData = exploration.depthCache?.[cacheKey];

    if (cachedData) {
      const cachedPage: SwipeDepthPage = {
        depth: newDepth,
        parentPath: cachedData.parentPath,
        parentSegmentId: cachedData.parentSegmentId,
        sections: cachedData.sections,
      };

      setDepthPages(prev => {
        const updated = [...prev];
        if (updated.length > newDepth) {
          updated.splice(newDepth);
        }
        updated.push(cachedPage);
        return updated;
      });

      setTimeout(() => {
        scrollToDepth(newDepth);
      }, 50);

      return; // Skip API call
    }

    isExpandingRef.current = true;
    setExpandingSegmentId(parentSegment.id);
    abortControllerRef.current = new AbortController();

    // Add placeholder page
    const newPage: SwipeDepthPage = {
      depth: newDepth,
      parentPath,
      parentSegmentId: parentSegment.id,
      sections: [],
    };

    setDepthPages(prev => {
      const updated = [...prev];
      // Remove pages at this depth or deeper
      if (updated.length > newDepth) {
        updated.splice(newDepth);
      }
      updated.push(newPage);
      return updated;
    });
    
    // Set streaming state
    setStreamingPageIndex(newDepth);
    setStreamingContent('');
    
    // Small delay to ensure DOM update before scrolling
    setTimeout(() => {
      scrollToDepth(newDepth);
    }, 50);

    try {
      const requestBody = {
        action: 'expandSelection',
        selectedText,
        parentContext: parentSegment.title,
        depth: newDepth,
      };

      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        console.error('[SwipeDeeper] Response not ok:', response.status);
        throw new Error('Failed to expand selection');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = ''; // The full content from server (already accumulated)

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') {
              if (data === '[DONE]') {
                // Finalize on [DONE]
                const sections = parseSections(fullContent, newDepth);
                setDepthPages(prev => {
                  const updated = [...prev];
                  const pageIndex = updated.findIndex(p => p.depth === newDepth && !p.sections.length);
                  if (pageIndex !== -1) {
                    updated[pageIndex] = {
                      ...updated[pageIndex],
                      sections,
                    };
                  } else {
                    console.error('[SwipeDeeper] Could not find page to update at depth', newDepth);
                  }
                  return updated;
                });

                // Save to cache (use selected text as part of cache key for selections)
                const cacheKey = `${parentSegment.id}:${newDepth}:${selectedText.substring(0, 50)}`;
                const updatedExploration = {
                  ...exploration,
                  depthCache: {
                    ...exploration.depthCache,
                    [cacheKey]: {
                      parentSegmentId: parentSegment.id,
                      parentPath,
                      sections,
                      generatedAt: Date.now(),
                    },
                  },
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                setExpandingSegmentId(null);
                isExpandingRef.current = false;
                setStreamingPageIndex(null);
                setStreamingContent('');
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.content) {
                // Server already accumulates, so just replace (don't use +=)
                fullContent = parsed.content;
                // Update streaming content live
                setStreamingContent(fullContent);
              }

              // Don't handle parsed.done - we only handle [DONE]
            } catch (e) {
              if (e instanceof SyntaxError && !e.message.includes('Unterminated')) {
                console.error('[SwipeDeeper] Error parsing stream data:', e, 'Data:', data.substring(0, 100));
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[SwipeDeeper] Error expanding selection:', error);
      }
      setExpandingSegmentId(null);
      isExpandingRef.current = false;
      setStreamingPageIndex(null);
      setStreamingContent('');
    }
  };

  // Handle refresh (restart exploration)
  const handleRefresh = () => {
    if (confirm('Discard current exploration and start over?')) {
      setDepthPages([]);
      setCurrentDepthIndex(0);
      setRootTopic('');
      const resetExploration = {
        ...exploration,
        rootTopic: '',
        title: '',
        fullContent: '',
        segments: [],
      };
      setExploration(resetExploration);
      onExplorationChange(resetExploration);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateInitial();
    }
  };

  return (
    <div className="h-full">
      {/* Initial topic input (shown when no exploration yet) */}
      {depthPages.length === 0 && (
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="mb-8=4">
            <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--color-black)' }}>
              Swipe Deeper
            </h1>
            <p className="text-base" style={{ color: 'var(--color-gray)' }}>
              Enter a topic to explore horizontally with editable sections
            </p>
          </div>

          <div className="flex items-end gap-3">
            <textarea
              value={rootTopic}
              onChange={(e) => setRootTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a topic to explore..."
              className="flex-1 px-4 py-3 rounded-lg border resize-none"
              style={{
                borderColor: 'var(--border-toolbar)',
                backgroundColor: 'var(--color-white)',
                color: 'var(--color-black)',
                minHeight: '120px',
              }}
              autoFocus
            />
            <button
              onClick={() => handleGenerateInitial()}
              disabled={isGenerating || !rootTopic.trim()}
              className="send-button"
              style={{
                backgroundColor: isGenerating ? 'var(--color-button-disabled)' : 'var(--color-olive-dark)',
              }}
            >
              {isGenerating ? (
                <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-black)', borderRadius: '2px' }} />
              ) : (
                <ArrowUp className="w-5 h-5" style={{ color: 'var(--color-white)' }} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Horizontal swipe container with breadcrumb bar */}
      {depthPages.length > 0 && (
        <div style={{ position: 'relative', height: '100%' }}>
          {/* Top breadcrumb bar */}
          <div className="breadcrumb-bar-container">
            <div className="breadcrumb-flex-container">
              {breadcrumbPath.map((pathItem, pathIndex) => (
                <button
                  key={`breadcrumb-${pathIndex}-${pathItem}`}
                  onClick={() => scrollToDepth(pathIndex)}
                  className="rounded-md text-center font-medium breadcrumb-button"
                  style={{
                    '--breadcrumb-index': pathIndex,
                    '--breadcrumb-total': breadcrumbPath.length,
                    color: 'var(--color-olive-dark)',
                    border: 'none',
                    fontSize: '0.95rem',
                  } as React.CSSProperties & { '--breadcrumb-index': number; '--breadcrumb-total': number }}
                >
                  {pathItem.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Navigation links (CHAT / DIG DEEPER / HOPSCOTCH) - hidden in demo mode */}
            <div className="flex justify-end gap-2" style={{ display: 'none' }}>
              <button
                onClick={() => window.location.href = '/chat/new'}
                className="px-4 py-2 text-sm font-medium text-[#dbdbd4] hover:text-[#c5c5ba] transition-colors"
                style={{ transitionDuration: '250ms' }}
              >
                CHAT
              </button>
              <button
                onClick={() => window.location.href = '/explore/new'}
                className="px-4 py-2 text-sm font-medium text-[#dbdbd4] hover:text-[#c5c5ba] transition-colors"
                style={{ transitionDuration: '250ms' }}
              >
                DIG DEEPER
              </button>
              <button
                onClick={() => window.location.href = '/hopscotch/new'}
                className="px-4 py-2 text-sm font-medium text-[#dbdbd4] hover:text-[#c5c5ba] transition-colors"
                style={{ transitionDuration: '250ms' }}
              >
                HOPSCOTCH
              </button>
            </div>
          </div>

          {/* Back button sidebar - responsive to current depth */}
          <div
            className="depth-page-sidebar"
            data-hidden={currentDepthIndex === 0 ? "true" : "false"}
            onClick={() => currentDepthIndex > 0 && scrollToDepth(currentDepthIndex - 1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && currentDepthIndex > 0) {
                scrollToDepth(currentDepthIndex - 1);
              }
            }}
          >
            <div className="depth-page-sidebar-content">
              <h2>{depthPages[currentDepthIndex - 1]?.parentPath[depthPages[currentDepthIndex - 1]?.parentPath.length - 1]?.toLowerCase()}</h2>
            </div>
          </div>

          {/* Main swipe container */}
          <div
            ref={containerRef}
            className="swipe-container"
            onScroll={handleScroll}
            style={{
              overflowX: depthPages.length > 1 ? 'auto' : 'hidden'
            }}
          >
            {depthPages.map((page, pageIndex) => (
              <div key={`page-${pageIndex}-depth-${page.depth}`} className="depth-page" data-depth={page.depth}>

                <div className="depth-page-inner" style={{ paddingTop: '4.5rem' }}>
                  {/* Sections (with streaming support) */}
                  {streamingPageIndex === pageIndex && streamingContent ? (
                    // Parse and show streaming sections with same formatting as non-streaming
                    parseSections(streamingContent, page.depth).map((section, idx) => (
                      <EditableSwipeSection
                        key={`streaming-${idx}`}
                        segment={section}
                        onUpdate={handleSectionUpdate}
                        onExpandSelection={handleExpandSelection}
                        onExpandSection={handleExpandSection}
                        isStreaming={true}
                        isExpanding={false}
                      />
                    ))
                  ) : page.sections.length === 0 ? (
                    null
                  ) : (
                    page.sections.map((section) => (
                      <EditableSwipeSection
                        key={section.id}
                        segment={section}
                        onUpdate={handleSectionUpdate}
                        onExpandSelection={handleExpandSelection}
                        onExpandSection={handleExpandSection}
                        isStreaming={false}
                        isExpanding={expandingSegmentId === section.id}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
