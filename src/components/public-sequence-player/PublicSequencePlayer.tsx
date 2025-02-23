'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG, COUNTDOWN_VOICES } from '@/lib/countdown-config';

// Type guard for overlay intervals
function isOverlayInterval(interval: BaseInterval | OverlayInterval): interval is OverlayInterval {
  return interval.type === 'overlay';
}

type PublicSequencePlayerProps = {
  channels: Channel[];
  onTimeUpdate?: (currentTime: number) => void;
  countdownVoice?: string;
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

type LoadingStatus = {
  total: number;
  loaded: number;
  failed: number;
  errors: string[];
};

function LoadingStatusIndicator({ status }: { status: LoadingStatus }) {
  if (status.total === 0) return null;

  const progress = Math.round((status.loaded / status.total) * 100);
  const hasErrors = status.failed > 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${hasErrors ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {status.loaded}/{status.total}
        </span>
      </div>
      {hasErrors && (
        <div className="text-sm text-red-500">
          {status.failed} file(s) failed to load
          <ul className="mt-1 text-xs">
            {status.errors.map((error, i) => (
              <li key={i} className="truncate">{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getAudioUrl(url: string): string {
  // Check for both old and new UploadThing URL formats
  const isUploadThingUrl = url.includes('ufs.sh/f/') || url.includes('utfs.io/f/');
  if (!isUploadThingUrl) {
    console.log('Using direct URL:', url);
    return url;
  }

  const proxyUrl = `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  console.log('Using proxy for UploadThing URL:', {
    original: url,
    proxy: proxyUrl
  });
  return proxyUrl;
}

function getIntervalStartTime(channel: Channel, interval: BaseInterval | OverlayInterval): number {
  if (channel.type === 'base') {
    const baseChannel = channel as BaseChannel;
    const baseInterval = interval as BaseInterval;
    return baseChannel.intervals
      .slice(0, baseChannel.intervals.indexOf(baseInterval))
      .reduce((sum, int) => sum + int.duration, 0);
  } else {
    return (interval as OverlayInterval).startTime;
  }
}

export function PublicSequencePlayer({ 
  channels, 
  onTimeUpdate,
  countdownVoice = COUNTDOWN_CONFIG.DEFAULT_VOICE
}: PublicSequencePlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({ total: 0, loaded: 0, failed: 0, errors: [] });
  const audioTracksRef = useRef<AudioTrack[]>([]);
  const lastChannelsRef = useRef<Channel[] | undefined>(undefined);
  const scheduledAudioRef = useRef<ScheduledAudio[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  // Log initial mount
  useEffect(() => {
    console.log('PublicSequencePlayer mounted with channels:', {
      channelCount: channels.length,
      channels: channels.map(c => ({
        type: c.type,
        name: c.name,
        intervalCount: c.intervals.length,
        intervals: c.intervals.map(i => ({
          id: i.id,
          label: i.label,
          hasAudio: !!i.audioFile,
          audioUrl: i.audioFile
        }))
      }))
    });
  }, []);

  // Find base channel and calculate total duration
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base');
  const totalDuration = baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0;

  // Audio initialization effect
  useEffect(() => {
    if (!channelsChanged(lastChannelsRef.current, channels)) {
      console.log('Channels unchanged, skipping audio initialization', {
        currentTracks: audioTracksRef.current.length,
        lastChannels: lastChannelsRef.current?.map(c => c.type),
        newChannels: channels.map(c => c.type),
        timestamp: new Date().toISOString()
      });
      return;
    }
    lastChannelsRef.current = channels;

    let totalTracks = 0;
    let loadedTracks = 0;
    let failedTracks = 0;
    const errors: string[] = [];

    // Count total tracks first
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (interval.audioFile) {
          totalTracks++;
          console.log(`Found audio file for interval ${interval.id}:`, {
            audioFile: interval.audioFile,
            channel: channel.type,
            label: interval.label,
            startTime: isOverlayInterval(interval) ? interval.startTime : undefined,
            duration: interval.duration,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`No audio file for interval ${interval.id} in channel ${channel.type}`, {
            label: interval.label,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    console.log(`Found ${totalTracks} total audio tracks to load`);

    if (totalTracks === 0) {
      console.log('No audio tracks found in sequence');
      setLoadingStatus({ total: 0, loaded: 0, failed: 0, errors: [] });
      return;
    }

    // Clear existing tracks
    audioTracksRef.current.forEach(track => {
      console.log(`Clearing existing track: ${track.interval.id}`);
      track.audio.pause();
      track.audio.currentTime = 0;
    });
    audioTracksRef.current = [];

    // Load all audio files
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (!interval.audioFile) {
          return;
        }

        // Validate audio URL
        if (!interval.audioFile.startsWith('http')) {
          console.error(`Invalid audio URL for interval ${interval.id}:`, {
            url: interval.audioFile,
            channel: channel.type
          });
          failedTracks++;
          errors.push(`Invalid URL for ${interval.id}: ${interval.audioFile}`);
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
          return;
        }

        const audioUrl = getAudioUrl(interval.audioFile);
        console.log(`Starting to load audio for interval ${interval.id}:`, {
          originalUrl: interval.audioFile,
          proxyUrl: audioUrl,
          channel: channel.type,
          label: interval.label
        });

        const audio = new Audio();
        const startTime = getIntervalStartTime(channel, interval);

        const track: AudioTrack = {
          audio,
          channelType: channel.type,
          interval: {
            id: interval.id,
            startTime,
            duration: interval.duration,
            volume: interval.volume
          },
          channelVolume: channel.volume ?? 1,
          isLoaded: false
        };

        const handleLoad = () => {
          track.isLoaded = true;
          loadedTracks++;
          console.log(`Successfully loaded audio for interval ${interval.id}:`, {
            channel: channel.type,
            label: interval.label,
            duration: audio.duration,
            currentTime: audio.currentTime,
            readyState: audio.readyState,
            networkState: audio.networkState,
            url: interval.audioFile
          });
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
        };

        const handleError = (e: ErrorEvent) => {
          const error = e.currentTarget as HTMLAudioElement;
          console.error(`Failed to load audio for interval ${interval.id}:`, {
            error: error.error?.message || 'Unknown error',
            src: interval.audioFile,
            channel: channel.type,
            label: interval.label,
            networkState: error.networkState,
            readyState: error.readyState
          });
          track.error = `Failed to load audio: ${error.error?.message || 'Unknown error'}`;
          failedTracks++;
          errors.push(`Failed to load ${interval.id}: ${error.error?.message || 'Unknown error'}`);
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
        };

        audio.addEventListener('canplaythrough', handleLoad, { once: true });
        audio.addEventListener('error', handleError, { once: true });
        audio.addEventListener('loadstart', () => {
          console.log(`Audio loading started for interval ${interval.id}`, {
            label: interval.label,
            url: interval.audioFile
          });
        });
        audio.addEventListener('progress', () => {
          console.log(`Audio loading progress for interval ${interval.id}:`, {
            label: interval.label,
            readyState: audio.readyState,
            networkState: audio.networkState,
            buffered: audio.buffered.length > 0 ? {
              start: audio.buffered.start(0),
              end: audio.buffered.end(0)
            } : null
          });
        });

        audio.src = audioUrl;
        audio.volume = (interval.volume ?? 1) * (channel.volume ?? 1);
        
        audioTracksRef.current.push(track);
      });
    });

    return () => {
      console.log('Cleaning up audio tracks');
      audioTracksRef.current.forEach(track => {
        track.audio.pause();
        track.audio.currentTime = 0;
      });
      audioTracksRef.current = [];
    };
  }, [channels]);

  // Player state
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStartTime, setViewportStartTime] = useState(0);
  
  // Refs for animation and audio
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Track muted state for each channel
  const [mutedChannels, setMutedChannels] = useState<Set<Channel['type']>>(new Set());

  // Calculate viewport and zoom settings
  const baseTimelineWidth = 1000;
  const viewportWidth = baseTimelineWidth;
  const totalTimelineWidth = baseTimelineWidth * zoomLevel;
  const visibleDuration = totalDuration / zoomLevel;
  const pxPerMs = totalTimelineWidth / totalDuration;

  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Memoize channels to prevent unnecessary reinitializations
  const channelsChanged = useCallback((prevChannels: Channel[] | undefined, nextChannels: Channel[]): boolean => {
    // Always initialize on first load
    if (!prevChannels) return true;
    
    if (prevChannels.length !== nextChannels.length) return true;
    
    for (let i = 0; i < prevChannels.length; i++) {
      const prev = prevChannels[i];
      const next = nextChannels[i];
      
      if (prev.type !== next.type || prev.intervals.length !== next.intervals.length) return true;
      
      for (let j = 0; j < prev.intervals.length; j++) {
        const prevInt = prev.intervals[j];
        const nextInt = next.intervals[j];
        if (prevInt.id !== nextInt.id || prevInt.audioFile !== nextInt.audioFile) return true;
      }
    }
    
    return false;
  }, []);

  // Initialize countdown audio
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const voice = COUNTDOWN_VOICES.find(v => v.name === countdownVoice) ?? 
                 COUNTDOWN_VOICES.find(v => v.name === COUNTDOWN_CONFIG.DEFAULT_VOICE)!;
                 
    const audio = new Audio(`${voice.directory}/countdown.mp3`);
    audio.volume = COUNTDOWN_CONFIG.VOLUME;
    countdownAudioRef.current = audio;

    return () => {
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current.currentTime = 0;
      }
    };
  }, [countdownVoice]);

  // Schedule audio playback
  const scheduleAudioPlayback = (startFromTime: number) => {
    console.log('Scheduling audio playback from time:', {
      startFromTime,
      totalTracks: audioTracksRef.current.length,
      scheduledTracks: scheduledAudioRef.current.length
    });

    // Clear existing scheduled audio
    scheduledAudioRef.current.forEach(scheduled => {
      console.log('Clearing scheduled audio:', {
        id: scheduled.id,
        channelType: scheduled.channelType
      });
      if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
      if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
      scheduled.audio.pause();
      scheduled.audio.currentTime = 0;
    });
    scheduledAudioRef.current = [];

    // Schedule base channel intervals
    const baseIntervals = baseChannel?.intervals ?? [];
    baseIntervals.forEach((interval, index) => {
      const intervalStart = baseIntervals
        .slice(0, index)
        .reduce((sum, int) => sum + int.duration, 0);

      if (index > 0 && intervalStart > startFromTime) {
        const countdownTime = intervalStart - COUNTDOWN_CONFIG.START_TIME;
        
        if (countdownTime > startFromTime && countdownAudioRef.current) {
          const delay = countdownTime - startFromTime;
          const audio = countdownAudioRef.current;

          console.log('Scheduling countdown audio:', {
            intervalId: interval.id,
            delay,
            countdownTime
          });

          const playTimeoutId = window.setTimeout(() => {
            audio.currentTime = 0;
            audio.play().catch(err => 
              console.error('Failed to play countdown:', err)
            );
          }, delay);

          scheduledAudioRef.current.push({
            id: `countdown-${interval.id}`,
            channelType: 'base',
            audio,
            startTime: countdownTime,
            duration: COUNTDOWN_CONFIG.DURATION,
            volume: COUNTDOWN_CONFIG.VOLUME,
            playTimeoutId,
            isCountdown: true
          });
        }
      }
    });

    // Schedule interval audio
    audioTracksRef.current.forEach(track => {
      if (!track.isLoaded) {
        console.log('Skipping unloaded track:', {
          id: track.interval.id,
          channelType: track.channelType
        });
        return;
      }

      const { startTime, duration } = track.interval;
      if (startTime + duration > startFromTime) {
        const delay = Math.max(0, startTime - startFromTime);
        
        console.log('Scheduling interval audio:', {
          id: track.interval.id,
          channelType: track.channelType,
          startTime,
          delay,
          duration,
          volume: track.audio.volume
        });

        const playTimeoutId = window.setTimeout(() => {
          console.log('Playing audio:', {
            id: track.interval.id,
            channelType: track.channelType,
            currentTime: track.audio.currentTime,
            volume: track.audio.volume
          });
          track.audio.currentTime = 0;
          const playPromise = track.audio.play();
          if (playPromise) {
            playPromise.catch(err => {
              console.error(`Failed to play audio for ${track.interval.id}:`, {
                error: err,
                audioState: {
                  currentTime: track.audio.currentTime,
                  volume: track.audio.volume,
                  readyState: track.audio.readyState,
                  paused: track.audio.paused
                }
              });
            });
          }
        }, delay);

        const stopDelay = delay + duration;
        const stopTimeoutId = window.setTimeout(() => {
          console.log('Stopping audio:', {
            id: track.interval.id,
            channelType: track.channelType
          });
          track.audio.pause();
          track.audio.currentTime = 0;
        }, stopDelay);

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
        console.log('Playback complete');
        setIsPlaying(false);
        setCurrentTime(totalDuration);
        return;
      }

      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
      rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    if (isPlaying) {
      console.log('Starting playback:', {
        currentTime,
        totalDuration,
        scheduledTracks: scheduledAudioRef.current.length
      });
      scheduleAudioPlayback(currentTime);
      rafRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      console.log('Pausing playback');
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      scheduledAudioRef.current.forEach(scheduled => {
        if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
        if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
        scheduled.audio.pause();
        scheduled.audio.currentTime = 0;
      });
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      scheduledAudioRef.current.forEach(scheduled => {
        if (scheduled.playTimeoutId) window.clearTimeout(scheduled.playTimeoutId);
        if (scheduled.stopTimeoutId) window.clearTimeout(scheduled.stopTimeoutId);
        scheduled.audio.pause();
        scheduled.audio.currentTime = 0;
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

  // Handle channel volume changes
  const updateChannelVolume = (channelType: Channel['type'], volume: number) => {
    audioTracksRef.current
      .filter(track => track.channelType === channelType)
      .forEach(track => {
        track.audio.volume = volume * (track.interval.volume ?? 1);
      });
  };

  // Handle mute toggle
  const handleMuteToggle = (channelType: Channel['type']) => {
    const newMutedChannels = new Set(mutedChannels);
    if (newMutedChannels.has(channelType)) {
      newMutedChannels.delete(channelType);
      const channel = channels.find(c => c.type === channelType);
      if (channel) {
        updateChannelVolume(channelType, channel.volume);
      }
    } else {
      newMutedChannels.add(channelType);
      updateChannelVolume(channelType, 0);
    }
    setMutedChannels(newMutedChannels);
  };

  return (
    <div className="relative w-full h-full">
      {/* Playback controls */}
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
      </div>

      {/* Channel timeline */}
      <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        {/* Scrubber */}
        <div className="relative flex">
          <div className="w-24 h-8 bg-gray-800 border-b border-r border-gray-700 shrink-0" />
          
          <div 
            className="h-8 border-b border-gray-700 flex-1 relative cursor-pointer bg-gray-800/50"
            onMouseDown={(e) => {
              setIsDragging(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              handleSeek(pos * totalDuration);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                handleSeek(pos * totalDuration);
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Time markers */}
            {Array.from({ length: Math.ceil(totalDuration / 10000) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-full flex items-end pb-1 pointer-events-none select-none"
                style={{ left: `${(i * 10000 / totalDuration) * 100}%` }}
              >
                <div className="h-3 border-l border-gray-500" />
                <span className="text-xs text-gray-400 ml-1 font-mono">
                  {formatTime(i * 10000)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="relative">
          {channels.map((channel) => (
            <div
              key={channel.type}
              className="relative h-12 border-b border-gray-700 bg-gray-900"
            >
              {/* Channel label with volume control */}
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 z-10 flex items-center px-2 border-r border-gray-700">
                <div className="flex flex-col w-full">
                  <span className="text-sm font-medium text-gray-300 truncate">
                    {channel.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={() => handleMuteToggle(channel.type)}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {mutedChannels.has(channel.type) ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.414l12.828-12.828M19.513 12c0-1.414-.434-2.725-1.174-3.814M15.51 8.084C15.827 8.671 16 9.32 16 10M4.487 12c0 2.21 1.398 4.566 3.536 5.657L12 20V4l-3.977 3.314" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12l-4-4H4V10h4l4-4z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      defaultValue={channel.volume}
                      onChange={(e) => updateChannelVolume(channel.type, Number(e.target.value))}
                      className="w-12 h-1 accent-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Intervals */}
              <div className="ml-24 relative h-full">
                {channel.intervals.map(interval => {
                  const startPosition = channel.type === 'base'
                    ? (channel as BaseChannel).intervals
                        .slice(0, (channel as BaseChannel).intervals.indexOf(interval as BaseInterval))
                        .reduce((sum, int) => sum + int.duration, 0)
                    : (interval as OverlayInterval).startTime;
                  
                  const isActive = currentTime >= startPosition && 
                                 currentTime < (startPosition + interval.duration);

                  return (
                    <div
                      key={interval.id}
                      className={`absolute top-1 bottom-1 rounded transition-opacity duration-200
                        ${isActive ? 'opacity-100' : 'opacity-50'}`}
                      style={{
                        left: `${(startPosition / totalDuration) * 100}%`,
                        width: `${(interval.duration / totalDuration) * 100}%`,
                        backgroundColor: interval.color + '40',
                        borderLeft: `2px solid ${interval.color}`
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

        {/* Playhead */}
        <div className="absolute top-0 bottom-0 left-24 right-0 pointer-events-none">
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50"
            style={{
              left: `${(currentTime / totalDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
          </div>
        </div>
      </div>
      <LoadingStatusIndicator status={loadingStatus} />
    </div>
  );
} 