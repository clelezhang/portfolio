'use client';

import React, { useState, useCallback } from 'react';

// Types
interface TextNode {
  id: string;
  type: 'text' | 'expandable';
  content: string;
  expanded?: boolean;
  loading?: boolean;
  expansion?: TextNode[];
}

// Preset texts
const TEXTS = {
  story: `THE SALINAS _VALLEY_ is in Northern _California_. It is a long narrow _swale_ between two ranges of _mountains_, and the Salinas _River_ winds and twists up the center until it falls at last into Monterey _Bay_.`,
  fact: `Curly _fries_, or twisted fries are _french_ fries cut into a _spiral_ shape, typically _seasoned_ with a distinct spice mix composed primarily of _paprika_, black _pepper_, onion powder, and garlic _powder_.`,
};

let nodeIdCounter = 0;
function generateId(): string {
  return `node-${nodeIdCounter++}`;
}

// Parse text with _word_ markers into nodes
function parseText(text: string): TextNode[] {
  const nodes: TextNode[] = [];
  const regex = /_([^_]+)_|([^_]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      nodes.push({
        id: generateId(),
        type: 'expandable',
        content: match[1],
        expanded: false,
      });
    } else if (match[2]) {
      nodes.push({
        id: generateId(),
        type: 'text',
        content: match[2],
      });
    }
  }

  return nodes;
}

// Parse AI response - **word** marks expandable words
function parseExpansion(text: string): TextNode[] {
  const nodes: TextNode[] = [];
  const regex = /\*\*([^*]+)\*\*|([^*]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      nodes.push({
        id: generateId(),
        type: 'expandable',
        content: match[1],
        expanded: false,
      });
    } else if (match[2]) {
      nodes.push({
        id: generateId(),
        type: 'text',
        content: match[2],
      });
    }
  }

  return nodes;
}

// Get the full text including all expansions in reading order
function getFullTextInOrder(nodes: TextNode[]): string {
  let text = '';
  for (const node of nodes) {
    text += node.content;
    if (node.expansion) {
      text += getFullTextInOrder(node.expansion);
    }
  }
  return text;
}

// Get context around a node and what follows it
function getContextAndFollowing(nodes: TextNode[], targetId: string): { context: string; following: string; fullText: string } {
  const flattenNodes = (ns: TextNode[]): TextNode[] => {
    const result: TextNode[] = [];
    for (const n of ns) {
      result.push(n);
      if (n.expansion) {
        result.push(...flattenNodes(n.expansion));
      }
    }
    return result;
  };

  const flat = flattenNodes(nodes);
  const targetIndex = flat.findIndex(n => n.id === targetId);
  const fullText = getFullTextInOrder(nodes);

  if (targetIndex === -1) {
    return { context: fullText, following: '', fullText };
  }

  let following = '';
  if (targetIndex + 1 < flat.length) {
    following = flat[targetIndex + 1].content.slice(0, 30);
  }

  const target = flat[targetIndex];
  const idx = fullText.indexOf(target.content);
  const start = Math.max(0, idx - 200);
  const end = Math.min(fullText.length, idx + target.content.length + 150);

  return {
    context: fullText.slice(start, end),
    following,
    fullText,
  };
}

