import { useState, useCallback, useRef, useEffect } from 'react';
import { getCardPrompt } from '../lib/prompts';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  cardImage?: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, cardImage?: string, cardId?: string) => Promise<void>;
  addAssistantMessage: (text: string) => void;
  clearError: () => void;
}

export function useChat(initialMessages: Message[] = []): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>(initialMessages);

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (text: string, cardImage?: string, cardId?: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      cardImage,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Prepare request with card context if from card interaction
      const requestBody: { messages: Message[]; cardContext?: string } = {
        messages: [...messagesRef.current, userMessage],
      };

      // Add card context if this message came from a card
      if (cardId) {
        requestBody.cardContext = getCardPrompt(cardId);
      }

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response with optimized chunking
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Create initial assistant message that will be updated as we stream
      const messageId = (Date.now() + 1).toString();
      const initialMessage: Message = {
        id: messageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, initialMessage]);

      let accumulatedText = '';
      let updateBuffer = '';
      let lastUpdate = 0;
      const UPDATE_THROTTLE = 30;
      const BUFFER_SIZE = 15; // Smaller buffer for more frequent updates

      const updateMessage = (text: string) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, text }
              : msg
          )
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Final update with any remaining text in buffer
          if (updateBuffer) {
            accumulatedText += updateBuffer;
          }
          // Check if blocked - remove the empty assistant message
          if (accumulatedText === '__BLOCKED__' || accumulatedText === '') {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
          } else {
            updateMessage(accumulatedText);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        updateBuffer += chunk;

        // Throttled updates for smooth streaming with smaller chunks
        const now = Date.now();
        if (now - lastUpdate >= UPDATE_THROTTLE || updateBuffer.length > BUFFER_SIZE) {
          accumulatedText += updateBuffer;
          updateBuffer = '';
          // Don't update UI if it's the blocked marker
          if (!accumulatedText.startsWith('__BLOCKED__')) {
            updateMessage(accumulatedText);
          }
          lastUpdate = now;
        }
      }

    } catch (err) {
      console.error('Chat error:', err);

      // Create user-friendly error messages in lele's tone
      let userFriendlyError = 'hmm something went wrong';

      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (errorMessage.includes('http error')) {
          userFriendlyError = 'looks like there was a connection issue; try again?';
        } else if (errorMessage.includes('no response body')) {
          userFriendlyError = 'the response got a bit lost; give it another go';
        } else if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
          userFriendlyError = 'your internet might be acting up; check your connection?';
        }
      }

      setError(userFriendlyError);

      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAssistantMessage = useCallback((text: string) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'assistant',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    addAssistantMessage,
    clearError,
  };
}
