import { useState, useCallback, useRef } from 'react';

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
  clearError: () => void;
}

export function useChat(initialMessages: Message[] = []): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        messages: [...messages, userMessage],
      };

      // Add card context if this message came from a card
      if (cardId) {
        requestBody.cardContext = `User interacted with the "${cardId}" card`;
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
      let currentMessageId = (Date.now() + 1).toString();
      const initialMessage: Message = {
        id: currentMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, initialMessage]);

      let accumulatedText = '';
      let updateBuffer = '';
      let lastUpdate = 0;
      let isFirstChunk = true;
      const UPDATE_THROTTLE = 50; // Update UI every 50ms maximum

      const updateCurrentMessage = (text: string) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === currentMessageId 
              ? { ...msg, text }
              : msg
          )
        );
      };

      const createNewMessage = () => {
        // Create a new message for the next sentence
        const newMessageId = (Date.now() + Math.random()).toString();
        const newMessage: Message = {
          id: newMessageId,
          text: '',
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, newMessage]);
        currentMessageId = newMessageId;
        return newMessageId;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Final update with any remaining text
          if (updateBuffer) {
            accumulatedText += updateBuffer;
            updateCurrentMessage(accumulatedText);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        updateBuffer += chunk;
        
        // Show first chunk immediately for instant feedback
        if (isFirstChunk) {
          accumulatedText += updateBuffer;
          updateCurrentMessage(accumulatedText);
          updateBuffer = '';
          lastUpdate = Date.now();
          isFirstChunk = false;
          continue;
        }
        
        // Check for sentence endings (periods followed by space or end)
        const periodMatches = updateBuffer.match(/\.\s+/g);
        
        if (periodMatches && periodMatches.length > 0) {
          // Find the last complete sentence
          const lastPeriodIndex = updateBuffer.lastIndexOf('. ');
          if (lastPeriodIndex !== -1) {
            // Complete the current message with the sentence(s)
            const completedText = updateBuffer.substring(0, lastPeriodIndex + 1);
            accumulatedText += completedText;
            updateCurrentMessage(accumulatedText);
            
            // Start a new message with the remaining text
            const remainingText = updateBuffer.substring(lastPeriodIndex + 2);
            if (remainingText.trim()) {
              createNewMessage();
              accumulatedText = remainingText;
              updateCurrentMessage(accumulatedText);
            } else {
              createNewMessage();
              accumulatedText = '';
            }
            updateBuffer = '';
            lastUpdate = Date.now();
          } else {
            // No complete sentence yet, continue accumulating
            const now = Date.now();
            if (now - lastUpdate >= UPDATE_THROTTLE || updateBuffer.length > 20) {
              accumulatedText += updateBuffer;
              updateBuffer = '';
              updateCurrentMessage(accumulatedText);
              lastUpdate = now;
            }
          }
        } else {
          // No periods found, use throttled updates for better performance
          const now = Date.now();
          if (now - lastUpdate >= UPDATE_THROTTLE || updateBuffer.length > 20) {
            accumulatedText += updateBuffer;
            updateBuffer = '';
            updateCurrentMessage(accumulatedText);
            lastUpdate = now;
          }
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
  };
}