// Recursive renderer
function RenderNodes({
  nodes,
  onExpand
}: {
  nodes: TextNode[];
  onExpand: (id: string) => void;
}) {
  const handleClick = (e: React.MouseEvent, nodeId: string, node: TextNode) => {
    e.stopPropagation();
    if (!node.expanded && !node.loading) {
      onExpand(nodeId);
    }
  };

  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
          {node.type === 'expandable' ? (
            <>
              <span
                onClick={(e) => handleClick(e, node.id, node)}
                className={`expand-word${node.expanded ? ' expanded' : ''}${node.loading ? ' loading' : ''}`}
              >
                {node.content}
              </span>
              {node.loading && (
                <span className="expand-loading-dots">
                  <span className="loading-dot" style={{ animationDelay: '0s' }}>.</span>
                  <span className="loading-dot" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="loading-dot" style={{ animationDelay: '0.4s' }}>.</span>
                </span>
              )}
              {node.expanded && node.expansion && (
                <RenderNodes nodes={node.expansion} onExpand={onExpand} />
              )}
            </>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{node.content}</span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

type Style = 'story' | 'fact';

export default function ExpandableTextPage() {
  const [style, setStyle] = useState<Style>('story');
  const [useCustom, setUseCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [nodes, setNodes] = useState<TextNode[]>(() => {
    nodeIdCounter = 0;
    return parseText(TEXTS.story);
  });

  const handleStyleChange = (newStyle: Style) => {
    setStyle(newStyle);
    if (!useCustom) {
      nodeIdCounter = 0;
      setNodes(parseText(TEXTS[newStyle]));
    }
  };

  const handleCustomToggle = () => {
    if (useCustom) {
      setUseCustom(false);
      setIsEditingCustom(false);
      nodeIdCounter = 0;
      setNodes(parseText(TEXTS[style]));
    } else {
      setUseCustom(true);
      setIsEditingCustom(true);
    }
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      nodeIdCounter = 0;
      let processedText = customText;
      if (!processedText.includes('_')) {
        const words = processedText.split(' ');
        processedText = words.map((word, i) => {
          if (i > 0 && i % 6 === 0 && word.length > 3) {
            return `_${word}_`;
          }
          return word;
        }).join(' ');
      }
      setNodes(parseText(processedText));
      setIsEditingCustom(false);
    }
  };

  const updateNode = useCallback((
    nodes: TextNode[],
    targetId: string,
    updater: (node: TextNode) => TextNode
  ): TextNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return updater(node);
      }
      if (node.expansion) {
        return {
          ...node,
          expansion: updateNode(node.expansion, targetId, updater),
        };
      }
      return node;
    });
  }, []);

  const findNode = useCallback((nodes: TextNode[], targetId: string): TextNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.expansion) {
        const found = findNode(node.expansion, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleExpand = useCallback(async (nodeId: string) => {
    const targetNode = findNode(nodes, nodeId);
    if (!targetNode) return;

    setNodes(prev => updateNode(prev, nodeId, n => ({ ...n, loading: true })));

    const { context, following, fullText } = getContextAndFollowing(nodes, nodeId);

    try {
      const response = await fetch('/api/expand-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clickedWord: targetNode.content,
          surroundingContext: context,
          followingText: following,
          fullText: fullText.slice(0, 3000),
          mode: style,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.expansion) {
        throw new Error('No expansion in response');
      }

      const expansionNodes = parseExpansion(data.expansion);

      setNodes(prev => updateNode(prev, nodeId, n => ({
        ...n,
        loading: false,
        expanded: true,
        expansion: expansionNodes,
      })));

    } catch (error) {
      console.error('Error expanding:', error);
      setNodes(prev => updateNode(prev, nodeId, n => ({ ...n, loading: false })));
    }
  }, [nodes, findNode, updateNode, style]);

  const handleReset = useCallback(() => {
    nodeIdCounter = 0;
    if (useCustom && customText) {
      let processedText = customText;
      if (!processedText.includes('_')) {
        const words = processedText.split(' ');
        processedText = words.map((word, i) => {
          if (i > 0 && i % 6 === 0 && word.length > 3) {
            return `_${word}_`;
          }
          return word;
        }).join(' ');
      }
      setNodes(parseText(processedText));
    } else {
      setNodes(parseText(TEXTS[style]));
    }
  }, [useCustom, style, customText]);

  return (
    <div className="min-h-screen bg-lightgray font-sans">
      <div className="expand-page">
        <div className="expand-toggle-group">
          <button
            onClick={() => handleStyleChange('story')}
            className={`expand-toggle-btn${style === 'story' ? ' selected' : ''}`}
          >
            story
          </button>
          <button
            onClick={() => handleStyleChange('fact')}
            className={`expand-toggle-btn${style === 'fact' ? ' selected' : ''}`}
          >
            fact
          </button>
          <button
            onClick={handleCustomToggle}
            className={`expand-toggle-btn${useCustom ? ' selected' : ''}`}
          >
            custom
          </button>
          <button onClick={handleReset} className="expand-reset-btn" aria-label="Reset">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>

        {isEditingCustom && (
          <div className="expand-custom-input">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 280))}
              placeholder="Enter your text here. Use _underscores_ around words you want to be expandable, or we'll pick some for you."
              className="expand-textarea"
              maxLength={280}
            />
            <div className="expand-input-footer">
              <button onClick={handleCustomSubmit} className="expand-submit-btn">
                Start Expanding
              </button>
              <span className="expand-char-count">{customText.length}/280</span>
            </div>
          </div>
        )}

        {!isEditingCustom && (
          <article className="expand-article">
            <RenderNodes nodes={nodes} onExpand={handleExpand} />
          </article>
        )}

        <p className="expand-attribution">
          Inspired by Alan Trotter&apos;s <a href="https://alantrotter.com" target="_blank" rel="noopener noreferrer">website</a>.
        </p>
      </div>
    </div>
  );
}
