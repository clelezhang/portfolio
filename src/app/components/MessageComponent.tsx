'use client';

import { useState, useRef, useCallback } from 'react';
import { Message } from '@/app/lib/types';
import { RotateCcw} from 'lucide-react';
import FloatingToolbar from './FloatingToolbar';
import TiptapEditor from './TiptapEditor';
import ContentWithComments from './ContentWithComments';
import { CommentThread } from '@/app/lib/types';
import './TiptapEditor.css';
import { parseCitationsToHTML } from './CitationChip';
import { Editor } from '@tiptap/react';

interface AnimationConfig {
  duration: number;
  springStrength: number;
  scale: number;
  enabled: boolean;
}

interface MessageComponentProps {
  message: Message;
  onUpdate: (messageId: string, newContent: string) => void;
  onRun?: (messageId: string) => void;
  onComment?: (messageId: string, threadId: string) => void; // Callback when user creates a comment (threadId is generated)
  onAddCommentToThread?: (messageId: string, threadId: string, content: string, searchMode: 'on' | 'auto' | 'off') => void; // Add comment to existing thread
  onAIRespondToThread?: (messageId: string, threadId: string, searchMode?: 'on' | 'auto' | 'off') => void; // AI responds to a comment thread
  onCancelDraft?: (messageId: string, threadId: string) => void; // Cancel draft thread
  draftThreads?: CommentThread[]; // Draft threads for this message (not yet saved)
  isGenerating?: boolean;
  isLatestMessage?: boolean; // Flag to indicate if this is the most recent message
  animationConfig?: AnimationConfig;
}

