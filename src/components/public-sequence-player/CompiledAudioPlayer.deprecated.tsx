'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { Volume2, VolumeX, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type {
  PlayerInterval,
  PlayerChannel,
  CompiledChannel,
  PlayerProps,
  CompilationStatus,
  PlayerBaseInterval,
  PlayerOverlayInterval
} from '@/types/player';

// Type guard for overlay intervals
function isOverlayInterval(interval: PlayerBaseInterval | PlayerOverlayInterval): interval is PlayerOverlayInterval {
  return interval.type === 'overlay';
}

// Helper function to get proxied audio URL
function getAudioUrl(url: string): string {
  if (url.includes('utfs.io/f/') || url.includes('ufs.sh/f/')) {
    return `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Get supported audio MIME type
function getSupportedMimeType(): string {
  const mimeTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/mpeg'
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return 'audio/mpeg'; // fallback
}

// Get audio format from MIME type
function getAudioFormatFromMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'mp3'; // fallback
}

// Add AudioContext type definition
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Helper function to compute start time for base intervals
function computeBaseIntervalStartTime(channel: PlayerChannel, interval: PlayerBaseInterval): number {
  if (interval.type !== 'base') return 0;
  return channel.intervals
    .slice(0, channel.intervals.indexOf(interval))
    .reduce((sum, int) => sum + int.duration, 0);
}

// Helper function to get interval start time
function getIntervalStartTime(channel: PlayerChannel, interval: PlayerInterval): number {
  if (isOverlayInterval(interval)) {
    return interval.startTime;
  }
  return computeBaseIntervalStartTime(channel, interval as PlayerBaseInterval);
}

async function compileChannelAudio(
  channel: PlayerChannel,
  onProgress: (progress: number) => void
): Promise<CompiledChannel> {
  try {
    const mimeType = getSupportedMimeType();
    const format = getAudioFormatFromMime(mimeType);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Compute start times for intervals
    const intervalsWithStartTime = channel.intervals.map((interval) => ({
      ...interval,
      startTime: interval.type === 'overlay'
        ? interval.startTime
        : computeBaseIntervalStartTime(channel, interval as PlayerBaseInterval)
    }));

    const totalIntervals = intervalsWithStartTime.length;

    const audioBuffers = await Promise.all(
      intervalsWithStartTime.map(async (interval, index) => {
        // Get the written label from the interval.
        const intervalLabel = interval.label || 'Unknown label';

        // Use the audioFile field if present, otherwise try the style.audioFile field.
        const fileUrl = interval.audioFile || '';
        if (!fileUrl) {
          console.warn(
            `No audio file found for interval:\n${JSON.stringify(interval, null, 2)}\nCreating silent buffer.`
          );
          const sampleCount = Math.ceil(audioContext.sampleRate * (interval.duration / 1000));
          const emptyBuffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
          onProgress(((index + 1) / totalIntervals) * 100);
          return { buffer: emptyBuffer, interval };
        }

        let retries = 3;
        let lastError: any = null;
        while (retries > 0) {
          try {
            console.log(
              `Loading audio for interval ${index + 1}/${totalIntervals} (attempt ${4 - retries}):`,
              {
                id: interval.id,
                label: intervalLabel,
                resolvedAudioFile: fileUrl,
                fullInterval: interval
              }
            );

            const audioUrl = getAudioUrl(fileUrl);
            const response = await fetch(audioUrl);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log(
              `Successfully loaded audio for interval ${interval.id} (${intervalLabel})`,
              {
                fullInterval: interval,
                audioFile: fileUrl
              }
            );
            onProgress(((index + 1) / totalIntervals) * 100);
            return { buffer: decodedBuffer, interval };
          } catch (error) {
            lastError = error;
            console.error(
              `Attempt ${4 - retries} failed for interval ${interval.id} (${intervalLabel}):`,
              {
                fullInterval: interval,
                resolvedAudioFile: fileUrl,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined
              }
            );
            retries--;
            if (retries > 0) {
              // Wait one second before retrying.
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        // All attempts failed; use the silent fallback.
        console.error(
          `All attempts failed for interval ${interval.id} (${intervalLabel}). Using silent fallback.`,
          { lastError, fullInterval: interval }
        );
        const sampleCount = Math.ceil(audioContext.sampleRate * (interval.duration / 1000));
        const emptyBuffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
        onProgress(((index + 1) / totalIntervals) * 100);
        return { buffer: emptyBuffer, interval };
      })
    );

    // Calculate total duration
    const totalDuration = channel.intervals.reduce(
      (sum, interval) => sum + interval.duration,
      0
    );

    // Create output buffer
    const outputBuffer = audioContext.createBuffer(
      2, // stereo
      audioContext.sampleRate * (totalDuration / 1000),
      audioContext.sampleRate
    );

    // Mix all intervals into the output buffer
    audioBuffers.forEach(({ buffer, interval }) => {
      const startTime = getIntervalStartTime(channel, interval);
      
      const startSample = Math.floor(
        (startTime / 1000) * audioContext.sampleRate
      );

      // Copy samples to output buffer
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const inputData = buffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        
        for (let i = 0; i < inputData.length; i++) {
          if (startSample + i < outputData.length) {
            outputData[startSample + i] = inputData[i] * (interval.volume ?? 1);
          }
        }
      }
    });

    // Convert to compressed format
    const audioBlob = await convertBufferToCompressedBlob(outputBuffer, mimeType);

    return {
      type: channel.type,
      name: channel.name,
      audioBlob,
      format,
      intervals: channel.intervals.map(interval => ({
        interval,
        audioBlob
      })),
      volume: channel.volume
    };
  } catch (outerError) {
    console.error(`Error during compileChannelAudio for channel ${channel.name} (${channel.type}):`, {
      error: outerError instanceof Error ? outerError.message : outerError,
      stack: outerError instanceof Error ? outerError.stack : undefined
    });
    throw outerError;
  }
}

// Helper to convert AudioBuffer to compressed audio Blob
async function convertBufferToCompressedBlob(
  audioBuffer: AudioBuffer, 
  mimeType: string,
  bitrate: number = 128000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new audio context for the conversion
      const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });
      const mediaStreamDest = audioContext.createMediaStreamDestination();
      
      // Create and connect the source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(mediaStreamDest);
      
      // Create MediaRecorder with specified format
      const recorder = new MediaRecorder(mediaStreamDest.stream, {
        mimeType,
        audioBitsPerSecond: bitrate
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
        
        // Cleanup
        source.disconnect();
        audioContext.close();
      };
      
      recorder.onerror = (e) => {
        reject(e.error);
        
        // Cleanup
        source.disconnect();
        audioContext.close();
      };
      
      // Start recording and playback
      recorder.start();
      source.start(0);
      
      // Stop after the duration of the buffer
      setTimeout(() => {
        recorder.stop();
        source.stop();
      }, (audioBuffer.length / audioBuffer.sampleRate) * 1000);
      
    } catch (error) {
      reject(error);
    }
  });
}

// Cache service using browser's Cache API
const cacheService = {
  async getCachedAudio(sequenceId: string | number, channelType: string): Promise<{ blob: Blob, format: string } | null> {
    try {
      const cache = await caches.open('compiled-audio');
      const response = await cache.match(`${sequenceId}/${channelType}`);
      if (!response) return null;
      
      const blob = await response.blob();
      const format = response.headers.get('X-Audio-Format') || 'webm';
      
      return { blob, format };
    } catch (error) {
      console.error('Failed to get cached audio:', error);
      return null;
    }
  },

  async cacheAudio(sequenceId: string | number, channelType: string, audioBlob: Blob, format: string): Promise<void> {
    try {
      const cache = await caches.open('compiled-audio');
      const headers = new Headers({
        'Content-Type': audioBlob.type,
        'X-Audio-Format': format
      });
      await cache.put(
        `${sequenceId}/${channelType}`,
        new Response(audioBlob, { headers })
      );
    } catch (error) {
      console.error('Failed to cache audio:', error);
    }
  }
};

export function CompiledAudioPlayer({ channels, sequenceId, onTimeUpdate, onIntervalUpdate }: PlayerProps) {
  // State
  const [compiledChannels, setCompiledChannels] = useState<CompiledChannel[]>([]);
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>({
    isCompiling: false,
    progress: 0
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mutedChannels, setMutedChannels] = useState<Set<PlayerChannel['type']>>(new Set());
  const [editingInterval, setEditingInterval] = useState<{ channelType: string; intervalId: string } | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Refs
  const howlRefs = useRef<Map<PlayerChannel['type'], Howl>>(new Map());
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const rafRef = useRef<number | undefined>(undefined);

  // Calculate total duration from base channel
  const baseChannel = channels.find((c): c is PlayerChannel => c.type === 'base');
  const totalDuration = baseChannel?.intervals.reduce((sum: number, int: PlayerInterval) => sum + int.duration, 0) ?? 0;

  // Compile audio channels
  useEffect(() => {
    async function compileChannels() {
      setCompilationStatus({ isCompiling: true, progress: 0 });

      try {
        const compiled: CompiledChannel[] = [];

        for (const channel of channels) {
          // Try to get cached version first
          const cachedAudio = await cacheService.getCachedAudio(sequenceId, channel.type);
          
          if (cachedAudio) {
            compiled.push({
              type: channel.type,
              name: channel.name,
              audioBlob: cachedAudio.blob,
              format: cachedAudio.format,
              intervals: channel.intervals.map(interval => ({
                interval,
                audioBlob: cachedAudio.blob
              })),
              volume: channel.volume
            });
            continue;
          }

          // Compile if not cached
          const compiledChannel = await compileChannelAudio(
            channel,
            (progress) => setCompilationStatus(prev => ({
              ...prev,
              progress: (prev.progress + progress) / channels.length
            }))
          );

          // Cache the compiled audio
          await cacheService.cacheAudio(
            sequenceId,
            channel.type,
            compiledChannel.audioBlob,
            compiledChannel.format
          );

          compiled.push(compiledChannel);
        }

        setCompiledChannels(compiled);
        setCompilationStatus({ isCompiling: false, progress: 100 });

      } catch (error) {
        console.error('Error compiling audio:', error);
        setCompilationStatus({
          isCompiling: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Failed to compile audio'
        });
      }
    }

    compileChannels();

    return () => {
      // Cleanup Howl instances
      howlRefs.current.forEach(howl => howl.unload());
      howlRefs.current.clear();
    };
  }, [channels, sequenceId]);

  // Initialize audio context on first user interaction
  const initializeAudio = useCallback(() => {
    if (audioInitialized || compilationStatus.isCompiling || compilationStatus.error) return;

    // Create a silent audio context to unlock audio
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(0);
    oscillator.stop(0.001);

    let loadedCount = 0;
    const totalChannels = compiledChannels.length;

    // Cleanup previous instances and blob URLs
    howlRefs.current.forEach(howl => howl.unload());
    howlRefs.current.clear();
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();

    setAudioLoaded(false);

    compiledChannels.forEach(channel => {
      const blobUrl = URL.createObjectURL(channel.audioBlob);
      blobUrlsRef.current.set(channel.type, blobUrl);
      
      const howl = new Howl({
        src: [blobUrl],
        format: [channel.format],
        html5: true,
        preload: true,
        volume: mutedChannels.has(channel.type) ? 0 : channel.volume,
        onload: () => {
          loadedCount++;
          if (loadedCount === totalChannels) {
            setAudioLoaded(true);
          }
        },
        onloaderror: (id, error) => {
          console.error(`Failed to load audio for channel ${channel.type}:`, error);
          setCompilationStatus(prev => ({
            ...prev,
            error: `Failed to load audio for channel ${channel.name}`
          }));
        },
        onend: () => {
          if (currentTime >= totalDuration) {
            setIsPlaying(false);
          }
        },
        onplayerror: (id, error) => {
          console.error(`Playback error for channel ${channel.type}:`, error);
          // Try to recover from playback error
          const howl = howlRefs.current.get(channel.type);
          if (howl) {
            howl.once('unlock', () => {
              howl.play();
            });
          }
        }
      });

      howlRefs.current.set(channel.type, howl);
    });

    setAudioInitialized(true);
  }, [compiledChannels, compilationStatus, mutedChannels, currentTime, totalDuration, audioInitialized]);

  // Cleanup function
  useEffect(() => {
    return () => {
      howlRefs.current.forEach(howl => howl.unload());
      howlRefs.current.clear();
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
      setAudioInitialized(false);
      setAudioLoaded(false);
    };
  }, []);

  // Playback control
  const togglePlayback = useCallback(() => {
    if (!audioInitialized) {
      initializeAudio();
      return;
    }

    if (!audioLoaded) return;

    if (isPlaying) {
      howlRefs.current.forEach(howl => howl.pause());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      const startTime = currentTime / 1000; // Convert to seconds for Howler
      
      howlRefs.current.forEach(howl => {
        howl.seek(startTime);
        howl.play();
      });

      const startTimestamp = performance.now() - currentTime;
      
      function animate() {
        const now = performance.now();
        const newTime = Math.min(now - startTimestamp, totalDuration);
        
        setCurrentTime(newTime);
        onTimeUpdate?.(newTime);

        if (newTime < totalDuration) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTime, totalDuration, onTimeUpdate, audioLoaded, audioInitialized, initializeAudio]);

  // Handle seeking
  const handleSeek = useCallback((newTime: number) => {
    if (!audioLoaded) return;
    
    const seekTime = Math.min(Math.max(newTime, 0), totalDuration);
    const seekTimeInSeconds = seekTime / 1000;
    
    howlRefs.current.forEach(howl => {
      if (isPlaying) {
        howl.pause();
      }
      howl.seek(seekTimeInSeconds);
      if (isPlaying) {
        howl.play();
      }
    });

    setCurrentTime(seekTime);
    onTimeUpdate?.(seekTime);
  }, [totalDuration, isPlaying, audioLoaded]);

  // Handle mute toggle
  const handleMuteToggle = useCallback((channelType: PlayerChannel['type']) => {
    setMutedChannels(prev => {
      const newMuted = new Set(prev);
      const howl = howlRefs.current.get(channelType);
      const channel = channels.find(c => c.type === channelType);
      
      if (newMuted.has(channelType)) {
        newMuted.delete(channelType);
        if (howl && channel) {
          howl.volume(channel.volume ?? 1);
        }
      } else {
        newMuted.add(channelType);
        if (howl) {
          howl.volume(0);
        }
      }
      return newMuted;
    });
  }, [channels]);

  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateTotalDuration = useCallback((channels: PlayerChannel[]): number => {
    return channels.reduce((sum: number, channel: PlayerChannel) => {
      return Math.max(
        sum,
        channel.intervals.reduce((intervalSum: number, interval: PlayerInterval) => 
          Math.max(intervalSum, (interval.type === 'overlay' ? interval.startTime : 0) + interval.duration)
        , 0)
      );
    }, 0);
  }, []);

  // Handle edit completion
  const handleEditComplete = useCallback((
    channelType: string,
    intervalId: string,
    newName: string
  ) => {
    if (onIntervalUpdate) {
      onIntervalUpdate(channelType, intervalId, { name: newName });
    }
    setEditingInterval(null);
  }, [onIntervalUpdate]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingInterval && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingInterval]);

  if (compilationStatus.isCompiling) {
    return (
      <div className="w-full p-4 bg-gray-800 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2">
            Compiling Audio...
          </h3>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${compilationStatus.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">
            {Math.round(compilationStatus.progress)}% complete
          </p>
        </div>
      </div>
    );
  }

  if (compilationStatus.error) {
    return (
      <div className="w-full p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
        <p className="text-red-500">{compilationStatus.error}</p>
      </div>
    );
  }

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
          </div>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayback}
          className={`px-4 py-2 rounded-md text-white transition-colors
            ${!audioInitialized ? 'bg-blue-500 hover:bg-blue-600' :
              isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {!audioInitialized ? 'Initialize Audio' :
           isPlaying ? 'Pause' : 'Play'}
        </button>
        <div className="text-sm text-gray-300 space-x-2">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div 
          className="w-full h-24 bg-gray-800 rounded-lg overflow-hidden cursor-pointer relative"
          onClick={(e) => {
            if (editingInterval) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            handleSeek(pos * totalDuration);
          }}
        >
          {/* Channel Timelines */}
          {channels.map((channel, index) => (
            <div
              key={channel.type}
              className="absolute w-full h-8"
              style={{
                top: `${index * 24}px`,
                opacity: mutedChannels.has(channel.type) ? 0.5 : 1
              }}
            >
              {/* Intervals */}
              {channel.intervals.map((interval) => {
                const startTime = getIntervalStartTime(channel, interval);
                const startPercent = (startTime / totalDuration) * 100;
                const widthPercent = (interval.duration / totalDuration) * 100;
                const isEditing = editingInterval?.channelType === channel.type && 
                                editingInterval?.intervalId === interval.id;

                return (
                  <div
                    key={interval.id}
                    className="absolute h-full rounded group"
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: interval.color || '#4A5568',
                      opacity: 0.8
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative px-2 py-1 h-full flex items-center">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          className="w-full bg-transparent text-xs text-white border-b border-white/50 focus:outline-none focus:border-white"
                          defaultValue={interval.label}
                          onBlur={(e) => handleEditComplete(channel.type, interval.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditComplete(channel.type, interval.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingInterval(null);
                            }
                          }}
                        />
                      ) : (
                        <>
                          <span className="text-xs text-white truncate flex-1">
                            {interval.label}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 absolute right-1 p-1 hover:bg-white/10 rounded transition-opacity"
                            onClick={() => setEditingInterval({ channelType: channel.type, intervalId: interval.id })}
                          >
                            <Edit2 className="w-3 h-3 text-white/80" />
                          </button>
                        </>
                      )}
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
              left: `${(currentTime / totalDuration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>
    </div>
  );
} 