'use client';

import React, { useState, useEffect, useRef } from 'react';

interface JournalWithReflectionDemoProps {
  isVisible?: boolean;
}

export default function JournalWithReflectionDemo({ isVisible = false }: JournalWithReflectionDemoProps) {
  const [showContent, setShowContent] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [typedResponse, setTypedResponse] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMobileView, setIsMobileView] = useState(false);
  const hasAnimated = useRef(false);

  const prompt = "What would it look like to act on these opportunities?";
  const response = "To take more chances, to say yes more, to reach out to people, to try new things";

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowContent(true), 200);
      
      setTimeout(() => {
        setShowReflection(true);
        
        let promptIndex = 0;
        const promptInterval = setInterval(() => {
          if (promptIndex <= prompt.length) {
            setTypedPrompt(prompt.slice(0, promptIndex));
            promptIndex++;
          } else {
            clearInterval(promptInterval);
            
            setTimeout(() => {
              let responseIndex = 0;
              const responseInterval = setInterval(() => {
                if (responseIndex <= response.length) {
                  setTypedResponse(response.slice(0, responseIndex));
                  responseIndex++;
                } else {
                  clearInterval(responseInterval);
                  setTimeout(() => setShowFollowUp(true), 400);
                }
              }, 25);
            }, 600);
          }
        }, 30);
      }, 800);
    }
  }, [isVisible]);

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Sample notes - exact EMOTION_COLORS from Pearl
  const sampleNotes = [
    { 
      id: 1, 
      title: 'I was in the bus going across the bay...', 
      preview: 'I thought about how I\'ve been across the bridge many times...',
      date: 'AUG 23', 
      emotions: [
        { name: 'Love', color: '#B53674', bg: 'rgba(248, 10, 152, 0.16)' },
        { name: 'Pain', color: '#C94261', bg: 'rgba(203, 1, 14, 0.14)' },
      ],
      active: true 
    },
    { 
      id: 2, 
      title: 'Thinking about what makes a good day', 
      preview: 'Sometimes the smallest things can change everything...',
      date: 'AUG 21', 
      emotions: [
        { name: 'Joy', color: '#BA643C', bg: 'rgba(255, 170, 0, 0.22)' },
        { name: 'Satisfaction', color: '#177BB9', bg: 'rgba(4, 196, 255, 0.2)' },
        { name: 'Contentment', color: '#168681', bg: 'rgba(28, 234, 186, 0.18)' },
      ],
      active: false 
    },
    { 
      id: 3, 
      title: 'Notes from the coffee shop', 
      preview: 'Overheard conversations and people watching...',
      date: 'AUG 19', 
      emotions: [
        { name: 'Interest', color: '#2D8A8F', bg: 'rgba(50, 233, 209, 0.18)' },
      ],
      active: false 
    },
    { 
      id: 4, 
      title: 'Weekend reflections', 
      preview: 'Taking stock of where I am and where I want to be...',
      date: 'AUG 17', 
      emotions: [
        { name: 'Contemplation', color: '#0680C6', bg: 'rgba(0, 202, 213, 0.18)' },
        { name: 'Nostalgia', color: '#3C4BD5', bg: 'rgba(65, 84, 255, 0.14)' },
      ],
      active: false 
    },
  ];

  return (
    <div className="pearl-demo-wrapper">
      <div 
        className="pearl-demo-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ backgroundImage: 'url(/work-images/44E86C7C-3123-4028-B956-F3C96E6B2FA9.jpeg)' }}
      >
        {/* Window */}
        <div 
          className={`pearl-demo-window ${showContent ? 'visible' : 'hidden'} ${isMobileView ? 'mobile' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : undefined,
          }}
          onMouseDown={handleTitleBarMouseDown}
        >
          {/* Title Bar - hidden on mobile */}
          {!isMobileView && (
            <div className={`pearl-demo-titlebar ${isDragging ? 'dragging' : ''}`}>
              <div className="pearl-demo-titlebar-dots">
                <div className="pearl-demo-titlebar-dot" />
                <div className="pearl-demo-titlebar-dot" />
                <div className="pearl-demo-titlebar-dot" />
              </div>
              <a 
                className="pearl-demo-titlebar-link"
                href="https://pearl-journal.com" 
                target="_blank" 
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
              >
                Open Pearl
              </a>
            </div>
          )}

          {/* Main Content */}
          <div className="pearl-demo-main">
            {/* Note List Sidebar */}
            {!isMobileView && (
              <div className="pearl-demo-notelist">
                <div className="pearl-demo-notelist-header">
                  <h2 className="pearl-demo-notelist-title">My notes</h2>
                  <div className="pearl-demo-icon-group">
                    <button className="pearl-demo-icon-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="pearl-demo-notes">
                  <div className="pearl-demo-notes-spacer" />
                  {sampleNotes.map((note) => (
                    <div 
                      key={note.id}
                      className={`pearl-demo-note-item ${note.active ? 'selected' : ''}`}
                    >
                      <div className="pearl-demo-note-title">{note.title}</div>
                      <div className="pearl-demo-note-preview">{note.preview}</div>
                      <div className="pearl-demo-note-meta">
                        {note.emotions.length > 0 && (
                          <div className="pearl-demo-note-emotions">
                            {note.emotions.map((emotion, i) => (
                              <span 
                                key={i}
                                className={`pearl-demo-emotion ${i === 0 ? 'first' : 'circle'}`}
                                style={{ color: emotion.color, backgroundColor: emotion.bg }}
                              >
                                {i === 0 ? emotion.name : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="pearl-demo-note-date">{note.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor Area */}
            <div className="pearl-demo-editor">
              <div className="pearl-demo-editor-header">
                <span className="pearl-demo-editor-date">August 23rd 2024 at 11:24</span>
                <span className="pearl-demo-editor-saved">
                  Saved
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>

              <div className="pearl-demo-editor-content">
                <div className="pearl-demo-editor-emotions">
                  <span className="pearl-demo-editor-emotion love">Love</span>
                  <span className="pearl-demo-editor-emotion pain">Pain</span>
                </div>

                <div className="pearl-demo-editor-body">
                  <p>I was in the bus going across the bay, looking out the window</p>
                  <p>I thought about how I&apos;ve been across the bridge many times now, but I will never feel like it&apos;s enough. Every time I cross the bridge it will be as beautiful as it was the first time.</p>
                  <p>maybe I shouldn&apos;t be so lax about the time I have</p>
                  <p>things are precious</p>
                  <p>and if I always go on my own pace, if I don&apos;t act in response to opportunity, I will most certainly miss things that will never come by again</p>

                  {showReflection && (
                    <div className="pearl-demo-reflection">
                      <div className="pearl-demo-reflection-prompt">
                        <span className="pearl-demo-dot" />
                        <span>
                          {typedPrompt}
                          {typedPrompt.length < prompt.length && typedResponse.length === 0 && (
                            <span className="pearl-demo-cursor prompt" />
                          )}
                        </span>
                      </div>

                      {typedResponse && (
                        <div className="pearl-demo-reflection-response">
                          {typedResponse}
                          {typedResponse.length < response.length && (
                            <span className="pearl-demo-cursor response" />
                          )}
                        </div>
                      )}

                      {showFollowUp && (
                        <div className="pearl-demo-reflection-followup">
                          <span className="pearl-demo-dot" />
                          <span>
                            Would you like another question? (<kbd>⌘</kbd>+<kbd>Enter</kbd>)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle - outside container, bottom right */}
      <div className="pearl-demo-toggle-wrapper">
        <button className="pearl-demo-toggle" onClick={() => setIsMobileView(!isMobileView)}>
          <div className="pearl-demo-toggle-switch">
            <div className={`pearl-demo-toggle-option ${!isMobileView ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className={`pearl-demo-toggle-option ${isMobileView ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
