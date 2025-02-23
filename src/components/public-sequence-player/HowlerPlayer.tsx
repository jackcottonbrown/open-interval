'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';
import { Volume2, VolumeX } from 'lucide-react';

// Type guard for overlay intervals
function isOverlayInterval(interval: BaseInterval | OverlayInterval): interval is OverlayInterval {
  return interval.type === 'overlay';
}

// Helper function to get proxied audio URL
function getAudioUrl(url: string): string {
  // Check if this is an UploadThing URL
  if (url.includes('utfs.io/f/') || url.includes('ufs.sh/f/')) {
    // Use our proxy route
    return `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

type HowlerPlayerProps = {
  channels: Channel[];
  onTimeUpdate?: (currentTime: number) => void;
};

// Track state for each audio file
type AudioTrack = {
  id: string;
  howl: Howl;
  channelType: Channel['type'];
  startTime: number;
  duration: number;
  volume: number;
  isLoaded: boolean;
  error?: string;
};

// Playback state management
type PlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeTrackIds: Set<string>;
};

// Loading state management
type LoadingState = {
  total: number;
  loaded: number;
  failed: number;
  errors: string[];
};

export function HowlerPlayer({ channels, onTimeUpdate }: HowlerPlayerProps) {
  // State
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    activeTrackIds: new Set()
  });
  const [loadingState, setLoadingState] = useState<LoadingState>({
    total: 0,
    loaded: 0,
    failed: 0,
    errors: []
  });
  const [mutedChannels, setMutedChannels] = useState<Set<Channel['type']>>(new Set());

  // Refs
  const tracksRef = useRef<Map<string, AudioTrack>>(new Map());
  const rafRef = useRef<number | undefined>(undefined);

  // Calculate total duration from base channel
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base');
  const totalDuration = baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0;

  // Initialize audio tracks
  useEffect(() => {
    console.log('Initializing audio tracks');
    const tracks = new Map<string, AudioTrack>();
    let totalTracks = 0;
    let loadedTracks = 0;
    let failedTracks = 0;
    const errors: string[] = [];

    // Clean up existing tracks
    tracksRef.current.forEach(track => {
      track.howl.unload();
    });
    tracksRef.current.clear();

    // Create new tracks
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (!interval.audioFile) return;

        totalTracks++;
        const trackId = `${channel.type}-${interval.id}`;
        const startTime = isOverlayInterval(interval) 
          ? interval.startTime 
          : getBaseIntervalStartTime(channel as BaseChannel, interval as BaseInterval);

        // Get the proxied URL
        const audioUrl = getAudioUrl(interval.audioFile);
        console.log(`Loading audio for interval ${interval.id} from ${audioUrl}`);

        const howl = new Howl({
          src: [audioUrl],
          html5: true, // Enable streaming
          preload: true,
          format: ['mp3'], // Explicitly specify format
          volume: (interval.volume ?? 1) * (channel.volume ?? 1),
          onload: () => {
            console.log(`Loaded audio for interval ${interval.id}`);
            loadedTracks++;
            tracks.get(trackId)!.isLoaded = true;
            setLoadingState(prev => ({
              ...prev,
              loaded: loadedTracks
            }));
          },
          onloaderror: (id, error) => {
            console.error(`Failed to load audio for interval ${interval.id}:`, error);
            failedTracks++;
            const errorMessage = `Failed to load ${interval.id}: ${error}`;
            errors.push(errorMessage);
            if (tracks.has(trackId)) {
              tracks.get(trackId)!.error = errorMessage;
            }
            setLoadingState(prev => ({
              ...prev,
              failed: failedTracks,
              errors: [...prev.errors, errorMessage]
            }));
          }
        });

        tracks.set(trackId, {
          id: trackId,
          howl,
          channelType: channel.type,
          startTime,
          duration: interval.duration,
          volume: (interval.volume ?? 1) * (channel.volume ?? 1),
          isLoaded: false
        });
      });
    });

    // Update refs and state
    tracksRef.current = tracks;
    setLoadingState({
      total: totalTracks,
      loaded: loadedTracks,
      failed: failedTracks,
      errors
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up audio tracks');
      tracks.forEach(track => {
        track.howl.unload();
      });
    };
  }, [channels]);

  // Update playback
  const updatePlayback = useCallback((currentTime: number) => {
    const activeTrackIds = new Set<string>();

    tracksRef.current.forEach((track, trackId) => {
      if (!track.isLoaded) return;

      const isActive = currentTime >= track.startTime && 
                      currentTime < (track.startTime + track.duration);

      if (isActive) {
        activeTrackIds.add(trackId);
        if (!track.howl.playing()) {
          const seekTime = (currentTime - track.startTime) / 1000; // Convert to seconds
          track.howl.seek(seekTime);
          track.howl.play();
        }
      } else {
        if (track.howl.playing()) {
          track.howl.pause();
          if (currentTime < track.startTime) {
            track.howl.seek(0);
          }
        }
      }
    });

    setPlaybackState(prev => ({
      ...prev,
      currentTime,
      activeTrackIds
    }));
    onTimeUpdate?.(currentTime);
  }, [onTimeUpdate]);

  // Animation frame loop
  useEffect(() => {
    if (!playbackState.isPlaying) return;

    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      const newTime = Math.min(
        playbackState.currentTime + deltaTime,
        totalDuration
      );

      if (newTime >= totalDuration) {
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        return;
      }

      updatePlayback(newTime);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.currentTime, totalDuration, updatePlayback]);

  // Handle play/pause
  const togglePlayback = useCallback(() => {
    setPlaybackState(prev => {
      if (prev.isPlaying) {
        // Pause all active tracks
        prev.activeTrackIds.forEach(trackId => {
          const track = tracksRef.current.get(trackId);
          if (track?.howl.playing()) {
            track.howl.pause();
          }
        });
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  // Handle seeking
  const handleSeek = useCallback((newTime: number) => {
    const clampedTime = Math.min(Math.max(newTime, 0), totalDuration);
    updatePlayback(clampedTime);
  }, [totalDuration, updatePlayback]);

  // Handle volume changes
  const updateChannelVolume = useCallback((channelType: Channel['type'], volume: number) => {
    tracksRef.current.forEach(track => {
      if (track.channelType === channelType) {
        track.howl.volume(volume);
      }
    });
  }, []);

  // Handle mute toggle
  const handleMuteToggle = useCallback((channelType: Channel['type']) => {
    setMutedChannels(prev => {
      const newMuted = new Set(prev);
      if (newMuted.has(channelType)) {
        newMuted.delete(channelType);
        // Restore volume for all tracks in this channel
        tracksRef.current.forEach(track => {
          if (track.channelType === channelType) {
            track.howl.volume(track.volume);
          }
        });
      } else {
        newMuted.add(channelType);
        // Mute all tracks in this channel
        tracksRef.current.forEach(track => {
          if (track.channelType === channelType) {
            track.howl.volume(0);
          }
        });
      }
      return newMuted;
    });
  }, []);

  // Handle volume change
  const handleVolumeChange = useCallback((channelType: Channel['type'], volume: number) => {
    tracksRef.current.forEach(track => {
      if (track.channelType === channelType) {
        track.volume = volume;
        if (!mutedChannels.has(channelType)) {
          track.howl.volume(volume);
        }
      }
    });
  }, [mutedChannels]);

  // Helper function to get start time for base intervals
  function getBaseIntervalStartTime(channel: BaseChannel, interval: BaseInterval): number {
    return channel.intervals
      .slice(0, channel.intervals.indexOf(interval))
      .reduce((sum, int) => sum + int.duration, 0);
  }

  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Channel Controls */}
      <div className="grid gap-2">
        {channels.map(channel => (
          <div
            key={channel.type}
            className="flex items-center gap-4 p-2 bg-gray-700/50 rounded-lg"
          >
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={() => handleMuteToggle(channel.type)}
                className="p-1 hover:bg-gray-600 rounded"
              >
                {mutedChannels.has(channel.type) ? (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
              <span className="text-sm font-medium text-white">
                {channel.name}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={channel.volume}
              onChange={(e) => handleVolumeChange(channel.type, parseFloat(e.target.value))}
              className="w-24"
            />
          </div>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayback}
          disabled={loadingState.loaded < loadingState.total}
          className={`px-4 py-2 rounded-md text-white transition-colors
            ${playbackState.isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            ${loadingState.loaded < loadingState.total ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loadingState.loaded < loadingState.total ? (
            `Loading (${loadingState.loaded}/${loadingState.total})`
          ) : (
            playbackState.isPlaying ? 'Pause' : 'Play'
          )}
        </button>
        <div className="text-sm text-gray-300 space-x-2">
          <span>{formatTime(playbackState.currentTime)}</span>
          <span>/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Base Timeline */}
        <div 
          className="w-full h-24 bg-gray-800 rounded-lg overflow-hidden cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            handleSeek(pos * totalDuration);
          }}
        >
          {/* Channel Timelines */}
          {channels.map(channel => (
            <div
              key={channel.type}
              className="absolute w-full h-8"
              style={{
                top: `${channels.indexOf(channel) * 24}px`,
                opacity: mutedChannels.has(channel.type) ? 0.5 : 1
              }}
            >
              {/* Intervals */}
              {channel.intervals.map(interval => {
                const startPercent = isOverlayInterval(interval)
                  ? (interval.startTime / totalDuration) * 100
                  : (getBaseIntervalStartTime(channel as BaseChannel, interval as BaseInterval) / totalDuration) * 100;
                const widthPercent = (interval.duration / totalDuration) * 100;

                return (
                  <div
                    key={interval.id}
                    className="absolute h-full rounded"
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: interval.color || '#4A5568',
                      opacity: 0.8
                    }}
                  >
                    <div className="px-2 py-1 text-xs text-white truncate">
                      {interval.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{
              left: `${(playbackState.currentTime / totalDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>

      {/* Error Display */}
      {loadingState.failed > 0 && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-red-500">
            Failed to load {loadingState.failed} audio files:
          </h3>
          <ul className="mt-2 text-sm text-red-400 space-y-1">
            {loadingState.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 