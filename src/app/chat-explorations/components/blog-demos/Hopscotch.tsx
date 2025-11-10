'use client';

import React, { useState, useRef } from 'react';
import { Exploration, ExploreSegment } from '@/app/lib/types';
import { Eye, EyeOff, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Hopscotch.css';

interface HopscotchProps {
  initialExploration: Exploration;
  onExplorationChange: (exploration: Exploration) => void;
  explorationId: string;
}

interface PositionedSegment extends ExploreSegment {
  gridColumn: number;
  gridRow: number;
  colorIndex: number; // Index into the color palette
}

interface PathNode {
  segment: PositionedSegment;
  gridColumn: number;
  gridRow: number;
  options: PositionedSegment[];
  unselectedOptions?: PositionedSegment[];
}

// Parse markdown sections from content (same as SwipeDeeper)
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

export default function Hopscotch({
  initialExploration,
  onExplorationChange,
}: HopscotchProps) {
  const [exploration, setExploration] = useState<Exploration>(initialExploration);
  const [rootTopic, setRootTopic] = useState(initialExploration.rootTopic || '');
  const [journeyPath, setJourneyPath] = useState<PathNode[]>([]);
  const [currentSegment, setCurrentSegment] = useState<ExploreSegment | null>(null);
  const [showUnselected, setShowUnselected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate random chalk color palette once
  const [colorPalette] = useState(() => {
    const chalkColors = [
      '#f9b4cfff', // coral
      '#a2d3efff', // sky blue
      '#9fecbeff', // mint
      '#c9ec9bff', // peach
      '#d1aaf5ff', // lavender
      '#f6efa9ff', // pink
    ];
    return chalkColors;
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isExpandingRef = useRef<boolean>(false);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);

  // Generate initial exploration
  const handleGenerateInitial = async () => {
    if (!rootTopic.trim() || isGenerating) return;

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateInitial',
          topic: rootTopic,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate exploration' }));
        throw new Error(errorData.error || 'Failed to generate exploration');
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
                const sections = parseSections(accumulatedContent, 0);
                const updatedExploration = {
                  ...exploration,
                  rootTopic,
                  fullContent: accumulatedContent,
                  segments: sections,
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                // Initialize journey with first segment
                if (sections.length > 0) {
                  const firstSegment = sections[0];
                  const startColumn = 0;
                  const startRow = 4;

                  // Position first segment
                  const positionedFirst: PositionedSegment = {
                    ...firstSegment,
                    gridColumn: startColumn,
                    gridRow: startRow,
                    colorIndex: 0,
                  };

                  // Position initial options (centered around first segment)
                  const rawOptions = sections.slice(1, 4);
                  const centerOffset = Math.floor(rawOptions.length / 2);
                  const positionedOptions: PositionedSegment[] = rawOptions.map((opt, idx) => ({
                    ...opt,
                    gridColumn: startColumn + 1,
                    gridRow: startRow + (idx - centerOffset),
                    colorIndex: (idx + 1) % colorPalette.length,
                  }));

                  const initialNode: PathNode = {
                    segment: positionedFirst,
                    gridColumn: startColumn,
                    gridRow: startRow,
                    options: positionedOptions,
                    unselectedOptions: [],
                  };
                  setJourneyPath([initialNode]);
                  setCurrentSegment(firstSegment);
                }

                setIsGenerating(false);
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.content) {
                accumulatedContent += parsed.content;
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

                // Initialize journey
                if (sections.length > 0) {
                  const firstSegment = sections[0];
                  const startColumn = 0;
                  const startRow = 4;

                  const positionedFirst: PositionedSegment = {
                    ...firstSegment,
                    gridColumn: startColumn,
                    gridRow: startRow,
                    colorIndex: 0,
                  };

                  const rawOptions = sections.slice(1, 4);
                  const centerOffset = Math.floor(rawOptions.length / 2);
                  const positionedOptions: PositionedSegment[] = rawOptions.map((opt, idx) => ({
                    ...opt,
                    gridColumn: startColumn + 1,
                    gridRow: startRow + (idx - centerOffset),
                    colorIndex: (idx + 1) % colorPalette.length,
                  }));

                  const initialNode: PathNode = {
                    segment: positionedFirst,
                    gridColumn: startColumn,
                    gridRow: startRow,
                    options: positionedOptions,
                    unselectedOptions: [],
                  };
                  setJourneyPath([initialNode]);
                  setCurrentSegment(firstSegment);
                }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateInitial();
    }
  };

  // Handle clicking on a potential next option
  const handleOptionClick = async (option: PositionedSegment, parentNode: PathNode) => {
    if (isExpandingRef.current) return;

    const newDepth = journeyPath.length;

    // Use the option's FIXED grid position (already set when it was created)
    const newColumn = option.gridColumn;
    const newRow = option.gridRow;

    // Mark unselected options from previous node
    const unselectedOptions = parentNode.options.filter(opt => opt.id !== option.id);
    const updatedPath = journeyPath.map(node =>
      node === parentNode
        ? { ...node, unselectedOptions }
        : node
    );

    // Add the clicked option to the path immediately (without next options yet)
    const loadingNode: PathNode = {
      segment: option,
      gridColumn: newColumn,
      gridRow: newRow,
      options: [], // Empty until generation completes
      unselectedOptions: [],
    };
    const pathWithNewNode = [...updatedPath, loadingNode];
    setJourneyPath(pathWithNewNode);
    setCurrentSegment(option);

    // Check cache first
    const cacheKey = `${option.id}:${newDepth}`;
    const cachedData = exploration.depthCache?.[cacheKey];

    if (cachedData && cachedData.sections.length > 0) {
      // Position the new options centered around the selected option
      const rawOptions = cachedData.sections.slice(0, 3);
      const centerOffset = Math.floor(rawOptions.length / 2);
      const positionedOptions: PositionedSegment[] = rawOptions.map((opt, idx) => ({
        ...opt,
        gridColumn: newColumn + 1,
        gridRow: newRow + (idx - centerOffset),
        colorIndex: (newDepth + idx) % colorPalette.length,
      }));

      // Update the node with the cached options
      const updatedNode: PathNode = {
        ...loadingNode,
        options: positionedOptions,
      };
      const pathWithOptions = [...updatedPath, updatedNode];
      setJourneyPath(pathWithOptions);
      return;
    }

    // Generate new options via API
    isExpandingRef.current = true;
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/blog-demos/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expandSection',
          sectionTitle: option.title,
          sectionContent: option.content || '',
          parentContext: exploration.title || exploration.rootTopic,
          depth: newDepth,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to expand section');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

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

                // Create new node with positioned options
                const rawOptions = sections.slice(0, 3);
                const centerOffset = Math.floor(rawOptions.length / 2);
                const positionedOptions: PositionedSegment[] = rawOptions.map((opt, idx) => ({
                  ...opt,
                  gridColumn: newColumn + 1,
                  gridRow: newRow + (idx - centerOffset),
                  colorIndex: (newDepth + idx) % colorPalette.length,
                }));

                // Update the last node in the path with the generated options
                const updatedNode: PathNode = {
                  segment: option,
                  gridColumn: newColumn,
                  gridRow: newRow,
                  options: positionedOptions,
                  unselectedOptions: [],
                };

                // Replace the last node (which was the loading node) with the complete node
                const updatedPathWithOptions = [...pathWithNewNode];
                updatedPathWithOptions[updatedPathWithOptions.length - 1] = updatedNode;
                setJourneyPath(updatedPathWithOptions);

                // Update cache
                const cacheKey = `${option.id}:${newDepth}`;
                const parentPath = journeyPath.map(n => n.segment.title);
                const updatedExploration = {
                  ...exploration,
                  depthCache: {
                    ...exploration.depthCache,
                    [cacheKey]: {
                      parentSegmentId: option.id,
                      parentPath: [...parentPath, option.title],
                      sections,
                      generatedAt: Date.now(),
                    },
                  },
                };
                setExploration(updatedExploration);
                onExplorationChange(updatedExploration);

                setIsGenerating(false);
                isExpandingRef.current = false;
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent = parsed.content;
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
        console.error('Error expanding section:', error);
      }
      setIsGenerating(false);
      isExpandingRef.current = false;
    }
  };

  // Initialize journey when exploration is ready (only if not already initialized)
  if (journeyPath.length === 0 && exploration.segments && exploration.segments.length > 0 && !isGenerating) {
    const firstSegment = exploration.segments[0];
    const startColumn = 0;
    const startRow = 4;

    const positionedFirst: PositionedSegment = {
      ...firstSegment,
      gridColumn: startColumn,
      gridRow: startRow,
      colorIndex: 0,
    };

    const rawOptions = exploration.segments.slice(1, 4);
    const centerOffset = Math.floor(rawOptions.length / 2);
    const positionedOptions: PositionedSegment[] = rawOptions.map((opt, idx) => ({
      ...opt,
      gridColumn: startColumn + 1,
      gridRow: startRow + (idx - centerOffset),
      colorIndex: (idx + 1) % colorPalette.length,
    }));

    const initialNode: PathNode = {
      segment: positionedFirst,
      gridColumn: startColumn,
      gridRow: startRow,
      options: positionedOptions,
      unselectedOptions: [],
    };
    setJourneyPath([initialNode]);
    setCurrentSegment(firstSegment);
  }

  return (
    <div className="min-h-screen">
      {/* Initial topic input (shown when no exploration yet) */}
      {journeyPath.length === 0 && (
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--color-black)' }}>
              Hopscotch
            </h1>
            <p className="text-base" style={{ color: 'var(--color-gray)' }}>
              Enter a topic to explore through an interactive journey
            </p>
          </div>

          <div className="flex items-end gap-3">
            <textarea
              value={rootTopic}
              onChange={(e) => setRootTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to learn about?"
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
              onClick={handleGenerateInitial}
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

      {/* Hopscotch Interface */}
      {journeyPath.length > 0 && (
        <div className="hopscotch-container">
      {/* Top Half: Grid with Journey Path */}
      <div className="hopscotch-grid-section">
        <div className="hopscotch-grid">
          {/* Grid overlay (9 rows × 6 columns) */}
          <div className="grid-overlay">
            {Array.from({ length: 9 }).map((_, row) => (
              Array.from({ length: 6 }).map((_, col) => (
                <div
                  key={`grid-${row}-${col}`}
                  className="grid-cell"
                  style={{
                    gridRow: row + 1,
                    gridColumn: col + 1,
                  }}
                />
              ))
            ))}
          </div>

          {/* Journey boxes - flatten so they're direct grid children */}
          {journeyPath.map((node, nodeIndex) => (
            <React.Fragment key={`journey-group-${nodeIndex}`}>
              {/* Current/Previous box - make clickable */}
              <button
                className={`hopscotch-box ${nodeIndex === journeyPath.length - 1 ? 'current' : 'previous'}`}
                style={{
                  gridRow: node.gridRow + 1,
                  gridColumn: node.gridColumn + 1,
                  backgroundColor: colorPalette[node.segment.colorIndex],
                  borderColor: colorPalette[node.segment.colorIndex],
                  color: 'black',
                }}
                onClick={() => setCurrentSegment(node.segment)}
                disabled={false}
              >
                {node.segment.title}
              </button>

              {/* Next options (only for current node) - white dashed outline on black */}
              {nodeIndex === journeyPath.length - 1 && node.options.length > 0 && node.options.map((option) => {
                const isHovered = hoveredBoxId === `option-${option.id}`;
                return (
                  <button
                    key={`option-${option.id}`}
                    className="hopscotch-box potential"
                    style={{
                      gridRow: option.gridRow + 1,
                      gridColumn: option.gridColumn + 1,
                      backgroundColor: isHovered ? '#2a2a2a' : 'black',
                      borderColor: 'white',
                      color: 'white',
                      borderWidth: '3px',
                      borderStyle: 'dashed',
                    }}
                    onClick={() => handleOptionClick(option, node)}
                    onMouseEnter={() => setHoveredBoxId(`option-${option.id}`)}
                    onMouseLeave={() => setHoveredBoxId(null)}
                    disabled={isGenerating}
                  >
                    {option.title}
                  </button>
                );
              })}

              {/* Unselected options (when toggle is on) - colored outline on black */}
              {showUnselected && node.unselectedOptions && node.unselectedOptions.map((unselected) => {
                const color = colorPalette[unselected.colorIndex];
                const isHovered = hoveredBoxId === `unselected-${unselected.id}`;
                // Convert hex to rgb for transparency overlay
                const hexToRgb = (hex: string) => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
                  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
                };
                return (
                  <button
                    key={`unselected-${unselected.id}`}
                    className="hopscotch-box unselected"
                    style={{
                      gridRow: unselected.gridRow + 1,
                      gridColumn: unselected.gridColumn + 1,
                      backgroundColor: isHovered ? `rgba(${hexToRgb(color)}, 0.25)` : 'black',
                      borderColor: color,
                      color: color,
                      borderWidth: '3px',
                      borderStyle: 'solid',
                    }}
                    onClick={() => handleOptionClick(unselected, node)}
                    onMouseEnter={() => setHoveredBoxId(`unselected-${unselected.id}`)}
                    onMouseLeave={() => setHoveredBoxId(null)}
                    disabled={isGenerating}
                  >
                    {unselected.title}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Toggle for unselected paths */}
        <button
          className="unselected-toggle"
          onClick={() => setShowUnselected(!showUnselected)}
        >
          {showUnselected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showUnselected ? 'Hide' : 'Show'} unselected paths</span>
        </button>
      </div>

      {/* Bottom Half: Content Display */}
      <div className="hopscotch-content-section">
        {currentSegment && (
          <div className="content-display">
            <h2 className="content-title">{currentSegment.title}</h2>
            <div className="content-body">
              <div className="static-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentSegment.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {!currentSegment && exploration.segments.length === 0 && (
          <div className="empty-state">
            <p>No exploration data available</p>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
