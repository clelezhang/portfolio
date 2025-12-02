'use client';

import React, { useState, useEffect, useRef } from 'react';

interface InlineReflectionDemoProps {
  isVisible?: boolean;
}

export default function InlineReflectionDemo({ isVisible = false }: InlineReflectionDemoProps) {
  const [showContent, setShowContent] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [typedResponse, setTypedResponse] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const hasAnimated = useRef(false);

  const prompt = "What would it look like to act on these opportunities?";
  const response = "To take more chances, to say yes more, to reach out to people, to try new things";

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowContent(true), 200);
      
      // Start showing reflection after content appears
      setTimeout(() => {
        setShowReflection(true);
        
        // Type out the prompt
        let promptIndex = 0;
        const promptInterval = setInterval(() => {
          if (promptIndex <= prompt.length) {
            setTypedPrompt(prompt.slice(0, promptIndex));
            promptIndex++;
          } else {
            clearInterval(promptInterval);
            
            // After prompt, type response
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

  // Lucide Sparkle icon path (exact from Pearl)
  const SparkleIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, minWidth: size, minHeight: size }}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      <path d="M20 3v4"/>
      <path d="M22 5h-4"/>
      <path d="M4 17v2"/>
      <path d="M5 18H3"/>
    </svg>
  );

  return (
    <div style={{ 
      padding: '2rem 1rem', 
      background: '#fcf9fa',
      minHeight: '480px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Instrument Sans", sans-serif',
      fontVariationSettings: '"wght" 400',
    }}>
      {/* TiptapEditor container - exact styling from Pearl */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(253, 250, 251, 1)',
        borderRadius: '8px',
        border: '1px solid rgba(179, 175, 215, 0.12)',
        boxShadow: '0 5px 12px rgba(162, 166, 217, 0.06)',
        padding: '24px',
        paddingTop: '16px',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}>
        {/* Journal Content - exact .tiptap styling */}
        <div style={{ 
          color: '#322e33',
          fontSize: '16px',
          fontFamily: '"Instrument Sans", sans-serif',
          fontVariationSettings: '"wght" 400',
          lineHeight: '150%',
        }}>
          <p style={{ margin: 0, marginBottom: '0' }}>
            I thought about how I&apos;ve been across the bridge many times now, but I will never feel like it&apos;s enough. Every time I cross the bridge it will be as beautiful as it was the first time
          </p>
          <p style={{ margin: 0, marginTop: '0' }}>
            I know I have time, I know I&apos;ll live a long time (probably)
          </p>
          <p style={{ margin: 0, marginLeft: '16px' }}>
            but maybe I shouldn&apos;t be so lax about the time I have
          </p>

          {/* Reflection Container - exact .reflection-container styling from Pearl */}
          {showReflection && (
            <div style={{
              fontStyle: 'italic',
              color: '#a56980',
              marginTop: '16px',
              marginBottom: '16px',
              opacity: showReflection ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}>
              {/* Reflection Content - exact .reflection-content styling */}
              <div style={{
                fontFamily: '"gelica", Georgia, serif',
                fontWeight: 400,
                fontVariationSettings: '"wght" 400',
                background: 'linear-gradient(135deg, #b9839c 0%, #a28ba7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: '#b9839c', /* Fallback */
                display: 'flex',
                flexDirection: 'row',
                gap: '6px',
                alignItems: 'flex-start',
              }}>
                {/* Sparkle Icon - exact .reflection-sparkle styling (20px) */}
                <SparkleIcon size={20} />
                <span>
                  {typedPrompt}
                  {typedPrompt.length < prompt.length && typedResponse.length === 0 && (
                    <span style={{ 
                      display: 'inline-block',
                      width: '2px',
                      height: '16px',
                      background: '#b9839c',
                      marginLeft: '2px',
                      animation: 'blink 1s infinite',
                    }} />
                  )}
                </span>
              </div>

              {/* User Response - regular text color */}
              {typedResponse && (
                <div style={{
                  marginTop: '8px',
                  marginLeft: '26px',
                  color: '#322e33',
                  fontStyle: 'normal',
                  fontFamily: '"Instrument Sans", sans-serif',
                  fontVariationSettings: '"wght" 400',
                }}>
                  {typedResponse}
                  {typedResponse.length < response.length && (
                    <span style={{ 
                      display: 'inline-block',
                      width: '2px',
                      height: '14px',
                      background: '#322e33',
                      marginLeft: '2px',
                      animation: 'blink 1s infinite',
                    }} />
                  )}
                </div>
              )}

              {/* Follow-up prompt - exact .reflection-prompt-container styling */}
              {showFollowUp && (
                <div style={{
                  marginTop: '20px',
                  marginBottom: '8px',
                  fontFamily: '"gelica", Georgia, serif',
                  fontWeight: 400,
                  fontVariationSettings: '"wght" 400',
                  background: 'linear-gradient(135deg, #b9839c 0%, #a28ba7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#b9839c',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '6px',
                  alignItems: 'center',
                  opacity: showFollowUp ? 1 : 0,
                  transition: 'opacity 400ms ease',
                }}>
                  <SparkleIcon size={20} />
                  <span>
                    Would you like another question? (<kbd style={{ 
                      fontFamily: '"gelica", Georgia, serif',
                      fontWeight: 400,
                      fontVariationSettings: '"wght" 400',
                      background: 'linear-gradient(135deg, #b9839c 0%, #a28ba7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontStyle: 'italic',
                      display: 'inline-block',
                      padding: '0 2px',
                    }}>Tab</kbd> or <kbd style={{ 
                      fontFamily: '"gelica", Georgia, serif',
                      fontWeight: 400,
                      background: 'linear-gradient(135deg, #b9839c 0%, #a28ba7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontStyle: 'italic',
                      display: 'inline-block',
                      padding: '0 2px',
                    }}>⌘</kbd>+<kbd style={{ 
                      fontFamily: '"gelica", Georgia, serif',
                      fontWeight: 400,
                      background: 'linear-gradient(135deg, #b9839c 0%, #a28ba7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontStyle: 'italic',
                      display: 'inline-block',
                      padding: '0 2px',
                    }}>Enter</kbd>)
                  </span>
                </div>
              )}
            </div>
          )}

          <p style={{ margin: 0 }}>things are precious</p>
          <p style={{ margin: 0 }}>
            and if I always go on my own pace, if I don&apos;t act in response to opportunity, I will most certainly miss things that will never come by again
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
