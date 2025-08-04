'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import SpinningCD from './SpinningCD';
import ScrollingTitle from './ScrollingTitle';
import ProgressBar from './ProgressBar';

interface MusicPlayerProps {
  className?: string;
}

export default function MusicPlayer({ className = "" }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trackInfo, setTrackInfo] = useState({
    title: "Stay tuned...",
    artwork: "https://picsum.photos/40/40?random=1"
  });
  
  const widgetRef = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize SoundCloud widget the proper way
  useEffect(() => {
    // Load SoundCloud API script
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => {
      console.log('SoundCloud API loaded');
      
      // Wait a bit for SC to be available
      setTimeout(() => {
        if ((window as any).SC) {
          try {
            const widget = (window as any).SC.Widget('soundcloud-iframe');
            widgetRef.current = widget;

          // Bind events
          widget.bind((window as any).SC.Widget.Events.READY, () => {
            console.log('SoundCloud widget ready');
            setIsLoading(false);
            
            // Skip to a random track to start with different song each time
            widget.skip(Math.floor(Math.random() * 10)); // Skip 0-9 tracks randomly
            
            // Get initial track info
            widget.getCurrentSound((sound: any) => {
              if (sound) {
                setTrackInfo({
                  title: sound.title || "R&B Classic",
                  artwork: sound.artwork_url || "https://picsum.photos/40/40?random=2"
                });
              }
            });
          });

          widget.bind((window as any).SC.Widget.Events.PLAY, () => {
            console.log('SoundCloud playing');
            setIsPlaying(true);
            startProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
            console.log('SoundCloud paused');
            setIsPlaying(false);
            stopProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.FINISH, () => {
            console.log('Track finished');
            setProgress(0);
          });

          // Update track info on track change (throttled)
          let lastTrackUpdate = 0;
          widget.bind((window as any).SC.Widget.Events.PLAY_PROGRESS, () => {
            const now = Date.now();
            if (now - lastTrackUpdate > 5000) { // Only update every 5 seconds
              lastTrackUpdate = now;
              widget.getCurrentSound((sound: any) => {
                if (sound && sound.title && sound.title !== trackInfo.title) {
                  console.log('Track changed to:', sound.title);
                  setTrackInfo({
                    title: sound.title,
                    artwork: sound.artwork_url || "https://picsum.photos/40/40?random=2"
                  });
                }
              });
            }
          });
          } catch (error) {
            console.error('Error initializing SoundCloud widget:', error);
          }
        } else {
          console.error('SoundCloud API not available');
        }
      }, 1000);
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      stopProgressTracking();
    };
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) return;
    
    progressInterval.current = setInterval(() => {
      if (widgetRef.current) {
        widgetRef.current.getPosition((position: number) => {
          widgetRef.current.getDuration((duration: number) => {
            if (duration > 0) {
              setProgress((position / duration) * 100);
            }
          });
        });
      }
    }, 1000) as NodeJS.Timeout;
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const handleCDClick = useCallback(() => {
    console.log('CD clicked', { isPlaying, isMuted, widget: !!widgetRef.current, isLoading });
    
    if (isLoading || !widgetRef.current) {
      console.log('Widget not ready');
      return;
    }

    if (!isPlaying && !isMuted) {
      // Start playing
      console.log('Calling widget.play()...');
      widgetRef.current.play();
    } else if (isPlaying && !isMuted) {
      // Mute (but keep playing)
      console.log('Muting...');
      widgetRef.current.setVolume(0);
      setIsMuted(true);
    } else if (isMuted) {
      // Unmute
      console.log('Unmuting...');
      widgetRef.current.setVolume(100);
      setIsMuted(false);
    }
  }, [isPlaying, isMuted, isLoading]);

  return (
    <>
      {/* Hidden SoundCloud iframe */}
      <iframe
        id="soundcloud-iframe"
        src="https://w.soundcloud.com/player/?url=https://soundcloud.com/lele-zhang-cherrilynn/sets/portfolio&auto_play=false&shuffle=true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      
      <div className={`flex h-10 w-30 items-center gap-1 bg-grey-50 backdrop-blur-[20px] rounded-full pl-1 pr-3 py-2 ${className}`}>
        <SpinningCD 
          artwork={trackInfo.artwork}
          onClick={handleCDClick}
          className="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0 space-y-1">
          <ScrollingTitle 
            title={trackInfo.title}
            className="text-brown"
          />
          
          <ProgressBar 
            progress={progress}
            isAnimating={isPlaying && !isMuted}
            className=""
          />
        </div>
      </div>
    </>
  );
}