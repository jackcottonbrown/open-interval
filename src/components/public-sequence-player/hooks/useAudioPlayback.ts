import { useEffect, useRef, useState, useCallback } from 'react';
import { Channel, BaseChannel } from '@/db/schema';
import { COUNTDOWN_CONFIG } from '@/lib/countdown-config';
import {
  AudioTrack,
  ScheduledAudio,
  getAudioUrl,
  getIntervalStartTime,
  createCountdownAudio,
  cleanupAudioTracks,
  cleanupScheduledAudio,
  updateChannelVolume as updateVolume
} from '../utils/audio';
import { channelsChanged } from '../utils/channel';

export type LoadingStatus = {
  total: number;
  loaded: number;
  failed: number;
  errors: string[];
};

export function useAudioPlayback(
  channels: Channel[],
  baseChannel: BaseChannel | undefined,
  countdownVoice: string
) {
  // State
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({ 
    total: 0, loaded: 0, failed: 0, errors: [] 
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mutedChannels, setMutedChannels] = useState<Set<Channel['type']>>(new Set());

  // Refs
  const audioTracksRef = useRef<AudioTrack[]>([]);
  const scheduledAudioRef = useRef<ScheduledAudio[]>([]);
  const lastChannelsRef = useRef<Channel[] | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize audio tracks
  useEffect(() => {
    console.log('Initializing audio tracks for channels:', channels);
    if (!channelsChanged(lastChannelsRef.current, channels)) {
      console.log('Channels have not changed, skipping initialization');
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
          console.log(`Found audio track ${totalTracks}:`, interval.audioFile);
        }
      });
    });

    console.log('Total tracks to load:', totalTracks);

    if (totalTracks === 0) {
      console.log('No audio tracks to load');
      setLoadingStatus({ total: 0, loaded: 0, failed: 0, errors: [] });
      return;
    }

    // Clear existing tracks
    cleanupAudioTracks(audioTracksRef.current);
    audioTracksRef.current = [];

    // Load all audio files
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (!interval.audioFile) return;

        console.log('Loading audio file:', {
          id: interval.id,
          url: interval.audioFile,
          channelType: channel.type,
          startTime: getIntervalStartTime(channel, interval),
          duration: interval.duration
        });

        if (!interval.audioFile.startsWith('http')) {
          console.error('Invalid URL format:', interval.audioFile);
          failedTracks++;
          errors.push(`Invalid URL for ${interval.id}: ${interval.audioFile}`);
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
          return;
        }

        const audio = new Audio();
        audio.preload = 'auto'; // Force preloading
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

        // Add loading event listeners
        const handleLoadStart = () => {
          console.log('Started loading audio:', interval.id);
        };

        const handleProgress = () => {
          console.log('Loading progress for:', interval.id);
        };

        const handleCanPlay = () => {
          console.log('Can play audio:', interval.id);
        };

        const handleCanPlayThrough = () => {
          console.log('Audio fully loaded:', interval.id);
          track.isLoaded = true;
          loadedTracks++;
          console.log(`Loaded ${loadedTracks}/${totalTracks} tracks`);
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
        };

        const handleError = (e: Event) => {
          const audio = e.target as HTMLAudioElement;
          const errorMessage = `Failed to load audio: ${audio.error?.message || 'Unknown error'}`;
          console.error('Audio load error:', {
            id: interval.id,
            error: errorMessage,
            src: audio.src
          });
          track.error = errorMessage;
          failedTracks++;
          errors.push(`Failed to load ${interval.id}: ${audio.error?.message || 'Unknown error'}`);
          setLoadingStatus({ total: totalTracks, loaded: loadedTracks, failed: failedTracks, errors });
        };

        // Add all event listeners
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('progress', handleProgress);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('error', handleError);
        
        // Set audio properties
        audio.crossOrigin = 'anonymous'; // Enable CORS
        audio.src = getAudioUrl(interval.audioFile);
        audio.volume = (interval.volume ?? 1) * (channel.volume ?? 1);
        
        // Force load
        audio.load();
        
        audioTracksRef.current.push(track);

        // Cleanup function for this specific audio element
        return () => {
          audio.removeEventListener('loadstart', handleLoadStart);
          audio.removeEventListener('progress', handleProgress);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('error', handleError);
        };
      });
    });

    return () => {
      cleanupAudioTracks(audioTracksRef.current);
      audioTracksRef.current = [];
    };
  }, [channels]);

  // Schedule audio playback
  const scheduleAudioPlayback = useCallback((startFromTime: number) => {
    cleanupScheduledAudio(scheduledAudioRef.current);
    scheduledAudioRef.current = [];

    // Schedule interval audio
    audioTracksRef.current.forEach(track => {
      if (!track.isLoaded) return;

      const { startTime, duration } = track.interval;
      if (startTime + duration > startFromTime) {
        const delay = Math.max(0, startTime - startFromTime);
        
        // Immediately play if we're within the interval
        if (startFromTime >= startTime && startFromTime < startTime + duration) {
          const offset = startFromTime - startTime;
          track.audio.currentTime = offset / 1000; // Convert to seconds
          track.audio.play().catch(err => {
            console.error(`Failed to play audio for ${track.interval.id}:`, err);
          });
        } else {
          const playTimeoutId = window.setTimeout(() => {
            track.audio.currentTime = 0;
            track.audio.play().catch(err => {
              console.error(`Failed to play audio for ${track.interval.id}:`, err);
            });
          }, delay);

          const stopDelay = delay + duration;
          const stopTimeoutId = window.setTimeout(() => {
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
      }
    });
  }, []);

  // Handle play/pause
  const togglePlayback = useCallback(() => {
    if (loadingStatus.loaded < loadingStatus.total) return;

    setIsPlaying(playing => {
      if (!playing) {
        // Start playback
        startTimeRef.current = Date.now();
        lastTimeRef.current = currentTime;
        scheduleAudioPlayback(currentTime);
      } else {
        // Pause playback
        cleanupScheduledAudio(scheduledAudioRef.current);
        scheduledAudioRef.current = [];
      }
      return !playing;
    });
  }, [loadingStatus, currentTime, scheduleAudioPlayback]);

  // Handle seeking
  const handleSeek = useCallback((newTime: number, totalDuration: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalDuration));
    setCurrentTime(clampedTime);
    lastTimeRef.current = clampedTime;

    if (isPlaying) {
      startTimeRef.current = Date.now();
      scheduleAudioPlayback(clampedTime);
    }
  }, [isPlaying, scheduleAudioPlayback]);

  // Handle channel volume changes
  const updateChannelVolume = useCallback((channelType: Channel['type'], volume: number) => {
    updateVolume(audioTracksRef.current, channelType, volume);
  }, []);

  // Handle mute toggle
  const handleMuteToggle = useCallback((channelType: Channel['type']) => {
    setMutedChannels(prev => {
      const newMutedChannels = new Set(prev);
      if (newMutedChannels.has(channelType)) {
        newMutedChannels.delete(channelType);
        const channel = channels.find(c => c.type === channelType);
        if (channel) {
          updateChannelVolume(channelType, channel.volume ?? 1);
        }
      } else {
        newMutedChannels.add(channelType);
        updateChannelVolume(channelType, 0);
      }
      return newMutedChannels;
    });
  }, [channels, updateChannelVolume]);

  // Playback animation effect
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      cleanupScheduledAudio(scheduledAudioRef.current);
      return;
    }

    const updatePlayhead = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const newTime = Math.min(lastTimeRef.current + elapsed, baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0);

      if (newTime >= (baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0)) {
        setIsPlaying(false);
        setCurrentTime(baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0);
        return;
      }

      setCurrentTime(newTime);
      rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    rafRef.current = requestAnimationFrame(updatePlayhead);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, baseChannel]);

  return {
    isPlaying,
    currentTime,
    loadingStatus,
    mutedChannels,
    togglePlayback,
    handleSeek,
    handleMuteToggle,
    updateChannelVolume
  };
} 