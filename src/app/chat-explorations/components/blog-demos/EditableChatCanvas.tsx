'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Message } from '@/app/lib/types';
import MessageComponent from './MessageComponent';
import ChatAnimationSettings from './ChatAnimationSettings';
import { ArrowUp, Search, Plus, Check } from 'lucide-react';
import './EditableChatCanvas.css';

function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}

interface EditableChatCanvasProps {
  initialMessages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  conversationId?: string;
  conversationIndex?: import('@/app/lib/types').ConversationIndex;
  queueMode?: boolean;
  queueItems?: import('@/app/lib/types').QueueItem[];
  onQueueItemsChange?: (items: import('@/app/lib/types').QueueItem[]) => void;
  onQueueItemClick?: ((itemId: string) => void) | undefined;
  demoId?: string; // Unique ID for this demo instance to avoid conflicts
  hideSettings?: boolean; // Hide animation settings panel (useful for embedded demos)
}

interface AnimationConfig {
  duration: number;
  springStrength: number;
  scale: number;
  enabled: boolean;
}

export default function EditableChatCanvas({ 
  initialMessages, 
  onMessagesChange,
  conversationId,
  conversationIndex,
  queueMode = false,
  queueItems: externalQueueItems = [],
  onQueueItemsChange,
  onQueueItemClick,
  demoId = 'default',
  hideSettings = false,
}: EditableChatCanvasProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [draftThreads, setDraftThreads] = useState<Map<string, import('@/app/lib/types').CommentThread>>(new Map()); // messageId -> draft thread
  const [searchMode, setSearchMode] = useState<'on' | 'auto' | 'off'>('auto');
  const [showSearchSuccess, setShowSearchSuccess] = useState(false);
  
  // Use external queue items if provided, otherwise use local state
  const queueItems = externalQueueItems;
  const setQueueItems = useMemo(() => onQueueItemsChange || (() => {}), [onQueueItemsChange]);
  const currentQueueItemId = queueItems.find(item => item.status === 'now')?.id || null;
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const messageContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const queueItemsRef = useRef<import('@/app/lib/types').QueueItem[]>(queueItems);
  const isGeneratingRef = useRef<boolean>(false);

  // Animation config for FloatingToolbar
  const animationConfig: AnimationConfig = {
    duration: 130,
    springStrength: 1.30,
    scale: 0.90,
    enabled: true,
  };

  // Keep queueItemsRef in sync with queueItems
  useEffect(() => {
    queueItemsRef.current = queueItems;
  }, [queueItems]);

  // Keep isGeneratingRef in sync with isGenerating
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Sync with initialMessages when they change (e.g., different conversation loaded)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Debounced save function
  const debouncedSave = useCallback((messagesToSave: Message[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      onMessagesChange(messagesToSave);
    }, 300); // 300ms debounce
  }, [onMessagesChange]);

  // Call onMessagesChange with debouncing for frequent updates
  useEffect(() => {
    debouncedSave(messages);
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, debouncedSave]);

  // Only scroll to bottom when new messages are added, not when editing
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    // Only scroll if we added a new message (length increased)
    if (messages.length > prevMessageCountRef.current) {
      const scrollContainer = messagesEndRef.current?.closest('.messages-container');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Auto-scroll during message generation/streaming
  useEffect(() => {
    if (isGenerating && generatingMessageId) {
      const scrollContainer = messagesEndRef.current?.closest('.messages-container');
      if (scrollContainer) {
        // Scroll to bottom as content streams in
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isGenerating, generatingMessageId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  // Listen for scroll to message events from sidebar
  useEffect(() => {
    const handleScrollToMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string }>;
      const { messageId } = customEvent.detail;
      const messageContainer = messageContainerRefs.current.get(messageId);

      if (messageContainer) {
        // Find the scrollable parent (.messages-container)
        const scrollContainer = messageContainer.closest('.messages-container');
        if (scrollContainer) {
          // Calculate the position relative to the scroll container
          const containerRect = scrollContainer.getBoundingClientRect();
          const messageRect = messageContainer.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;

          // Calculate target scroll position (align message to top of container)
          const targetScrollTop = scrollTop + (messageRect.top - containerRect.top);

          // Smooth scroll to target position
          scrollContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    };

    const eventName = `scrollToMessage-${demoId}`;
    window.addEventListener(eventName, handleScrollToMessage);

    return () => {
      window.removeEventListener(eventName, handleScrollToMessage);
    };
  }, [demoId]);

  // Track visible messages and update active section in sidebar
  useEffect(() => {
    if (!conversationIndex || !conversationId) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Find which messages are visible
        const visibleMessages = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => entry.target.id.replace('message-', ''))
          .filter(Boolean);
        
        if (visibleMessages.length === 0) return;
        
        // Find which section the first visible message belongs to
        for (const section of conversationIndex.sections) {
          const messageIds = messages.map(m => m.id);
          const startIdx = messageIds.indexOf(section.startMessageId);
          const endIdx = messageIds.indexOf(section.endMessageId);
          
          if (startIdx === -1 || endIdx === -1) continue;
          
          const sectionMessageIds = messageIds.slice(startIdx, endIdx + 1);
          
          // Check if any visible message is in this section
          const isInSection = visibleMessages.some(id => sectionMessageIds.includes(id));
          
          if (isInSection) {
            // Dispatch event to update sidebar
            const event = new CustomEvent(`activeSectionChanged-${demoId}`, {
              detail: { 
                conversationId,
                sectionId: section.id,
              }
            });
            window.dispatchEvent(event);
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px', // Trigger when message is in the top 20-40% of viewport
        threshold: 0,
      }
    );
    
    // Observe all message containers
    messageContainerRefs.current.forEach((container) => {
      observer.observe(container);
    });
    
    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIndex, conversationId, demoId]);

  const updateMessage = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));
  };

  const handleComment = (messageId: string, threadId: string) => {
    // Create a draft comment thread (markdown already has <mark data-thread-id="...">)
    const draftThread: import('@/app/lib/types').CommentThread = {
      id: threadId,
      comments: [],
    };
    
    // Store as draft thread mapped by messageId-threadId combination
    setDraftThreads(prev => {
      const newMap = new Map(prev);
      // Store with composite key so we can have multiple draft threads per message
      newMap.set(`${messageId}-${threadId}`, draftThread);
      return newMap;
    });
  };

  const handleCancelDraft = (messageId: string, threadId: string) => {
    // Remove draft thread from the map
    const compositeKey = `${messageId}-${threadId}`;
    setDraftThreads(prev => {
      const newMap = new Map(prev);
      newMap.delete(compositeKey);
      return newMap;
    });
    
    // Also remove the mark tag from the message content
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        // Remove the specific mark tag with this thread ID
        const updatedContent = msg.content.replace(
          new RegExp(`<mark data-thread-id="${threadId}">(.*?)</mark>`, 'g'),
          '$1' // Replace with just the text content
        );
        return { ...msg, content: updatedContent };
      }
      return msg;
    }));
  };

  const handleAddCommentToThread = (messageId: string, threadId: string, content: string, searchMode: 'on' | 'auto' | 'off') => {
    const newComment: import('@/app/lib/types').Comment = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const compositeKey = `${messageId}-${threadId}`;

    // Check if this is a draft thread
    const draftThread = draftThreads.get(compositeKey);
    let updatedMessages: Message[];

    if (draftThread) {
      // This is the first comment - promote draft to real thread
      const newThread: import('@/app/lib/types').CommentThread = {
        id: threadId,
        comments: [newComment],
      };

      updatedMessages = messages.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              commentThreads: [...(msg.commentThreads || []), newThread]
            }
          : msg
      );

      setMessages(updatedMessages);

      // Remove from drafts
      setDraftThreads(prev => {
        const newMap = new Map(prev);
        newMap.delete(compositeKey);
        return newMap;
      });
    } else {
      // Add to existing thread
      updatedMessages = messages.map(msg => {
        if (msg.id === messageId && msg.commentThreads) {
          return {
            ...msg,
            commentThreads: msg.commentThreads.map(thread =>
              thread.id === threadId
                ? { ...thread, comments: [...thread.comments, newComment] }
                : thread
            ),
          };
        }
        return msg;
      });

      setMessages(updatedMessages);
    }

    console.log('✅ Comment added to thread', threadId);

    // Trigger AI response immediately with updated messages
    handleAIRespondToThread(messageId, threadId, updatedMessages, searchMode);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAIRespondWrapper = (threadId: string, searchMode?: 'on' | 'auto' | 'off') => {
    // Find which message contains this thread
    const messageId = messages.find(msg =>
      msg.commentThreads?.some(t => t.id === threadId)
    )?.id;

    if (messageId) {
      handleAIRespondToThread(messageId, threadId, messages, searchMode || 'auto');
    }
  };

  const handleAIRespondToThread = async (
    messageId: string,
    threadId: string,
    messagesArray: Message[],
    searchMode: 'on' | 'auto' | 'off' = 'auto'
  ) => {
    const message = messagesArray.find(msg => msg.id === messageId);
    if (!message) {
      console.log('❌ AI Response: Message not found', messageId);
      return;
    }
    if (!message.commentThreads) {
      console.log('❌ AI Response: No comment threads on message', messageId);
      return;
    }

    const thread = message.commentThreads.find(t => t.id === threadId);
    if (!thread) {
      console.log('❌ AI Response: Thread not found', threadId, 'Available threads:', message.commentThreads.map(t => t.id));
      return;
    }

    console.log('✅ AI Response: Starting for thread', threadId, 'with', thread.comments.length, 'comments', 'searchMode:', searchMode);

    // Set isGenerating flag on the thread
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.commentThreads) {
        return {
          ...msg,
          commentThreads: msg.commentThreads.map(t =>
            t.id === threadId ? { ...t, isGenerating: true } : t
          ),
        };
      }
      return msg;
    }));

    try {
      // Extract highlighted text from markdown
      const markRegex = new RegExp(`<mark data-thread-id="${threadId}">(.*?)</mark>`, 's');
      const match = message.content.match(markRegex);
      const highlightedText = match ? match[1] : '';

      // Build context: original message + comment thread
      const context = `You are responding to a comment thread. Be concise and direct - aim for 2-5 sentences maximum. Get straight to the point.

Original message: "${message.content}"

Highlighted text: "${highlightedText}"

Comments:
${thread.comments.map(c => `${c.role}: ${c.content}`).join('\n')}

Your response (keep it brief):`;

      const response = await fetch('/api/blog-demos/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: context },
          ],
          searchMode: searchMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get AI response' }));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let sources: import('@/app/lib/types').Source[] | undefined;

      if (!reader) return;

      // Create a temporary AI comment that we'll update as we stream
      const aiCommentId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedContent += data.content;

                // Update the comment in real-time
                setMessages(prev => prev.map(msg => {
                  if (msg.id === messageId && msg.commentThreads) {
                    return {
                      ...msg,
                      commentThreads: msg.commentThreads.map(t => {
                        if (t.id === threadId) {
                          // Check if comment already exists, update it, or add it
                          const existingCommentIndex = t.comments.findIndex(c => c.id === aiCommentId);
                          const updatedComment: import('@/app/lib/types').Comment = {
                            id: aiCommentId,
                            role: 'assistant',
                            content: accumulatedContent,
                            timestamp: Date.now(),
                            sources: sources, // Include sources if available
                          };

                          if (existingCommentIndex >= 0) {
                            // Update existing comment
                            const newComments = [...t.comments];
                            newComments[existingCommentIndex] = updatedComment;
                            return { ...t, comments: newComments, isGenerating: false };
                          } else {
                            // Add new comment and clear isGenerating
                            return { ...t, comments: [...t.comments, updatedComment], isGenerating: false };
                          }
                        }
                        return t;
                      }),
                    };
                  }
                  return msg;
                }));
              } else if (data.sources) {
                // Capture sources when they arrive
                sources = data.sources;

                // Update the comment with sources
                setMessages(prev => prev.map(msg => {
                  if (msg.id === messageId && msg.commentThreads) {
                    return {
                      ...msg,
                      commentThreads: msg.commentThreads.map(t => {
                        if (t.id === threadId) {
                          const existingCommentIndex = t.comments.findIndex(c => c.id === aiCommentId);
                          if (existingCommentIndex >= 0) {
                            const newComments = [...t.comments];
                            newComments[existingCommentIndex] = {
                              ...newComments[existingCommentIndex],
                              sources: sources,
                            };
                            return { ...t, comments: newComments };
                          }
                        }
                        return t;
                      }),
                    };
                  }
                  return msg;
                }));
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Failed to parse streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);

      // Clear isGenerating flag on error
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.commentThreads) {
          return {
            ...msg,
            commentThreads: msg.commentThreads.map(t =>
              t.id === threadId ? { ...t, isGenerating: false } : t
            ),
          };
        }
        return msg;
      }));
    }
  };

  const runMessageWithMessagesAndTopic = useCallback(async (messageId: string, messagesArray: Message[], topic?: string) => {
    if (isGenerating) return;

    setIsGenerating(true);
    const messageIndex = messagesArray.findIndex(msg => msg.id === messageId);
    const conversationHistory = messagesArray.slice(0, messageIndex + 1);

    const assistantMessage = createMessage('assistant', '');
    const updatedMessages = [...messagesArray.slice(0, messageIndex + 1), assistantMessage];
    setMessages(updatedMessages);
    setGeneratingMessageId(assistantMessage.id);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Use provided topic, or get from current queue item
      let queueTopic: string | undefined = topic;
      if (!queueTopic && queueMode && currentQueueItemId) {
        const currentItem = queueItems.find(item => item.id === currentQueueItemId);
        queueTopic = currentItem?.title;
      }

      const response = await fetch('/api/blog-demos/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          searchMode,
          queueMode,
          queueTopic
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let sources: import('@/app/lib/types').Source[] | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: accumulatedContent, sources }
                      : msg
                  ));
                } else if (parsed.sources) {
                  // Capture sources metadata
                  sources = parsed.sources;
                  console.log('Received sources:', sources);
                  // Update message with sources
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, sources: parsed.sources }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation cancelled by user');
        // Keep the partial content that was generated
      } else {
        console.error('Error generating response:', error);

        // Determine error message based on error type
        let errorMessage = 'Sorry, I encountered an error while generating a response.';
        if (error instanceof Error) {
          // Check if it's a network error
          if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Connection failed. Please check your internet.';
          } else if (error.message.includes("you've run out of messages")) {
            errorMessage = "you've run out of messages";
          } else {
            errorMessage = error.message;
          }
        }

        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: errorMessage }
            : msg
        ));
      }
    } finally {
      setIsGenerating(false);
      setGeneratingMessageId(null);
      abortControllerRef.current = null;
    }
  }, [isGenerating, setIsGenerating, setGeneratingMessageId, setMessages, queueMode, currentQueueItemId, queueItems, searchMode]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setGeneratingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const runMessageWithMessages = async (messageId: string, messagesArray: Message[]) => {
    await runMessageWithMessagesAndTopic(messageId, messagesArray);
  };

  const runMessage = async (messageId: string) => {
    await runMessageWithMessages(messageId, messages);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isGenerating) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    if (queueMode) {
      // Show user message immediately for better perceived performance
      const userMessage = createMessage('user', messageText);
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Show loader immediately
      setIsGenerating(true);
      setGeneratingMessageId(userMessage.id);
      
      // Generate queue items in background and stream them as they come
      breakMessageIntoQueue(messageText).then(newQueueItems => {
        setQueueItems(newQueueItems);
        
        // Send the first item to Claude for response
        const firstItem = newQueueItems.find(item => item.status === 'now');
        if (firstItem && firstItem.content) {
          // Pass the topic directly (isGenerating is already true)
          runMessageWithMessagesAndTopic(userMessage.id, updatedMessages, firstItem.title);
        } else {
          // No queue items, stop generating
          setIsGenerating(false);
          setGeneratingMessageId(null);
        }
      }).catch(error => {
        console.error('Error creating queue:', error);
        setIsGenerating(false);
        setGeneratingMessageId(null);
      });
    } else {
      // Normal mode: send message as usual
      const userMessage = createMessage('user', messageText);
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      await runMessageWithMessages(userMessage.id, updatedMessages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearchModeChange = (mode: 'on' | 'auto' | 'off', e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the label from toggling the checkbox immediately
    setSearchMode(mode);
    setShowSearchSuccess(true);
    
    // Close the menu after showing success
    setTimeout(() => {
      setShowSearchSuccess(false);
      // Programmatically uncheck the checkbox to close the menu
      const checkbox = document.getElementById(`search-menu-toggle-${demoId}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = false;
    }, 250);
  };

  // Break message into queue items based on topics/sections
  const breakMessageIntoQueue = async (message: string): Promise<import('@/app/lib/types').QueueItem[]> => {
    // In queue mode, we'll ask Claude to break the message into topics
    try {
      const response = await fetch('/api/blog-demos/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Break this message into a list of 2-5 distinct topics or questions that should be answered. Each topic should be a short title (max 5 words). Return ONLY a JSON array of strings, nothing else.

Message: "${message}"

Example output: ["Topic 1", "Topic 2", "Topic 3"]`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to break message into topics' }));
        throw new Error(errorData.error || 'Failed to break message into topics');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    accumulatedContent += parsed.content;
                  }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      }

      // Parse the JSON array from the response
      try {
        const topics = JSON.parse(accumulatedContent);
        if (Array.isArray(topics) && topics.length > 0) {
          // Create queue items from topics
          return topics.map((topic, index) => ({
            id: crypto.randomUUID(),
            title: topic,
            content: index === 0 ? message : `tell me about ${topic.toLowerCase()}`,
            status: index === 0 ? 'now' : 'upcoming',
            order: index,
          } as import('@/app/lib/types').QueueItem));
        }
      } catch (e) {
        console.error('Failed to parse topics:', e);
      }
    } catch (error) {
      console.error('Error breaking message into queue:', error);
    }

    // Fallback: create a single queue item
    return [{
      id: crypto.randomUUID(),
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      content: message,
      status: 'now',
      order: 0,
    }];
  };

  // Queue handlers
  const handleQueuePlay = useCallback(async (itemId: string) => {
    // Don't allow playing if already generating (check ref for immediate value)
    if (isGeneratingRef.current) return;

    // Set ref immediately to prevent double calls
    isGeneratingRef.current = true;

    // Use ref to get current queueItems to avoid stale closures
    const currentQueueItems = queueItemsRef.current;
    const item = currentQueueItems.find((q: import('@/app/lib/types').QueueItem) => q.id === itemId);
    if (!item) {
      isGeneratingRef.current = false;
      return;
    }

    // Move this item to 'now' status
    const updatedItems = currentQueueItems.map((q: import('@/app/lib/types').QueueItem) => {
      if (q.id === itemId) {
        return { ...q, status: 'now' as const };
      } else if (q.status === 'now') {
        return { ...q, status: 'past' as const };
      }
      return q;
    });

    setQueueItems(updatedItems);

    // If item has content, send it as a message
    if (item.content) {
      const userMessage = createMessage('user', item.content);
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, userMessage];

        // Pass the topic directly since we know which item is being played
        runMessageWithMessagesAndTopic(userMessage.id, updatedMessages, item.title);

        return updatedMessages;
      });
    }
  }, [setQueueItems, runMessageWithMessagesAndTopic]);

  const handleQueueSkip = useCallback(() => {
    if (!currentQueueItemId) return;

    // Move current item to past and next upcoming to now
    const nextItem = queueItems.find((item: import('@/app/lib/types').QueueItem) => item.status === 'upcoming');

    const updatedItems = queueItems.map((item: import('@/app/lib/types').QueueItem) => {
      if (item.id === currentQueueItemId) {
        return { ...item, status: 'past' as const };
      } else if (nextItem && item.id === nextItem.id) {
        return { ...item, status: 'now' as const };
      }
      return item;
    });

    setQueueItems(updatedItems);

    // Automatically process the next item in queue mode
    if (nextItem) {
      handleQueuePlay(nextItem.id);
    }
  }, [currentQueueItemId, queueItems, setQueueItems, handleQueuePlay]);

  const handleQueueItemClick = useCallback((itemId: string) => {
    const item = queueItems.find((q: import('@/app/lib/types').QueueItem) => q.id === itemId);
    if (!item) return;

    if (isGenerating) {
      // If generating, move clicked item to play next (first in upcoming queue)
      const currentNowItem = queueItems.find(q => q.status === 'now');
      const upcomingItems = queueItems.filter(q => q.status === 'upcoming');
      
      // Reorder: put clicked item first, then others
      const reorderedUpcoming = [
        item,
        ...upcomingItems.filter(q => q.id !== itemId)
      ].map((q, index) => ({ ...q, order: index + 1 })); // Start from order 1

      const updatedItems = [
        ...queueItems.filter(q => q.status === 'past'),
        currentNowItem!,
        ...reorderedUpcoming
      ];

      setQueueItems(updatedItems);
    } else {
      // If not generating, play immediately
      handleQueuePlay(itemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueItems, isGenerating]);

  // Wire up the queue item click handler from parent
  useEffect(() => {
    // When parent provides a click callback, override it to use our handler
    if (onQueueItemClick && typeof window !== 'undefined') {
      (window as Window & { __queueItemClickHandler?: (itemId: string) => void }).__queueItemClickHandler = handleQueueItemClick;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as Window & { __queueItemClickHandler?: (itemId: string) => void }).__queueItemClickHandler;
      }
    };
  }, [handleQueueItemClick, onQueueItemClick]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQueueEdit = (itemId: string, newTitle: string) => {
    const updatedItems = queueItems.map((item: import('@/app/lib/types').QueueItem) => 
      item.id === itemId ? { ...item, title: newTitle } : item
    );
    setQueueItems(updatedItems);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQueueDelete = (itemId: string) => {
    const updatedItems = queueItems.filter((item: import('@/app/lib/types').QueueItem) => item.id !== itemId);
    setQueueItems(updatedItems);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQueueReorder = (reorderedItems: import('@/app/lib/types').QueueItem[]) => {
    setQueueItems(reorderedItems);
  };

  // Auto-continue to next queue item when generation completes
  useEffect(() => {
    if (!isGenerating && queueMode && currentQueueItemId) {
      // Check if there are more items in queue
      const nextItem = queueItems.find(item => item.status === 'upcoming');
      if (nextItem) {
        // Small delay before auto-playing next item
        const timer = setTimeout(() => {
          handleQueueSkip();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isGenerating, queueMode, currentQueueItemId, queueItems, handleQueueSkip]);

  // Listen for queue item trigger events (for auto-playing demos)
  useEffect(() => {
    if (!queueMode) return;

    const handleTriggerQueueItem = (event: Event) => {
      const customEvent = event as CustomEvent<{ queueItemId: string }>;
      const { queueItemId } = customEvent.detail;

      // Don't allow playing new items while generating
      if (isGenerating) {
        return;
      }

      handleQueuePlay(queueItemId);
    };

    const eventName = `triggerQueueItem-${demoId}`;
    window.addEventListener(eventName, handleTriggerQueueItem);

    return () => {
      window.removeEventListener(eventName, handleTriggerQueueItem);
    };
  }, [demoId, queueMode, handleQueuePlay, isGenerating]);

  return (
      <>
        <div className="messages-container">
          <div className="messages-wrapper">
            {messages.map((message, index) => {
              // Get all draft threads for this message
              const messageDraftThreads = Array.from(draftThreads.entries())
                .filter(([key]) => key.startsWith(`${message.id}-`))
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(([_, thread]) => thread);
              
              return (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  ref={(el) => {
                    if (el) {
                      messageContainerRefs.current.set(message.id, el);
                      if (message.role === 'assistant') {
                        messageRefs.current.set(message.id, el);
                      }
                    } else {
                      messageContainerRefs.current.delete(message.id);
                      if (message.role === 'assistant') {
                        messageRefs.current.delete(message.id);
                      }
                    }
                  }}
                >
                  <MessageComponent
                    message={message}
                    onUpdate={updateMessage}
                    onRun={message.role === 'user' ? runMessage : undefined}
                    onComment={handleComment}
                    onAddCommentToThread={handleAddCommentToThread}
                    onAIRespondToThread={(messageId, threadId, searchMode) => handleAIRespondToThread(messageId, threadId, messages, searchMode)}
                    onCancelDraft={handleCancelDraft}
                    draftThreads={messageDraftThreads}
                    isGenerating={isGenerating && generatingMessageId === message.id}
                    isLatestMessage={index === messages.length - 1}
                    animationConfig={animationConfig}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <div className="input-box">
              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say hi to clod..."
                className="input-textarea"
                rows={1}
                disabled={isGenerating}
              />
              
              {/* Bottom Row: Search button, Autoplay toggle (queue mode), and Send button */}
              <div className="input-actions">
                <div className="input-actions-left">
                  {/* Search Button with Menu - using checkbox hack */}
                  <div className="search-container">
                    <input
                      type="checkbox"
                      id={`search-menu-toggle-${demoId}`}
                      className="search-menu-checkbox"
                    />
                    
                    <label htmlFor={`search-menu-toggle-${demoId}`} className="search-button">
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
                    <label htmlFor={`search-menu-toggle-${demoId}`} className="search-menu-overlay"></label>
                    
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
                </div>
                
                {/* Send/Stop Button */}
                <button
                  onClick={isGenerating ? stopGeneration : handleSendMessage}
                  disabled={!isGenerating && !newMessage.trim()}
                  className={`send-button ${isGenerating ? 'stop-mode' : ''}`}
                  style={{
                    backgroundColor: isGenerating 
                      ? 'var(--color-button-disabled)' 
                      : (newMessage.trim() ? 'var(--color-olive-dark)' : 'var(--color-button-disabled)')
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
      
      {/* Chat Animation Settings */}
      {!hideSettings && <ChatAnimationSettings onChange={() => {}} demoId={demoId} />}
      </>
  );
}