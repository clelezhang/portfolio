'use client';

import { useState, useRef, useEffect } from 'react';
import { CommentThread } from '@/app/lib/types';
import { ArrowUp, Search, Plus, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { parseCitationsToHTML } from './CitationChip';
import './EditableChatCanvas.css';

interface InlineCommentThreadProps {
  thread: CommentThread;
  onAddComment: (threadId: string, content: string, searchMode: 'on' | 'auto' | 'off') => void;
  onAIRespond: (threadId: string, searchMode?: 'on' | 'auto' | 'off') => void;
  onCancelDraft?: (threadId: string) => void; // Called when draft thread is abandoned
}

export default function InlineCommentThread({
  thread,
  onAddComment,
  onCancelDraft
}: InlineCommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [searchMode, setSearchMode] = useState<'on' | 'auto' | 'off'>('auto');
  const [showSearchSuccess, setShowSearchSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraftThread = thread.comments.length === 0;

  // Use the thread's isGenerating flag
  const isGenerating = thread.isGenerating || false;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  // Auto-focus for draft threads (empty threads)
  useEffect(() => {
    if (isDraftThread && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDraftThread]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(thread.id, newComment, searchMode);
      setNewComment('');
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering parent message's onClick
    e.stopPropagation();
  };

  const handleInputClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering edit mode on parent message
    e.stopPropagation();
  };

  const handleBlur = () => {
    // If this is a draft thread and no text was entered, cancel it
    if (isDraftThread && !newComment.trim() && onCancelDraft) {
      onCancelDraft(thread.id);
    }
  };

  const handleSearchModeChange = (mode: 'on' | 'auto' | 'off', e: React.MouseEvent) => {
    e.preventDefault();
    setSearchMode(mode);
    setShowSearchSuccess(true);
    
    // Close the menu after showing success
    setTimeout(() => {
      setShowSearchSuccess(false);
      // Programmatically uncheck the checkbox to close the menu
      const checkbox = document.getElementById(`search-menu-toggle-${thread.id}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = false;
    }, 250);
  };

  // Render input component
  const renderInput = () => (
    <form 
      onSubmit={handleSubmit} 
      className={`input-box ${isDraftThread ? 'draft' : 'reply'}`}
      style={{
        marginTop: isDraftThread ? '0' : '1rem'
      }}
      onClick={handleInputClick}
    >
      {/* Input Textarea */}
      <textarea
        ref={textareaRef}
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        onBlur={handleBlur}
        placeholder={isDraftThread ? "Add a comment..." : "Reply to clod..."}
        className="input-textarea"
        style={{ 
          color: 'var(--color-black)',
          fontSize: 'var(--font-size-message)',
          lineHeight: 'var(--line-height-message)'
        }}
        rows={1}
      />
      
      {/* Actions Row */}
      <div className="input-actions">
        {/* Search Button with Menu - using checkbox hack */}
        <div className="search-container">
          <input 
            type="checkbox" 
            id={`search-menu-toggle-${thread.id}`} 
            className="search-menu-checkbox" 
          />
          
          <label htmlFor={`search-menu-toggle-${thread.id}`} className="search-button">
            <Search className="w-4 h-4" strokeWidth={2.5} style={{ color: 'var(--color-gray)' }} />
            <span className="search-label">{searchMode}</span>
            <div className="search-icon-wrapper">
              {showSearchSuccess ? (
                <Check className="w-4 h-4" strokeWidth={2.75} style={{ color: 'var(--color-olive-dark)', transform: 'rotate(-45deg)' }} />
              ) : (
                <Plus className="w-4 h-4" strokeWidth={2.75} style={{ color: 'var(--color-gray)' }} />
              )}
            </div>
          </label>
          
          {/* Overlay - closes menu when clicked */}
          <label htmlFor={`search-menu-toggle-${thread.id}`} className="search-menu-overlay"></label>
          
          {/* Search Menu */}
          <div className="search-menu">
            <label
              className="search-menu-item"
              onClick={(e) => handleSearchModeChange('on', e)}
            >
              Search on
            </label>
            <label
              className="search-menu-item"
              onClick={(e) => handleSearchModeChange('auto', e)}
            >
              Search auto
            </label>
            <label
              className="search-menu-item"
              onClick={(e) => handleSearchModeChange('off', e)}
            >
              Search off
            </label>
          </div>
        </div>
        
        {/* Send Button */}
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="send-button"
          style={{
            backgroundColor: newComment.trim() ? 'var(--color-olive-dark)' : 'var(--color-button-disabled)'
          }}
          aria-label="Send comment"
        >
          <ArrowUp className="w-5 h-5" style={{ color: 'var(--color-white)' }} strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );

  // For draft threads (no comments yet), render input outside container
  if (isDraftThread) {
    return (
      <div className="flex" onClick={handleInputClick}>
        <div className="w-full mt-2 mb-3 ml-4">
          {renderInput()}
        </div>
      </div>
    );
  }

  // For existing threads, render comments container with input inside
  return (
    <div className="flex" onClick={handleContainerClick}>
      <div 
        className="flex flex-col justify-center items-start self-stretch w-full mt-2 mb-3 ml-4 p-1.5 rounded-2xl bg-white"
        style={{
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        {/* Comment list */}
        {thread.comments.map((comment, index) => (
          <div key={comment.id} className="pt-4 px-4 pb-2 flex gap-3">
            {/* Profile photo with connecting line */}
            <div className="relative flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full relative"
                style={{
                  backgroundColor: comment.role === 'user' ? 'var(--color-olive-dark)' : 'var(--color-olive-light)'
                }}
              />
                {/* Vertical line connecting to next comment or loading state */}
                {(index < thread.comments.length - 1 || isGenerating) && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      width: '1.5px',
                      top: '28px', // Height of avatar
                      bottom: '-20px', // Extend to next comment
                      backgroundColor: 'var(--border-toolbar)'
                    }}
                  />
                )}
              </div>
            
            {/* Comment content */}
            <div className="flex-1">
              <div
                className="prose prose-sm max-w-none"
                style={{
                  fontSize: 'var(--font-size-message)',
                  lineHeight: 'var(--line-height-message)',
                  color: comment.role === 'user' ? 'var(--color-black)' : 'var(--color-gray)'
                }}
              >
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{children}</strong>,
                    b: ({ children }) => <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-bg-300 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
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
                      // Regular markdown links
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
                    ul: ({ children }) => (
                      <ul style={{
                        paddingLeft: 'var(--list-padding-left)',
                        marginTop: 'var(--list-margin-top)',
                        marginBottom: 'var(--list-margin-bottom)',
                        listStyleType: 'disc',
                        listStylePosition: 'outside'
                      }}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{
                        paddingLeft: 'var(--list-padding-left)',
                        marginTop: 'var(--list-margin-top)',
                        marginBottom: 'var(--list-margin-bottom)',
                        listStyleType: 'decimal',
                        listStylePosition: 'outside'
                      }}>
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ margin: 'var(--list-item-margin)' }}>
                        {children}
                      </li>
                    ),
                  }}
                >
                  {parseCitationsToHTML(comment.content, comment.sources)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Show generating indicator after comments */}
        {isGenerating && (
          <div className="pt-4 px-4 pb-2 flex gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full relative loader-pulse"
                style={{
                  backgroundColor: 'var(--color-olive-light)'
                }}
              />
            </div>
          </div>
        )}

        {/* Input field - inside container for existing threads */}
        {renderInput()}
      </div>
    </div>
  );
}

