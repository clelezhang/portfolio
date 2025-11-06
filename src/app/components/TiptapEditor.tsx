'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef, RefObject } from 'react';

interface TiptapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  editorRef?: RefObject<Editor | null>;
  onSelectionUpdate?: (params: { from: number; to: number; x: number; y: number; text: string }) => void;
}

export default function TiptapEditor({
  content,
  onUpdate,
  onBlur,
  placeholder = 'Start typing...',
  className = '',
  style = {},
  autoFocus = false,
  editorRef,
  onSelectionUpdate,
}: TiptapEditorProps) {
  const isMouseDownRef = useRef(false);
  const lastValidSelectionRef = useRef<{ from: number; to: number } | null>(null);
  
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: false, // Single highlight color
        HTMLAttributes: {
          class: 'highlighted-text',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            'data-thread-id': {
              default: null,
              parseHTML: element => element.getAttribute('data-thread-id'),
              renderHTML: attributes => {
                if (!attributes['data-thread-id']) {
                  return {};
                }
                return {
                  'data-thread-id': attributes['data-thread-id'],
                };
              },
            },
          };
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content,
    autofocus: false,
    editorProps: {
      attributes: {
        class: `tiptap-editor ${className}`,
        style: Object.entries(style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; '),
      },
    },
    onUpdate: ({ editor }) => {
      // Get markdown content directly from the Markdown extension
      const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>;
      const markdown = storage.markdown?.getMarkdown?.() || '';
      onUpdate(markdown);
    },
    onBlur: () => {
      onBlur?.();
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionUpdate) return;
      
      // Only show toolbar when mouse is not down (selection is finalized)
      if (isMouseDownRef.current) {
        return;
      }
      
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');
      
      // Check if browser has a selection even if Tiptap doesn't
      const browserSelection = window.getSelection();
      const hasBrowserSelection = browserSelection && browserSelection.toString().length > 0;
      
      // If browser has selection but Tiptap doesn't, restore it
      if (hasBrowserSelection && from === to && lastValidSelectionRef.current) {
        editor.commands.setTextSelection({
          from: lastValidSelectionRef.current.from,
          to: lastValidSelectionRef.current.to,
        });
        return;
      }
      
      // Only update toolbar if there's a valid selection
      // Don't clear toolbar here - let blur/escape/click handle that
      if (from !== to && text.length > 0) {
        // Save this as last valid selection
        lastValidSelectionRef.current = { from, to };
        
        try {
          // Get coordinates at both start and end of selection
          const startCoords = editor.view.coordsAtPos(from);
          const endCoords = editor.view.coordsAtPos(to);
          
          // Calculate center X position of the selection
          const centerX = (startCoords.left + endCoords.right) / 2;
          
          onSelectionUpdate({
            from,
            to,
            x: centerX,
            y: startCoords.top,
            text,
          });
        } catch (e) {
          // If coordinate calculation fails, show toolbar with fallback position
          onSelectionUpdate({
            from,
            to,
            x: 0,
            y: 0,
            text,
          });
        }
      }
      // Don't clear toolbar on empty selection - let blur/escape/click handle that
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (!editor || !content) return;

    // Get current markdown from editor
    const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>;
    const currentMarkdown = storage.markdown?.getMarkdown?.() || '';

    // Only update if content is different
    if (currentMarkdown !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);
  
  // Handle manual focus without scrolling
  useEffect(() => {
    if (editor && autoFocus) {
      setTimeout(() => {
        if (editor.view && !editor.isDestroyed) {
          editor.view.dom.focus({ preventScroll: true });
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
        }
      }, 0);
    }
  }, [editor, autoFocus]);

  // Expose editor instance through ref
  useEffect(() => {
    if (editorRef && 'current' in editorRef) {
      (editorRef as React.MutableRefObject<Editor | null>).current = editor;
    }
  }, [editor, editorRef]);

  // Track mouse down/up to only show toolbar after selection is complete
  useEffect(() => {
    if (!editor) return;
    
    const handleMouseDown = () => {
      isMouseDownRef.current = true;
      
      // Hide toolbar immediately when starting a new click
      if (onSelectionUpdate) {
        onSelectionUpdate({
          from: 0,
          to: 0,
          x: 0,
          y: 0,
          text: '',
        });
      }
    };
    
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      
      // Small delay to let Tiptap's state settle before triggering selection update
      setTimeout(() => {
        if (onSelectionUpdate && !isMouseDownRef.current) {
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to, ' ');
          
          if (from !== to && text.length > 0) {
            try {
              const startCoords = editor.view.coordsAtPos(from);
              const endCoords = editor.view.coordsAtPos(to);
              const centerX = (startCoords.left + endCoords.right) / 2;
              
              onSelectionUpdate({
                from,
                to,
                x: centerX,
                y: startCoords.top,
                text,
              });
            } catch (e) {
              onSelectionUpdate({
                from,
                to,
                x: 0,
                y: 0,
                text,
              });
            }
          }
        }
      }, 0);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hide toolbar on Escape or arrow keys (deselection)
      if (['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setTimeout(() => {
          if (onSelectionUpdate && editor) {
            const { from, to } = editor.state.selection;
            if (from === to) {
              onSelectionUpdate({
                from: 0,
                to: 0,
                x: 0,
                y: 0,
                text: '',
              });
            }
          }
        }, 0);
      }
    };
    
    const editorElement = editor.view.dom;
    editorElement.addEventListener('mousedown', handleMouseDown);
    editorElement.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      editorElement.removeEventListener('mousedown', handleMouseDown);
      editorElement.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, onSelectionUpdate]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
