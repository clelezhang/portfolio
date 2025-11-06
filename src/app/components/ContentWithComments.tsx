'use client';

import React from 'react';
import { CommentThread } from '@/app/lib/types';
import InlineCommentThread from './InlineCommentThread';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

interface ContentWithCommentsProps {
  content: string;
  commentThreads?: CommentThread[];
  onAddComment?: (threadId: string, content: string, searchMode: 'on' | 'auto' | 'off') => void;
  onAIRespond?: (threadId: string) => void;
  onCancelDraft?: (threadId: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  isUserMessage?: boolean;
}

// Shared list components - styling comes from .message-content class
const listComponents = {
  ul: ({ children }: React.ComponentPropsWithoutRef<'ul'>) => <ul>{children}</ul>,
  ol: ({ children }: React.ComponentPropsWithoutRef<'ol'>) => <ol>{children}</ol>,
  li: ({ children }: React.ComponentPropsWithoutRef<'li'>) => <li>{children}</li>,
};

// Custom markdown components for assistant messages
// Most styling comes from .message-content class in EditableChatCanvas.css
const assistantMarkdownComponents = {
  p: ({ children }: React.ComponentPropsWithoutRef<'p'>) => <p className="mb-4 last:mb-0">{children}</p>,
  strong: ({ children }: React.ComponentPropsWithoutRef<'strong'>) => <strong>{children}</strong>,
  b: ({ children }: React.ComponentPropsWithoutRef<'b'>) => <strong>{children}</strong>,
  em: ({ children }: React.ComponentPropsWithoutRef<'em'>) => <em>{children}</em>,
  h1: ({ children }: React.ComponentPropsWithoutRef<'h1'>) => <h1>{children}</h1>,
  h2: ({ children }: React.ComponentPropsWithoutRef<'h2'>) => <h2>{children}</h2>,
  h3: ({ children }: React.ComponentPropsWithoutRef<'h3'>) => <h3>{children}</h3>,
  a: ({ href, children, className, ...props }: React.ComponentPropsWithoutRef<'a'>) => {
    // Preserve citation classes (citation-chip and citation-link)
    if (className?.includes('citation')) {
      return (
        <a 
          href={href} 
          className={className}
          target="_blank" 
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    // Regular markdown links - olive green with dotted underline
    return (
      <a 
        href={href} 
        className="citation-link"
        target="_blank" 
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  ...listComponents,
  blockquote: ({ children }: React.ComponentPropsWithoutRef<'blockquote'>) => <blockquote>{children}</blockquote>,
  code: ({ children }: React.ComponentPropsWithoutRef<'code'>) => <code>{children}</code>,
  pre: ({ children }: React.ComponentPropsWithoutRef<'pre'>) => <pre>{children}</pre>,
  table: ({ children }: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-border-300">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-border-300 bg-bg-300 px-4 py-2 text-left">
      {children}
    </th>
  ),
  td: ({ children }: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-border-300 px-4 py-2">
      {children}
    </td>
  ),
  mark: ({ children }: React.ComponentPropsWithoutRef<'mark'>) => <mark>{children}</mark>,
};

// Pre-process content to split into segments (markdown chunks + comment threads)
type Segment = 
  | { type: 'markdown'; content: string }
  | { type: 'comment'; threadId: string };

function splitContentIntoSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const seenThreadIds = new Set<string>();
  
  // Find all <mark> tags with thread IDs and their closing positions
  const markOpenRegex = /<mark[^>]*data-thread-id="([^"]+)"[^>]*>/g;
  const threadPositions: Array<{ threadId: string; index: number }> = [];
  
  let match;
  while ((match = markOpenRegex.exec(content)) !== null) {
    const threadId = match[1];
    if (!seenThreadIds.has(threadId)) {
      // Find the closing </mark> tag after this opening tag
      const afterOpen = match.index + match[0].length;
      const closeIndex = content.indexOf('</mark>', afterOpen);
      if (closeIndex !== -1) {
        threadPositions.push({ threadId, index: closeIndex + 7 }); // 7 = length of '</mark>'
        seenThreadIds.add(threadId);
      }
    }
  }
  
  // Split content at thread positions
  if (threadPositions.length === 0) {
    // No comments, just return the content
    return [{ type: 'markdown', content }];
  }
  
  let lastIndex = 0;
  threadPositions.forEach(({ threadId, index }) => {
    // Add markdown segment up to this point
    if (index > lastIndex) {
      segments.push({ type: 'markdown', content: content.substring(lastIndex, index) });
    }
    // Add comment segment
    segments.push({ type: 'comment', threadId });
    lastIndex = index;
  });
  
  // Add remaining content
  if (lastIndex < content.length) {
    segments.push({ type: 'markdown', content: content.substring(lastIndex) });
  }
  
  return segments;
}

export default function ContentWithComments({
  content,
  commentThreads = [],
  onAddComment,
  onAIRespond,
  onCancelDraft,
  onClick,
  className,
  style,
  isUserMessage = false,
}: ContentWithCommentsProps) {
  // Handle undefined or null content
  const safeContent = content ?? '';
  
  // Create a map of thread ID to thread for easy lookup
  const threadMap = React.useMemo(() => {
    const map = new Map<string, CommentThread>();
    commentThreads.forEach(thread => {
      map.set(thread.id, thread);
    });
    return map;
  }, [commentThreads]);

  // Pre-process content into segments
  const segments = React.useMemo(() => splitContentIntoSegments(safeContent), [safeContent]);

  // Create custom mark component (just renders the highlight, not the thread)
  const createMarkComponent = ({ children, ...props }: React.ComponentPropsWithoutRef<'mark'> & { 'data-thread-id'?: string; dataThreadId?: string }) => {
    const threadId = props['data-thread-id'] || props['dataThreadId'];
    const thread = threadId ? threadMap.get(threadId) : null;
    
    return (
      <mark
        className={thread ? 'cursor-pointer' : ''}
        style={{ 
          backgroundColor: 'var(--color-light-green)', 
          color: 'var(--color-olive-dark)', 
          padding: 'var(--highlight-padding)',
          borderRadius: 'var(--highlight-border-radius)',
        }}
        data-thread-id={threadId}
      >
        {children}
      </mark>
    );
  };

  const userMarkdownComponents = {
    p: ({ children }: React.ComponentPropsWithoutRef<'p'>) => <p className="mb-4 last:mb-0">{children}</p>,
    strong: ({ children }: React.ComponentPropsWithoutRef<'strong'>) => <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{children}</strong>,
    b: ({ children }: React.ComponentPropsWithoutRef<'b'>) => <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{children}</strong>,
    em: ({ children }: React.ComponentPropsWithoutRef<'em'>) => <em>{children}</em>,
    mark: createMarkComponent,
    ...listComponents,
  };

  const assistantMarkdownComponentsWithComments = {
    ...assistantMarkdownComponents,
    mark: createMarkComponent,
  };

  return (
    <div onClick={onClick} className={`message-content ${className || ''}`} style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return isUserMessage ? (
            <ReactMarkdown
              key={index}
              rehypePlugins={[rehypeRaw]}
              components={userMarkdownComponents}
            >
              {segment.content}
            </ReactMarkdown>
          ) : (
            <ReactMarkdown 
              key={index}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
              components={assistantMarkdownComponentsWithComments}
            >
              {segment.content}
            </ReactMarkdown>
          );
        } else {
          // Render comment thread
          const thread = threadMap.get(segment.threadId);
          return thread ? (
            <div key={index} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <InlineCommentThread
                thread={thread}
                onAddComment={(threadId, content, searchMode) => onAddComment?.(threadId, content, searchMode)}
                onAIRespond={(threadId) => onAIRespond?.(threadId)}
                onCancelDraft={(threadId) => onCancelDraft?.(threadId)}
              />
            </div>
          ) : null;
        }
      })}
    </div>
  );
}

