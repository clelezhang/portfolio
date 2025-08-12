'use client';

import { useState, useEffect, useRef, useCallback} from 'react';
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
    artwork: "https://picsum.photos/40/40?random=2"
  });
  
  const widgetRef = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize SoundCloud widget with random starting position
  useEffect(() => {
    // Generate a random starting position (assuming playlist has around 10-20 tracks)
    const randomStartPosition = Math.floor(Math.random() * 15) + 1;
    
    // Load SoundCloud API script
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => {
      // Wait a bit for SC to be available
      setTimeout(() => {
        if ((window as any).SC) {
          try {
            const widget = (window as any).SC.Widget('soundcloud-iframe');
            widgetRef.current = widget;

          // Bind events
          widget.bind((window as any).SC.Widget.Events.READY, () => {
            setIsLoading(false);
            
            // Skip to a random track in the playlist
            widget.skip(randomStartPosition);
            
            // Start playing automatically with low volume
            setTimeout(() => {
              widget.play();
              widget.setVolume(0);
              setIsPlaying(true);
              startProgressTracking();
            }, 200);
            
            // Get the track info after skipping
            setTimeout(() => {
              widget.getCurrentSound((sound: any) => {
                if (sound) {
                  setTrackInfo({
                    title: sound.title || "Stay tuned...",
                    artwork: sound.artwork_url || "https://picsum.photos/40/40?random=1"
                  });
                }
              });
            }, 100);
            
            // Also try to get track info after a longer delay to ensure it's loaded
            setTimeout(() => {
              widget.getCurrentSound((sound: any) => {
                if (sound && sound.title) {
                  setTrackInfo({
                    title: sound.title,
                    artwork: sound.artwork_url || "https://picsum.photos/40/40?random=2"
                  });
                }
              });
            }, 500);
          });

          widget.bind((window as any).SC.Widget.Events.PLAY, () => {
            setIsPlaying(true);
            startProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
            setIsPlaying(false);
            stopProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.FINISH, () => {
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
    if (isLoading || !widgetRef.current) {
      return;
    }

    if (!isPlaying && !isMuted) {
      // Start playing
      widgetRef.current.play();
      widgetRef.current.setVolume(25);
    } else if (isPlaying && !isMuted) {
      // Mute (but keep playing)
      widgetRef.current.setVolume(0);
      setIsMuted(true);
    } else if (isMuted) {
      // Unmute
      widgetRef.current.setVolume(25);
      setIsMuted(false);
    }
  }, [isPlaying, isMuted, isLoading]);

  return (
    <>
      {/* Hidden SoundCloud iframe */}
      <iframe
        id="soundcloud-iframe"
        src="https://w.soundcloud.com/player/?url=https://soundcloud.com/lele-zhang-cherrilynn/sets/portfolio&auto_play=true&shuffle=true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      
      <div className={`flex h-10 w-30 items-center gap-1 bg-grey-50 backdrop-blur-[20px] rounded-full pl-1 pr-3 py-2 ${className}`} style={{ willChange: 'transform' }}>
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