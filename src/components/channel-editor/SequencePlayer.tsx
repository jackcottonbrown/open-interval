import { useEffect, useRef, useState, useCallback } from 'react';
import { Channel, BaseChannel, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG, VOICE_CONFIG } from '@/lib/countdown-config';

type SequencePlayerProps = {
  channels: Channel[];
  onTimeUpdate?: (currentTime: number) => void;
};

type AudioTrack = {
  audio: HTMLAudioElement;
  channelType: Channel['type'];
  interval: {
    id: string;
    startTime: number;
    duration: number;
    volume?: number;
  };
  channelVolume: number;
  isLoaded: boolean;
  error?: string;
};

type ScheduledAudio = {
  id: string;
  channelType: Channel['type'];
  audio: HTMLAudioElement;
  startTime: number;
  duration: number;
  volume: number;
  playTimeoutId?: number;
  stopTimeoutId?: number;
  isCountdown?: boolean;
};

export function SequencePlayer({ channels, onTimeUpdate }: SequencePlayerProps) {
  // Find base channel and calculate total duration
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base')!;
  const totalDuration = baseChannel.intervals.reduce((sum, int) => sum + int.duration, 0);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState({ loaded: 0, total: 0 });
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = default zoom, > 1 = zoomed in, < 1 = zoomed out
  const [viewportStartTime, setViewportStartTime] = useState(0); // Start time of visible area
  
  // Refs for animation and audio
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const audioTracksRef = useRef<AudioTrack[]>([]);
  const scheduledAudioRef = useRef<ScheduledAudio[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Calculate viewport and zoom settings
  const baseTimelineWidth = 1000; // px (base width before zoom)
  const viewportWidth = baseTimelineWidth;
  const totalTimelineWidth = baseTimelineWidth * zoomLevel;
  const visibleDuration = totalDuration / zoomLevel;
  const pxPerMs = totalTimelineWidth / totalDuration;

  // Update viewport when current time changes
  useEffect(() => {
    if (!isDragging) {
      // Keep playhead in view by adjusting viewport
      const playheadPosition = (currentTime / totalDuration) * totalTimelineWidth;
      const viewportEnd = viewportStartTime + visibleDuration;
      
      if (currentTime < viewportStartTime) {
        // Playhead is before viewport
        setViewportStartTime(Math.max(0, currentTime - visibleDuration * 0.1));
      } else if (currentTime > viewportEnd) {
        // Playhead is after viewport
        setViewportStartTime(Math.min(
          totalDuration - visibleDuration,
          currentTime - visibleDuration * 0.9
        ));
      }
    }
  }, [currentTime, isDragging, totalTimelineWidth, visibleDuration, totalDuration]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * (1 + delta * 0.1)));
    
    // Keep the time at the center of the viewport centered after zoom
    const viewportCenter = viewportStartTime + visibleDuration / 2;
    const newVisibleDuration = totalDuration / newZoomLevel;
    const newViewportStart = Math.max(0, Math.min(
      totalDuration - newVisibleDuration,
      viewportCenter - newVisibleDuration / 2
    ));

    setZoomLevel(newZoomLevel);
    setViewportStartTime(newViewportStart);
  };

  // Handle scroll
  const handleScroll = (delta: number) => {
    const scrollAmount = visibleDuration * 0.1 * delta;
    const newViewportStart = Math.max(0, Math.min(
      totalDuration - visibleDuration,
      viewportStartTime + scrollAmount
    ));
    setViewportStartTime(newViewportStart);
  };

  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Initialize audio tracks
  useEffect(() => {
    let totalTracks = 0;
    let loadedTracks = 0;

    console.log('Initializing audio tracks:', channels);

    // Clear existing tracks
    audioTracksRef.current.forEach(track => {
      track.audio.pause();
      track.audio.currentTime = 0;
    });
    audioTracksRef.current = [];

    // Load all audio files
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (!interval.style.audioFile) {
          return;
        }

        totalTracks++;
        const audio = new Audio();
        
        // Calculate start time based on channel type
        const startTime = channel.type === 'base'
          ? channel.intervals
              .slice(0, channel.intervals.indexOf(interval))
              .reduce((sum, int) => sum + int.duration, 0)
          : (interval as OverlayInterval).startTime;

        const track: AudioTrack = {
          audio,
          channelType: channel.type,
          interval: {
            id: interval.id,
            startTime,
            duration: interval.duration,
            volume: interval.style.volume
          },
          channelVolume: channel.volume ?? 1,
          isLoaded: false
        };

        // Set up audio loading
        audio.addEventListener('canplaythrough', () => {
          track.isLoaded = true;
          loadedTracks++;
          console.log('Audio loaded:', {
            id: interval.id,
            channel: channel.type,
            src: audio.src,
            duration: audio.duration
          });
          setLoadingStatus({ loaded: loadedTracks, total: totalTracks });
        });

        audio.addEventListener('error', (e) => {
          const error = e.currentTarget as HTMLAudioElement;
          track.error = `Failed to load audio: ${error.error?.message || 'Unknown error'}`;
          console.error('Audio loading error:', {
            id: interval.id,
            channel: channel.type,
            src: audio.src,
            error: track.error
          });
          loadedTracks++;
          setLoadingStatus({ loaded: loadedTracks, total: totalTracks });
        });

        // Ensure the audio file URL is absolute and starts with /audio/
        let audioUrl = interval.style.audioFile;
        if (!audioUrl.startsWith('/')) {
          audioUrl = `/${audioUrl}`;
        }
        if (!audioUrl.startsWith('/audio/')) {
          audioUrl = `/audio${audioUrl}`;
        }

        // Set source and volume
        audio.src = audioUrl;
        audio.volume = (interval.style.volume ?? 1) * (channel.volume ?? 1);
        
        console.log('Setting up audio track:', {
          id: interval.id,
          channel: channel.type,
          url: audioUrl,
          startTime,
          duration: interval.duration
        });
        
        audioTracksRef.current.push(track);
      });
    });

    setLoadingStatus({ loaded: 0, total: totalTracks });

    // Cleanup
    return () => {
      audioTracksRef.current.forEach(track => {
        track.audio.pause();
        track.audio.currentTime = 0;
      });
      audioTracksRef.current = [];
    };
  }, [channels]);

  // Initialize countdown audio
  const countdownAudioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Load countdown audio files
  useEffect(() => {
    const countdownPaths = {
      one: '/audio/countdown/rachel/one.mp3',
      two: '/audio/countdown/rachel/two.mp3',
      three: '/audio/countdown/rachel/three.mp3'
    };

    // Create audio elements for countdown
    Object.entries(countdownPaths).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.volume = COUNTDOWN_CONFIG.VOLUME;
      countdownAudioRef.current[key] = audio;
    });

    // Cleanup
    return () => {
      Object.values(countdownAudioRef.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  // Schedule audio playback (updated to include countdown)
  const scheduleAudioPlayback = (startFromTime: number) => {
    // Clear existing scheduled audio
    scheduledAudioRef.current.forEach(scheduled => {
      if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
      if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
      scheduled.audio.pause();
      scheduled.audio.currentTime = 0;
    });
    scheduledAudioRef.current = [];

    // Group tracks by start time for debugging
    const scheduledTimes = new Map<number, string[]>();

    // Schedule countdown audio for base channel transitions
    const baseIntervals = baseChannel.intervals;
    baseIntervals.forEach((interval, index) => {
      const intervalStart = baseIntervals
        .slice(0, index)
        .reduce((sum, int) => sum + int.duration, 0);

      if (index > 0 && intervalStart > startFromTime) {
        // Schedule countdown audio
        for (let i = COUNTDOWN_CONFIG.START_TIME / 1000; i > 0; i--) {
          const countdownTime = intervalStart - (i * COUNTDOWN_CONFIG.INTERVAL);
          
          if (countdownTime > startFromTime) {
            const delay = countdownTime - startFromTime;
            const countdownKey = i === 3 ? 'three' : i === 2 ? 'two' : 'one';
            const audio = countdownAudioRef.current[countdownKey];

            if (audio) {
              const playTimeoutId = window.setTimeout(() => {
                console.log(`Playing countdown ${i} before ${interval.label}`);
                audio.currentTime = 0;
                audio.play().catch(err => 
                  console.error(`Failed to play countdown ${i}:`, err)
                );
              }, delay);

              scheduledAudioRef.current.push({
                id: `countdown-${i}-${interval.id}`,
                channelType: 'base',
                audio,
                startTime: countdownTime,
                duration: COUNTDOWN_CONFIG.INTERVAL,
                volume: COUNTDOWN_CONFIG.VOLUME,
                playTimeoutId,
                isCountdown: true
              });

              if (!scheduledTimes.has(countdownTime)) {
                scheduledTimes.set(countdownTime, []);
              }
              scheduledTimes.get(countdownTime)!.push(`Countdown ${i}`);
            }
          }
        }
      }
    });

    // Schedule regular audio tracks
    audioTracksRef.current.forEach(track => {
      if (!track.isLoaded) return;

      const { startTime, duration } = track.interval;
      // Only schedule if the audio should play after our current position
      if (startTime + duration > startFromTime) {
        const delay = Math.max(0, startTime - startFromTime);
        
        // Schedule start of audio
        const playTimeoutId = window.setTimeout(() => {
          console.log(`Playing audio for ${track.interval.id} (${track.channelType}) at ${startTime}ms`);
          track.audio.currentTime = 0;
          track.audio.play().catch(err => 
            console.error(`Failed to play audio for ${track.interval.id}:`, err)
          );
        }, delay);

        // Schedule stop of audio
        const stopDelay = delay + duration;
        const stopTimeoutId = window.setTimeout(() => {
          console.log(`Stopping audio for ${track.interval.id} (${track.channelType}) at ${startTime + duration}ms`);
          track.audio.pause();
          track.audio.currentTime = 0;
        }, stopDelay);

        // Track scheduled audio for debugging
        if (!scheduledTimes.has(startTime)) {
          scheduledTimes.set(startTime, []);
        }
        scheduledTimes.get(startTime)!.push(`${track.interval.id} (${track.channelType})`);

        // Store scheduled audio info
        scheduledAudioRef.current.push({
          id: track.interval.id,
          channelType: track.channelType,
          audio: track.audio,
          startTime,
          duration,
          volume: track.audio.volume,
          playTimeoutId,
          stopTimeoutId
        });
      }
    });

    // Debug log to show overlapping audio
    console.log('Scheduled audio timeline:');
    Array.from(scheduledTimes.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([time, tracks]) => {
        console.log(`${formatTime(time)}: ${tracks.join(', ')}`);
      });
  };

  // Animation loop for playhead
  const animate = (timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const elapsed = timestamp - startTimeRef.current;
    const newTime = Math.min(currentTime + elapsed, totalDuration);

    // Stop at end of sequence
    if (newTime >= totalDuration) {
      setIsPlaying(false);
      setCurrentTime(totalDuration);
      startTimeRef.current = null;
      // Audio will stop automatically due to scheduled stops
      return;
    }

    setCurrentTime(newTime);
    onTimeUpdate?.(newTime);
    
    // Reset start time for next frame
    startTimeRef.current = timestamp;
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle play/pause
  useEffect(() => {
    let startTime = Date.now();
    let lastTime = currentTime;

    const updatePlayhead = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      startTime = now;

      const newTime = Math.min(lastTime + elapsed, totalDuration);
      lastTime = newTime;

      if (newTime >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(totalDuration);
        return;
      }

      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    if (isPlaying) {
      scheduleAudioPlayback(currentTime);
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Stop all audio
      scheduledAudioRef.current.forEach(scheduled => {
        if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
        if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
        scheduled.audio.pause();
        scheduled.audio.currentTime = 0;
      });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup scheduled audio
      scheduledAudioRef.current.forEach(scheduled => {
        if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
        if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
      });
    };
  }, [isPlaying]);

  // Handle seeking
  const handleSeek = (newTime: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalDuration));
    setCurrentTime(clampedTime);

    if (isPlaying) {
      scheduleAudioPlayback(clampedTime);
    }

    startTimeRef.current = null;
  };

  // Handle wheel events for zoom and scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + scroll
      e.preventDefault();
      const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * (1 + (e.deltaY > 0 ? -0.1 : 0.1))));
      
      // Keep the time at the center of the viewport centered after zoom
      const viewportCenter = viewportStartTime + visibleDuration / 2;
      const newVisibleDuration = totalDuration / newZoomLevel;
      const newViewportStart = Math.max(0, Math.min(
        totalDuration - newVisibleDuration,
        viewportCenter - newVisibleDuration / 2
      ));

      setZoomLevel(newZoomLevel);
      setViewportStartTime(newViewportStart);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll - move timeline viewport
      e.preventDefault();
      const scrollAmount = visibleDuration * 0.02 * (e.deltaX > 0 ? 1 : -1);
      const newViewportStart = Math.max(0, Math.min(
        totalDuration - visibleDuration,
        viewportStartTime + scrollAmount
      ));
      setViewportStartTime(newViewportStart);
    }
    // Let vertical scroll pass through for channel overflow
  }, [
    zoomLevel,
    viewportStartTime,
    visibleDuration,
    totalDuration
  ]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('wheel', handleWheel, { passive: false });
      return () => timeline.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Handle channel volume changes
  const updateChannelVolume = (channelType: Channel['type'], volume: number) => {
    // Update both scheduled and queued audio for this channel
    audioTracksRef.current
      .filter(track => track.channelType === channelType)
      .forEach(track => {
        track.audio.volume = volume * (track.interval.volume ?? 1);
      });
  };

  return (
    <div className="w-full">
      {/* Playback controls with zoom */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={loadingStatus.loaded < loadingStatus.total}
          className={`px-4 py-2 rounded-md text-white transition-colors flex items-center gap-2
            ${isPlaying 
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
              : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
            }
            ${loadingStatus.loaded < loadingStatus.total ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loadingStatus.loaded < loadingStatus.total ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading Audio ({loadingStatus.loaded}/{loadingStatus.total})
            </>
          ) : (
            isPlaying ? 'Pause' : 'Play'
          )}
        </button>
        <span className="text-sm text-gray-300 font-mono">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {/* Zoom controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => handleZoom(-1)}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-400">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => handleZoom(1)}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Channel timeline with integrated playhead */}
      <div 
        className="relative w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700"
        ref={timelineRef}
      >
        {/* Scrubber */}
        <div className="relative flex">
          {/* Empty space for alignment with channel labels */}
          <div className="w-24 h-8 bg-gray-800 border-b border-r border-gray-700 shrink-0" />
          
          {/* Scrubber timeline */}
          <div 
            ref={timelineRef}
            className="h-8 border-b border-gray-700 flex-1 relative cursor-pointer bg-gray-800/50 group overflow-hidden"
            onMouseDown={(e) => {
              setIsDragging(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              const time = viewportStartTime + pos * visibleDuration;
              handleSeek(time);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const time = viewportStartTime + pos * visibleDuration;
                handleSeek(time);
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Major time markers (every 10 seconds) */}
            {Array.from({ length: Math.ceil(visibleDuration / 10000) + 1 }).map((_, i) => {
              const markerTime = viewportStartTime + i * 10000;
              if (markerTime > totalDuration) return null;
              
              return (
                <div
                  key={i}
                  className="absolute h-full flex items-end pb-1 pointer-events-none select-none"
                  style={{ 
                    left: `${((markerTime - viewportStartTime) / visibleDuration) * 100}%`
                  }}
                >
                  <div className="h-3 border-l border-gray-500" />
                  <span className="text-xs text-gray-400 ml-1 font-mono">
                    {formatTime(markerTime)}
                  </span>
                </div>
              );
            })}
            
            {/* Minor time markers (every second) */}
            {Array.from({ length: Math.ceil(visibleDuration / 1000) + 1 }).map((_, i) => {
              const markerTime = viewportStartTime + i * 1000;
              if (markerTime > totalDuration) return null;
              
              return (
                <div
                  key={i}
                  className="absolute h-1/2 border-l border-gray-600 pointer-events-none"
                  style={{ 
                    left: `${((markerTime - viewportStartTime) / visibleDuration) * 100}%`
                  }}
                />
              );
            })}

            {/* Hover time indicator */}
            <div
              className="absolute top-0 h-full opacity-0 group-hover:opacity-100 pointer-events-none
                         transition-opacity bg-blue-500/10 w-px"
              style={{
                left: `${((currentTime - viewportStartTime) / visibleDuration) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
          </div>
        </div>

        {/* Channels */}
        <div className="relative min-w-[1000px] overflow-hidden">
          {channels.map((channel, channelIndex) => (
            <div
              key={channel.type}
              className="relative h-12 border-b border-gray-700 bg-gray-900"
            >
              {/* Channel label */}
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 z-10 flex items-center px-2 border-r border-gray-700">
                <span className="text-sm font-medium text-gray-300 truncate">
                  {channel.name}
                </span>
              </div>

              {/* Intervals */}
              <div className="ml-24 relative h-full">
                {channel.intervals.map(interval => {
                  const startPosition = channel.type === 'base'
                    ? channel.intervals
                        .slice(0, channel.intervals.indexOf(interval))
                        .reduce((sum, int) => sum + int.duration, 0)
                    : (interval as OverlayInterval).startTime;
                  
                  // Calculate visible position and width
                  const visibleStart = ((startPosition - viewportStartTime) / visibleDuration) * 100;
                  const visibleWidth = (interval.duration / visibleDuration) * 100;
                  
                  // Skip rendering if interval is completely outside viewport
                  if (visibleStart + visibleWidth < 0 || visibleStart > 100) return null;
                  
                  const isActive = currentTime >= startPosition && 
                                 currentTime < (startPosition + interval.duration);

                  return (
                    <div
                      key={interval.id}
                      className={`absolute top-1 bottom-1 rounded transition-opacity duration-200
                        ${isActive ? 'opacity-100' : 'opacity-50'}`}
                      style={{
                        left: `${visibleStart}%`,
                        width: `${visibleWidth}%`,
                        backgroundColor: interval.style.color + '40',
                        borderLeft: `2px solid ${interval.style.color}`
                      }}
                    >
                      <div className="px-2 h-full flex items-center">
                        <span className="text-xs text-white truncate">
                          {interval.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Full height playhead */}
        <div className="absolute top-0 bottom-0 left-24 right-0 pointer-events-none">
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50"
            style={{
              left: `${((currentTime - viewportStartTime) / visibleDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {/* Playhead handle in scrubber */}
            <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg
                          group-hover:scale-125 transition-transform" />
          </div>
        </div>
      </div>

      {/* Channel volume controls */}
      <div className="mt-4 space-y-2">
        {channels.map(channel => (
          <div key={channel.type} className="flex items-center gap-4">
            <span className="w-24 text-sm text-gray-300 truncate">{channel.name}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={channel.volume}
              onChange={(e) => {
                const newVolume = Number(e.target.value);
                updateChannelVolume(channel.type, newVolume);
              }}
              className="flex-1 accent-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
} 