export default function MessageComponent({ 
  message, 
  onUpdate, 
  onRun, 
  onComment,
  onAddCommentToThread,
  onAIRespondToThread,
  onCancelDraft,
  draftThreads = [],
  isGenerating = false,
  animationConfig
}: MessageComponentProps) {
  // Merge draft threads with saved threads for display
  const displayThreads = [
    ...(message.commentThreads || []),
    ...draftThreads
  ];
  const [isEditing, setIsEditing] = useState(message.startInEditMode || false);
  const [localContent, setLocalContent] = useState(message.content ?? '');
  const tiptapEditorRef = useRef<Editor | null>(null);
  const lastRunContentRef = useRef(message.content ?? '');
  
  // Text selection state for Tiptap
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  // Handle Tiptap selection updates
  const handleTiptapSelection = useCallback((params: { from: number; to: number; x: number; y: number; text: string }) => {
    if (params.text.length > 0 && params.from !== params.to) {
      setIsTextSelected(true);
      setSelectionPosition({ x: params.x, y: params.y });
      setSelectedText(params.text);
    } else {
      // Clear selection when nothing is selected
      setIsTextSelected(false);
      setSelectionPosition({ x: 0, y: 0 });
      setSelectedText('');
    }
  }, []);
  
  const clearSelection = useCallback(() => {
    setIsTextSelected(false);
    setSelectedText('');
  }, []);

  // Floating toolbar handlers
  const handleFormat = useCallback((format: string) => {
    // Apply formatting through Tiptap editor
    if (tiptapEditorRef.current) {
      const editor = tiptapEditorRef.current;
      
      // Check if editor is ready and has a view
      if (!editor || !editor.view || editor.isDestroyed) {
        console.warn('Editor not ready yet');
        return;
      }
      
      try {
        switch (format) {
          case 'bookmark':
            editor.chain().toggleHighlight().run();
            break;
          case 'bold':
            editor.chain().toggleBold().run();
            break;
          case 'italic':
            editor.chain().toggleItalic().run();
            break;
          case 'strikethrough':
            editor.chain().toggleStrike().run();
            break;
          case 'code':
            editor.chain().toggleCode().run();
            break;
        }
      } catch (error) {
        console.error('Error applying format:', error);
      }
    }

    // Keep selection for continued editing
    // clearSelection();
  }, [message.id, onComment]);

  const handleAIAssist = useCallback(() => {
    console.log(`AI assist requested for text: "${selectedText}"`);
    // Here you could integrate with your AI API
    clearSelection();
  }, [selectedText, clearSelection]);

  const handleComment = useCallback(() => {
    if (selectedText && onComment && tiptapEditorRef.current) {
      const editor = tiptapEditorRef.current;
      
      // Generate a unique thread ID
      const threadId = crypto.randomUUID();
      
      // Insert mark tag with data-thread-id attribute
      editor.chain().focus().setMark('highlight', { 'data-thread-id': threadId }).run();
      
      // Get the updated content with the mark tag
      const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>;
      const updatedContent = storage.markdown?.getMarkdown?.() || '';
      
      // Update message content
      onUpdate(message.id, updatedContent);
      
      // Notify parent to create draft thread
      onComment(message.id, threadId);
      
      clearSelection();
      setIsEditing(false); // Exit editing mode after creating comment
    }
  }, [selectedText, onComment, onUpdate, message.id, clearSelection]);

  // Derive content: use local content when editing, message content otherwise
  const content = isEditing ? localContent : (message.content ?? '');
  
  // Derive isEdited: compare current content with last run content
  const isEditedDerived = content !== lastRunContentRef.current;

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    // Autosave changes immediately
    onUpdate(message.id, newContent);
  };


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && message.role === 'user') {
      e.preventDefault();
      // Update lastRunContentRef to current content when running
      lastRunContentRef.current = content;
      onRun?.(message.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't prevent default - let the click naturally propagate
    e.stopPropagation();
    
    // Store click coordinates for later use
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    setLocalContent(message.content ?? ''); // Sync local content with current message
    setIsEditing(true);
    
    // Set cursor position after editor mounts with longer delay
    setTimeout(() => {
      if (tiptapEditorRef.current) {
        const editor = tiptapEditorRef.current;
        
        // Use the editor's view to find the position at coordinates
        try {
          const pos = editor.view.posAtCoords({ left: clickX, top: clickY });
          if (pos) {
            editor.commands.setTextSelection(pos.pos);
          }
        } catch (error) {
          // Fallback: place cursor at the end
          console.warn('Could not position cursor at click location:', error);
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
        }
      }
    }, 100);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  if (message.role === 'user') {
    return (
      <div>
        <div 
          className={`group relative ${isEditing ? 'block' : 'inline-block'} rounded-2xl break-words transition-all py-4 pl-5 pr-5`}
          style={{ backgroundColor: 'var(--color-off-white)', color: 'var(--color-black)' }}
        >
          {/* User icon - dark green circle inside bubble */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-olive-dark)' }} />
            
            <div className="flex-1 min-w-0">
              <div style={{
                fontSize: 'var(--font-size-message)',
                lineHeight: 'var(--line-height-message)',
                color: 'var(--color-black)',
                letterSpacing: 'var(--letter-spacing-tight)'
              }}>
              {isEditing ? (
              <TiptapEditor
                content={content}
                onUpdate={handleContentChange}
                  onBlur={handleBlur}
                onSelectionUpdate={handleTiptapSelection}
                  autoFocus
                editorRef={tiptapEditorRef}
                className="w-full bg-transparent border-none outline-none resize-none whitespace-pre-wrap break-words p-0 m-0"
                style={{ 
                  color: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit'
                }}
                />
            ) : (
              <ContentWithComments
                content={content}
                commentThreads={displayThreads}
                onAddComment={(threadId, content, searchMode) => onAddCommentToThread?.(message.id, threadId, content, searchMode)}
                onAIRespond={(threadId) => onAIRespondToThread?.(message.id, threadId)}
                onCancelDraft={(threadId) => onCancelDraft?.(message.id, threadId)}
                onClick={handleClick}
                className="cursor-text whitespace-pre-wrap break-words p-0 m-0"
                style={{ 
                  color: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit'
                }}
                isUserMessage={true}
              />
            )}
              </div>

          {onRun && !isGenerating && isEditedDerived && (
                <div className="absolute -bottom-3 right-0 pointer-events-none">
              <div className="pointer-events-auto">
                <button
                  onClick={() => {
                    lastRunContentRef.current = content;
                    onRun(message.id);
                  }}
                      className="inline-flex items-center justify-center bg-text-100 text-bg-000 hover:bg-text-000 rounded px-3 py-1 text-xs font-medium transition-colors"
                  type="button"
                  title="Run updated message"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Run
                </button>
              </div>
            </div>
          )}
        </div>
          </div>
        </div>
        
        {/* Floating Toolbar for User Messages - Only show when editing */}
        <FloatingToolbar
          isVisible={isTextSelected && isEditing}
          position={selectionPosition}
          onFormat={handleFormat}
          onAIAssist={handleAIAssist}
          onComment={handleComment}
          animationConfig={animationConfig}
        />
      </div>
    );
  }

  return (
    <div className="mb-12 mt-6 group">
      <div className="flex-1 min-w-0">
        <div
          className="relative"
          style={{
            color: 'var(--color-black)',
            fontSize: 'var(--font-size-message)',
            lineHeight: 'var(--line-height-message)',
            letterSpacing: 'var(--letter-spacing-tight)'
          }}
        >
          {isEditing ? (
            <TiptapEditor
              content={content}
              onUpdate={handleContentChange}
              onBlur={handleBlur}
              onSelectionUpdate={handleTiptapSelection}
              autoFocus
              editorRef={tiptapEditorRef}
              className="w-full bg-transparent border-none outline-none resize-none placeholder-text-400"
              style={{ 
                color: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit'
              }}
            />
          ) : (
            <>
            <ContentWithComments
              content={parseCitationsToHTML(content, message.sources)}
              commentThreads={displayThreads}
              onAddComment={(threadId, content, searchMode) => onAddCommentToThread?.(message.id, threadId, content, searchMode)}
              onAIRespond={(threadId) => onAIRespondToThread?.(message.id, threadId)}
              onCancelDraft={(threadId) => onCancelDraft?.(message.id, threadId)}
              onClick={handleClick}
              className="cursor-text"
              style={{
                color: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit'
              }}
              isUserMessage={false}
            />
            {isGenerating && !content && (
              <span className="loader-pulse">𒊹</span>
            )}
          </>
          )}
        </div>
      </div>
      
      {/* Floating Toolbar - Only show when editing */}
      <FloatingToolbar
        isVisible={isTextSelected && isEditing}
        position={selectionPosition}
        onFormat={handleFormat}
        onAIAssist={handleAIAssist}
        onComment={handleComment}
        animationConfig={animationConfig}
      />
    </div>
  );
}