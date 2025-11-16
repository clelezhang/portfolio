'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ExploreSegment } from '@/app/lib/types';
import { Editor } from '@tiptap/react';
import TiptapEditor from './TiptapEditor';
import SwipeFloatingToolbar from './SwipeFloatingToolbar';
import { ArrowRight, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './TiptapEditor.css';
import './SwipeDeeper.css';

interface EditableSwipeSectionProps {
  segment: ExploreSegment;
  onUpdate: (segmentId: string, newContent: string) => void;
  onExpandSelection?: (selectedText: string, parentSegment: ExploreSegment) => void;
  onExpandSection?: (segment: ExploreSegment) => void;
  isStreaming?: boolean;
  isExpanding?: boolean;
}

export default function EditableSwipeSection({
  segment,
  onUpdate,
  onExpandSelection,
  onExpandSection,
  isStreaming = false,
  isExpanding = false,
}: EditableSwipeSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(segment.content || '');
  const tiptapEditorRef = useRef<Editor | null>(null);

  // Text selection state for Tiptap
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  // Touch swipe detection
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  // Handle Tiptap selection updates
  const handleTiptapSelection = useCallback((params: { from: number; to: number; x: number; y: number; text: string }) => {
    if (params.text.length > 0 && params.from !== params.to) {
      setIsTextSelected(true);
      setSelectionPosition({ x: params.x, y: params.y });
      setSelectedText(params.text);
    } else {
      setIsTextSelected(false);
      setSelectionPosition({ x: 0, y: 0 });
      setSelectedText('');
    }
  }, []);

  const clearSelection = useCallback(() => {
    setIsTextSelected(false);
    setSelectedText('');
  }, []);

  // Handle expand selection (question mark button)
  const handleExpandSelection = useCallback(() => {
    if (selectedText && onExpandSelection) {
      onExpandSelection(selectedText, segment);
      clearSelection();
      setIsEditing(false);
    }
  }, [selectedText, onExpandSelection, segment, clearSelection]);

  // Handle highlight (bookmark button)
  const handleHighlight = useCallback(() => {
    if (tiptapEditorRef.current) {
      const editor = tiptapEditorRef.current;
      if (!editor || !editor.view || editor.isDestroyed) return;

      try {
        editor.chain().toggleHighlight().run();
      } catch (error) {
        console.error('Error applying highlight:', error);
      }
    }
  }, []);

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    onUpdate(segment.id, newContent);
  };

  const handleBlur = () => {
    setIsTextSelected(false);
    setSelectedText('');
    setIsEditing(false);
  };

  // Close toolbar when scrolling (swiping to new page)
  useEffect(() => {
    const handleScroll = () => {
      setIsTextSelected(false);
      setSelectedText('');
    };

    // Listen for scroll on the swipe container
    const container = document.querySelector('.swipe-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []); // Empty deps - only set up once

  const handleClick = (e: React.MouseEvent) => {
    // If already editing, don't do anything - let normal text selection work
    if (isEditing) {
      return;
    }

    e.stopPropagation();

    const clickX = e.clientX;
    const clickY = e.clientY;

    setLocalContent(segment.content || '');
    setIsEditing(true);

    // Set cursor position after editor mounts
    setTimeout(() => {
      if (tiptapEditorRef.current) {
        const editor = tiptapEditorRef.current;

        try {
          const pos = editor.view.posAtCoords({ left: clickX, top: clickY });
          if (pos) {
            editor.commands.setTextSelection(pos.pos);
          }
        } catch {
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
        }
      }
    }, 50);
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with editing mode
    if (isEditing) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  };

  // Handle touch move - prevent horizontal scroll when swiping on section
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEditing) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // If this is a clear horizontal swipe left, prevent the page scroll
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    const isSwipeLeft = deltaX < -20;

    if (isHorizontalSwipe && isSwipeLeft) {
      e.preventDefault();
    }
  };

  // Handle touch end - detect swipe gestures
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Don't interfere with editing mode
    if (isEditing) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;

    // Detect horizontal swipe left:
    // - More sensitive threshold (> 50px instead of 80px)
    // - Clearly more horizontal than vertical (2x threshold)
    // - Quick gesture (< 500ms for more flexibility)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2;
    const isSwipeLeft = deltaX < -50;  // More sensitive: 50px instead of 80px
    const isQuickGesture = deltaTime < 1000;  // More flexible: 500ms instead of 400ms

    // Swipe left on section = expand/go deeper
    if (isHorizontalSwipe && isSwipeLeft && isQuickGesture && !isExpanding && !isStreaming && onExpandSection) {
      e.preventDefault();
      e.stopPropagation();

      onExpandSection(segment);
    }
  };

  const content = isEditing ? localContent : (segment.content || '');

  return (
    <>
      <div
        className="swipe-section-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`swipe-section ${isStreaming ? 'streaming' : ''}`}>
          {/* Section Title */}
          <div className="swipe-section-title-container">
            <h3 className="swipe-section-title">
              {segment.title}
            </h3>
          </div>

          {/* Editable Content */}
          <div
            onClick={handleClick}
            style={{ cursor: isEditing ? 'text' : 'pointer' }}
          >
            {isEditing ? (
              <TiptapEditor
                content={content}
                onUpdate={handleContentChange}
                onBlur={handleBlur}
                autoFocus={true}
                editorRef={tiptapEditorRef}
                onSelectionUpdate={handleTiptapSelection}
                className="message-content"
              />
            ) : (
              <div className="message-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Right arrow to expand section - positioned outside to the RIGHT */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isExpanding && !isStreaming && onExpandSection) {
              onExpandSection(segment);
            }
          }}
          disabled={isExpanding || isStreaming}
          className="section-expand-arrow-external"
          title="Expand this section"
        >
          {isExpanding || isStreaming ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ArrowRight strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Floating Toolbar - Rendered OUTSIDE the section wrapper */}
      {isTextSelected && isEditing && (
        <SwipeFloatingToolbar
          isVisible={isTextSelected}
          position={selectionPosition}
          onExpandSelection={handleExpandSelection}
          onHighlight={handleHighlight}
          isExpanding={isExpanding}
        />
      )}
    </>
  );
}
