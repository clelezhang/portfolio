'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import SpinningCD from './SpinningCD';
import ScrollingTitle from './ScrollingTitle';
import ProgressBar from './ProgressBar';

interface MusicPlayerProps {
  className?: string;
}

export default function MusicPlayer({ className = "" }: MusicPlayerProps) {
  // Single state machine for player status
  const [playerState, setPlayerState] = useState<'idle' | 'preloading' | 'loading' | 'ready' | 'playing' | 'muted'>('idle');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('musicPlayer_isMuted');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [progress, setProgress] = useState(0);
  const lastProgressUpdate = useRef<number>(0);
  const [trackInfo, setTrackInfo] = useState({
    title: "click to listen ⸜(｡˃ ᵕ ˂ )⸝*.ﾟ♫⋆｡♪ ₊˚.",
    artwork: "/cd.png"
  });

  // Derived states for cleaner logic
  const isPlaying = playerState === 'playing' || playerState === 'muted';
  const showTrackInfo = playerState === 'loading' || playerState === 'ready' || playerState === 'playing' || playerState === 'muted';
  
  // Display title based on state (with stability to prevent flashing)
  const displayTitle = (() => {
    if (!showTrackInfo) {
      return "click to listen ⸜(｡˃ ᵕ ˂ )⸝*.ﾟ♫⋆｡♪ ₊˚.";
    }
    if (playerState === 'loading') {
      return "loading ~₊.ﾟ*♪.˙";
    }
    // Only show track title if it's actually loaded and not the default
    if (trackInfo.title && trackInfo.title !== "click to listen ⸜(｡˃ ᵕ ˂ )⸝*.ﾟ♫⋆｡♪ ₊˚.") {
      return trackInfo.title;
    }
    return "loading ~₊.ﾟ*♪.˙";
  })();
  
  const widgetRef = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const cachedDuration = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef<number>(0);

  // Save mute state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicPlayer_isMuted', JSON.stringify(isMuted));
    }
  }, [isMuted]);


  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) return;
    
    progressInterval.current = setInterval(() => {
      if (widgetRef.current) {
        // Only get duration once per track, then cache it
        if (cachedDuration.current === null) {
          widgetRef.current.getDuration((duration: number) => {
            if (duration > 0) {
              cachedDuration.current = duration;
              // Now get position with cached duration
              widgetRef.current.getPosition((position: number) => {
                const newProgress = (position / cachedDuration.current!) * 100;
                // Only update if progress changed by at least 0.1%
                if (Math.abs(newProgress - lastProgressUpdate.current) >= 0.1) {
                  setProgress(newProgress);
                  lastProgressUpdate.current = newProgress;
                }
              });
            }
          });
        } else {
          // Use cached duration, only get position
          widgetRef.current.getPosition((position: number) => {
            const newProgress = (position / cachedDuration.current!) * 100;
            // Only update if progress changed by at least 0.1%
            if (Math.abs(newProgress - lastProgressUpdate.current) >= 0.1) {
              setProgress(newProgress);
              lastProgressUpdate.current = newProgress;
            }
          });
        }
      }
    }, 1500) as NodeJS.Timeout; // Optimized for better responsiveness
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [stopProgressTracking]);

  // Initialize SoundCloud widget
  const initializeWidget = useCallback(async (shouldAutoPlay = false) => {
    if (widgetRef.current) return; // Already initialized
    
    const randomStartPosition = Math.floor(Math.random() * 15) + 1;
    
    // Load SoundCloud API if not already loaded
    if (!(window as any).SC) {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      await new Promise<void>((resolve, reject) => {
        script.onload = () => setTimeout(resolve, 300);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Set iframe src and initialize widget
    const iframe = document.getElementById('soundcloud-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'https://w.soundcloud.com/player/?url=https://soundcloud.com/lele-zhang-cherrilynn/sets/portfolio&auto_play=false&shuffle=true';
    }
    
    const widget = (window as any).SC.Widget('soundcloud-iframe');
    widgetRef.current = widget;

    // Setup widget events
    widget.bind((window as any).SC.Widget.Events.READY, () => {
      // Skip to random track and get info
      widget.skip(randomStartPosition);
      
      setTimeout(() => {
        widget.getCurrentSound((sound: any) => {
          if (sound) {
            setTrackInfo({
              title: sound.title || "click to listen ⸜(｡˃ ᵕ ˂ )⸝*.ﾟ♫⋆｡♪ ₊˚.",
              artwork: sound.artwork_url || "/cd.png"
            });
            
            // Track is ready - wait longer to ensure track is fully loaded
            setTimeout(() => {
              // Clear loading timeout since we're ready
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
              
              setPlayerState(prevState => {
                if (shouldAutoPlay || prevState === 'loading') {
                  // Auto-play with error handling
                  setTimeout(() => {
                    try {
                      widget.setVolume(25); // Set volume before playing
                      widget.play(); // SoundCloud widget play() doesn't return a Promise
                      // Set volume again after play to ensure it sticks
                      setTimeout(() => {
                        widget.setVolume(25);
                      }, 100);
                    } catch (error) {
                      console.error('Play error:', error);
                      setPlayerState('ready');
                    }
                  }, 500); // Increased delay before playing
                  return 'playing'; // Always start in playing state, not muted
                } else {
                  return 'ready';
                }
              });
            }, 800); // Increased delay for track readiness
          }
        });
      }, 500);
    });

    widget.bind((window as any).SC.Widget.Events.PLAY, () => {
      setPlayerState(prevState => {
        // Only change state if we're not already in a playing state
        if (prevState !== 'playing' && prevState !== 'muted') {
          startProgressTracking();
          // Ensure volume is set to 25 when music starts playing
          setTimeout(() => {
            widget.setVolume(25);
          }, 50);
          // Always start in playing state when music begins
          return 'playing';
        }
        return prevState;
      });
    });

    widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
      setPlayerState(prevState => {
        // If user intentionally paused (muted state), don't override
        if (prevState === 'muted') return prevState;
        return 'ready';
      });
      stopProgressTracking();
    });

    widget.bind((window as any).SC.Widget.Events.FINISH, () => {
      setProgress(0);
      cachedDuration.current = null;
    });

    // Update track info on track change
    let lastTrackUpdate = 0;
    widget.bind((window as any).SC.Widget.Events.PLAY_PROGRESS, () => {
      const now = Date.now();
      if (now - lastTrackUpdate > 3000) {
        lastTrackUpdate = now;
        widget.getCurrentSound((sound: any) => {
          if (sound && sound.title) {
            setTrackInfo(prevInfo => {
              // Only update if actually different to avoid unnecessary re-renders
              if (sound.title !== prevInfo.title || sound.artwork_url !== prevInfo.artwork) {
                return {
                  title: sound.title,
                  artwork: sound.artwork_url || "/cd.png"
                };
              }
              return prevInfo;
            });
            cachedDuration.current = null;
          }
        });
      }
    });
  }, [startProgressTracking, stopProgressTracking]);

  const handleHover = useCallback(() => {
    // Preload on hover (silent - no state change)
    if (playerState === 'idle') {
      setPlayerState('preloading');
      initializeWidget(false).catch(error => {
        console.error('Failed to preload music player:', error);
        setPlayerState('idle'); // Reset on error
      });
    }
  }, [playerState, initializeWidget]);

  const skipToNextSong = useCallback(() => {
    if (widgetRef.current && (playerState === 'playing' || playerState === 'muted' || playerState === 'ready')) {
      try {
        widgetRef.current.next();
        // Reset progress since we're on a new track
        setProgress(0);
        cachedDuration.current = null;
        
        // If music was playing, keep it playing; if paused, stay paused
        if (playerState === 'playing' || playerState === 'muted') {
          setTimeout(() => {
            if (widgetRef.current) {
              if (playerState === 'muted') {
                widgetRef.current.pause();
              } else {
                widgetRef.current.setVolume(25);
              }
            }
          }, 100);
        }
      } catch (error) {
        console.error('Failed to skip to next song:', error);
      }
    }
  }, [playerState]);

  const handleSingleClick = useCallback(() => {
    switch (playerState) {
      case 'idle':
        // First click without hover - show loading and initialize
        setPlayerState('loading');
        
        // Set a timeout to prevent infinite loading
        loadingTimeoutRef.current = setTimeout(() => {
          setPlayerState(prevState => {
            if (prevState === 'loading') {
              console.warn('Loading timeout - resetting to idle');
              return 'idle';
            }
            return prevState;
          });
        }, 15000); // 15 second timeout
        
        initializeWidget(true).catch(error => {
          console.error('Failed to initialize music player:', error);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setPlayerState('idle');
        });
        break;
        
      case 'preloading':
        // Clicked while preloading - show loading state and ensure auto-play
        setPlayerState('loading');
        // Widget is already initializing, just wait for it to complete and auto-play
        break;
        
      case 'loading':
        // Already loading - double-click means user really wants to play
        // Do nothing, but ensure we'll auto-play when ready
        break;
        
      case 'ready':
        // Track is ready - play it
        if (widgetRef.current) {
          widgetRef.current.setVolume(25); // Set volume before playing
          widgetRef.current.play();
          // Set volume again after play to ensure it sticks
          setTimeout(() => {
            if (widgetRef.current) {
              widgetRef.current.setVolume(25);
            }
          }, 100);
          setPlayerState('playing'); // Always start in playing state
        }
        break;
        
      case 'playing':
        // Currently playing - pause
        if (widgetRef.current) {
          widgetRef.current.pause();
          setIsMuted(true);
          setPlayerState('muted');
        }
        break;

      case 'muted':
        // Currently paused - resume
        if (widgetRef.current) {
          widgetRef.current.setVolume(25);
          widgetRef.current.play();
          setIsMuted(false);
          setPlayerState('playing');
        }
        break;
    }
  }, [playerState, initializeWidget]);

  const handleCDClick = useCallback(() => {
    clickCountRef.current += 1;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single click - handle normal play/mute logic
        handleSingleClick();
      } else if (clickCountRef.current === 2) {
        // Double click - skip to next song
        skipToNextSong();
      }
      
      // Reset click count
      clickCountRef.current = 0;
      clickTimeoutRef.current = null;
    }, 300); // 300ms delay to detect double clicks
  }, [handleSingleClick, skipToNextSong]);

  return (
    <>
      {/* Hidden SoundCloud iframe - loaded dynamically 
          Note: allow-scripts + allow-same-origin needed for SoundCloud widget to:
          - Access cookies for user settings
          - Initialize properly with SoundCloud API
          - Function as embedded music player
          This is safe as it's a trusted SoundCloud domain with limited scope */}
      <iframe
        id="soundcloud-iframe"
        className="music-player-iframe"
        allow="autoplay; encrypted-media"
        title="SoundCloud music player"
      />
      
      <div 
        className={`flex h-10 items-center gap-1 bg-glass backdrop-blur-[20px] rounded-full px-1 pr-3 py-2 cursor-pointer transition-all duration-150 hover:bg-glass-bg-hover active:bg-glass-bg-hover w-30 ${className}`} 
        onClick={handleCDClick}
        onMouseEnter={handleHover}
      >
        <SpinningCD
          artwork={trackInfo.artwork}
          isPlaying={isPlaying && !isMuted}
          className="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0 space-y-1">
          <ScrollingTitle 
            title={displayTitle}
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