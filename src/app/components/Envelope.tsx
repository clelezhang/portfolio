'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import TwitterIcon from './icons/TwitterIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import { ArrowUpIcon } from '@heroicons/react/24/outline';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
}

export default function Envelope() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey! I love your portfolio. The card animations are really smooth. What made you choose this design approach?",
      sender: 'other',
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    },
    {
      id: '2', 
      text: "Thanks! I wanted to create something that felt tactile and playful, like browsing through actual photo cards.",
      sender: 'user',
      timestamp: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Memoize icons to prevent rerendering
  const twitterIcon = useMemo(() => <TwitterIcon className="text-white" size={20} />, []);
  const envelopeIcon = useMemo(() => <EnvelopeIcon className="w-5 h-5 text-white" />, []);
  const arrowIcon = useMemo(() => <ArrowUpIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = '20px';
    }

    // Simulate typing response after a delay
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        const responses = [
          "That's really interesting! Tell me more.",
          "I'd love to hear about your design process.",
          "What tools do you use for your projects?",
          "Your work has such a unique aesthetic!",
          "Thanks for sharing that with me!"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          sender: 'other',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000 + Math.random() * 2000); // 1-3 seconds typing delay
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full max-w-[600px] mx-auto">
        {/* Top Flap */}
        <div 
           className="left-0 right-0 h-[112px] rounded-t-[128px] flex items-center justify-center"
           style={{
             background: 'rgba(255, 255, 255, 0.2)',
             boxShadow: `
               inset 1px 1px 2px rgba(255, 255, 255, 0.15),
               inset 0 -4px 4px rgba(255, 255, 255, 0.25),
               inset 0 -12px 24px rgba(255, 255, 255, 0.30),
               0 4px 24px rgba(47, 53, 87, 0.06)
             `,
             backdropFilter: 'blur(2px)'
           }}
         >
        {/* Header */}
           <h2 className="font-mono text-lg tracking-wider mt-10" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
             TALK <span className="italic">2</span> ME
           </h2>
         </div>
        
        {/* Main Envelope Body */}
        <div 
          className="relative rounded-b-[32px] h-[375px] flex flex-col"
          style={{
            background: 'rgba(255, 255, 255, 0.36)',
            boxShadow: `
              0 4px 24px rgba(47, 53, 87, 0.08),
              0 4px 4px rgba(47, 53, 87, 0.04)
            `
          }}
        >
        {/* Left Panel */}
             <div 
               className="absolute top-0 left-0 w-[112px] bottom-0 z-0"
               style={{
                 borderRadius: '0px 64px 64px 32px',
                 background: 'rgba(255, 255, 255, 0.04)',
                 boxShadow: `
                   inset 1px 48px 24px rgba(255, 255, 255, 0.05),
                   inset 0 4px 4px rgba(255, 255, 255, 0.1),
                   0 4px 25px rgba(47, 53, 87, 0.06)
                 `
               }}
           />
          
          {/* Right Panel */}
          <div 
            className="absolute top-0 right-0 w-[112px] bottom-0 z-0"
            style={{
              borderRadius: '64px 0px 32px 64px',
              background: 'rgba(255, 255, 255, 0.04)',
              boxShadow: `
                inset 1px 48px 24px rgba(255, 255, 255, 0.05),
                inset 0 4px 4px rgba(255, 255, 255, 0.1),
                0 4px 25px rgba(47, 53, 87, 0.06)
              `
            }}
          />
          
          {/* Bottom Panel */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[312px] rounded-t-[128px] rounded-b-[32px] z-0"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              boxShadow: `
                inset 1px 48px 24px 8px rgba(255, 255, 255, 0.15),
                inset 0 4px 4px rgba(255, 255, 255, 0.1),
              `
            }}
          />


                {/* Chat Messages Container */}
        <div className="flex-1 relative z-10 overflow-hidden rounded-b-[32px]">
          <div className="space-y-1 h-full overflow-y-auto p-4 pb-20 envelope-scrollbar" >
          {messages.map((message, index) => {
            const nextMessage = messages[index + 1];
            const isLastInGroup = !nextMessage || nextMessage.sender !== message.sender;
            
            return (
              <div key={message.id} className={`flex items-end ${message.sender === 'user' ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-1'}`}>
                {/* Avatar for incoming messages - only show on last message in group */}
                {message.sender === 'other' && (
                  <div className={`w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 mr-2 ${!isLastInGroup ? 'opacity-0' : ''}`}>
                    <Image
                      src="/profile.jpg"
                      alt="Profile"
                      width={42}
                      height={42}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Message bubble */}
                <div 
                  className="px-4 py-3 max-w-xs break-words"
                  style={{
                    background: message.sender === 'user' 
                      ? 'rgba(47, 53, 87, 0.9)' 
                      : 'rgba(255, 255, 255, 0.95)',
                    color: message.sender === 'user' 
                      ? 'rgba(255, 255, 255, 0.95)' 
                      : 'var(--gray-900)',
                    borderRadius: '24px'
                  }}
                >
                <p className="font-detail text-sm leading-tight">
                     {message.text}
                   </p>
                </div>
                

              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex items-end justify-start mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2">
                <Image
                  src="/card-images/charcuterie.jpg"
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="px-5 py-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  borderRadius: '24px'
                }}
              >
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
              <div className="w-10"></div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div 
          className="absolute bottom-0 left-0 right-0 flex items-end space-x-2 z-20 pb-4 px-4"
        >
            {/* Twitter button */}
           <button 
             className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all hover:bg-gray-500"
             style={{
               backdropFilter: 'blur(10px)'
             }}
           >
             {twitterIcon}
           </button>

            {/* Email button */}
           <button 
             className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all  hover:bg-gray-500"
             style={{
               backdropFilter: 'blur(10px)'
             }}
           >
             {envelopeIcon}
           </button>

          {/* Input field container */}
          <div className="flex-1 relative">
            <div 
              className="flex items-end pl-4 pr-[6px] py-3"
              style={{
                background: 'var(--gray-400)',
                borderRadius: '24px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // Auto-resize textarea only when content requires multiple lines
                  const target = e.target;
                  target.style.height = '20px'; // Reset to min height
                  const scrollHeight = target.scrollHeight;
                  
                  // Only expand if content doesn't fit in single line
                  if (scrollHeight > 20) {
                    target.style.height = Math.min(scrollHeight, 80) + 'px';
                  }
                }}
                onKeyDown={handleKeyPress}
                placeholder="Chat with me!"
                className="flex-1 font-detail text-sm leading-tight resize-none focus:outline-none bg-transparent"
                style={{
                  color: 'rgba(255, 255, 255)',
                  minHeight: '20px',
                  maxHeight: '80px'
                }}
                rows={1}
              />
              
              {/* Send button container */}
              <div className="h-5 overflow-visible flex items-center">
                <button
                  onClick={handleSendMessage}
                  className={`w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-all hover:bg-white/30 ${
                    newMessage.trim() ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                  }`}
                  disabled={!newMessage.trim()}
                >
                  {arrowIcon}
                </button>
              </div>
            </div>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
}
