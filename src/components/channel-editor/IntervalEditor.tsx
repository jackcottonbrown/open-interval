'use client';

import { useState, useEffect, useRef } from 'react';
import { BaseInterval, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG } from '@/lib/countdown-config';

type IntervalEditorProps = {
  interval: BaseInterval | OverlayInterval;
  isBaseChannel: boolean;
  totalDuration: number;
  onUpdate: (updates: Partial<BaseInterval | OverlayInterval>) => void;
};

export function IntervalEditor({ 
  interval, 
  isBaseChannel, 
  totalDuration,
  onUpdate 
}: IntervalEditorProps) {
  const isOverlay = !isBaseChannel;
  const overlayInterval = isOverlay ? interval as OverlayInterval : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM'); // Default to Rachel
  const [isTestingCountdown, setIsTestingCountdown] = useState(false);
  const countdownAudioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  const [debugInfo, setDebugInfo] = useState<{
    lastGeneration?: {
      timestamp: string;
      text: string;
      duration: number;
      error?: string;
    };
  }>({});

  const inputClasses = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-300";

  // Initialize countdown audio
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

    return () => {
      Object.values(countdownAudioRef.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  // Test countdown audio sequence
  const playTestCountdown = async () => {
    setIsTestingCountdown(true);
    const numbers = ['three', 'two', 'one'] as const;
    
    try {
      for (const number of numbers) {
        const audio = countdownAudioRef.current[number];
        if (audio) {
          audio.currentTime = 0;
          await audio.play();
          await new Promise(resolve => setTimeout(resolve, COUNTDOWN_CONFIG.INTERVAL));
        }
      }
    } catch (error) {
      console.error('Error playing countdown:', error);
    }
    
    setIsTestingCountdown(false);
  };

  // Get text that will be spoken
  const getSpokenText = () => {
    // First check for a custom spoken label
    if (isOverlay && overlayInterval?.spokenLabel) {
      return overlayInterval.spokenLabel;
    }
    // If no spoken label, use written label
    if (isOverlay && overlayInterval?.notes) {
      return `${interval.label}. ${overlayInterval.notes}`;
    }
    return interval.label;
  };

  // Generate audio for this interval
  const generateAudio = async () => {
    const text = getSpokenText();
    const startTime = Date.now();
    setIsGenerating(true);
    setDebugInfo(prev => ({
      ...prev,
      lastGeneration: {
        timestamp: new Date().toISOString(),
        text,
        duration: 0
      }
    }));

    try {
      console.log('Generating audio for:', {
        intervalId: interval.id,
        text,
        voice: selectedVoice,
        isOverlay,
        duration: interval.duration
      });

      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval,
          options: {
            voiceId: selectedVoice,
            voiceSettings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const { url } = await response.json();
      console.log('Audio generated successfully:', {
        intervalId: interval.id,
        url,
        duration: Date.now() - startTime
      });

      onUpdate({ 
        style: { 
          ...interval.style, 
          audioFile: url 
        } 
      });

      setDebugInfo(prev => ({
        ...prev,
        lastGeneration: {
          ...prev.lastGeneration!,
          duration: Date.now() - startTime
        }
      }));
    } catch (error) {
      console.error('Error generating audio:', error);
      setDebugInfo(prev => ({
        ...prev,
        lastGeneration: {
          ...prev.lastGeneration!,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      alert('Failed to generate audio. Please check the console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if we have all required audio
  const hasAudio = Boolean(interval.style.audioFile);
  const needsAudio = !hasAudio;

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClasses}>Written Label</label>
          <input
            type="text"
            value={interval.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className={inputClasses}
            placeholder="Label shown in the timeline"
          />
        </div>
        <div className="col-span-2">
          <label className={labelClasses}>
            <span className="flex items-center gap-2">
              Spoken Label
              <span className="text-xs text-gray-500">(for voice generation)</span>
            </span>
          </label>
          <input
            type="text"
            value={overlayInterval?.spokenLabel ?? ''}
            onChange={(e) => {
              if (isOverlay) {
                onUpdate({ spokenLabel: e.target.value || undefined });
              }
            }}
            className={inputClasses}
            placeholder="Leave empty to use written label for voice generation"
          />
          {isOverlay && overlayInterval?.spokenLabel && (
            <p className="mt-1 text-xs text-blue-400">
              Using custom pronunciation
            </p>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelClasses}>Duration (seconds)</label>
          <input
            type="number"
            value={interval.duration / 1000}
            onChange={(e) => onUpdate({ duration: Number(e.target.value) * 1000 })}
            min={0}
            max={totalDuration / 1000}
            className={inputClasses}
          />
        </div>
      </div>

      {/* Overlay-specific fields */}
      {isOverlay && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Start Time (seconds)</label>
            <input
              type="number"
              value={overlayInterval!.startTime / 1000}
              onChange={(e) => onUpdate({ startTime: Number(e.target.value) * 1000 })}
              min={0}
              max={totalDuration / 1000}
              className={inputClasses}
            />
          </div>
        </div>
      )}

      {/* Style */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>Color</label>
          <input
            type="color"
            value={interval.style.color}
            onChange={(e) => onUpdate({ style: { ...interval.style, color: e.target.value } })}
            className="mt-1 block w-full h-10 rounded-md bg-gray-700 border-gray-600"
          />
        </div>
        <div>
          <label className={labelClasses}>Volume</label>
          <input
            type="range"
            value={interval.style.volume ?? 1}
            onChange={(e) => onUpdate({ style: { ...interval.style, volume: Number(e.target.value) } })}
            min={0}
            max={1}
            step={0.1}
            className="mt-1 block w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Countdown Info (for base intervals) */}
      {isBaseChannel && (
        <div className="space-y-2 border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <label className={labelClasses}>Countdown Audio</label>
            <button
              onClick={playTestCountdown}
              disabled={isTestingCountdown}
              className={`px-3 py-1.5 rounded text-white text-sm transition-colors
                ${isTestingCountdown
                  ? 'bg-blue-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                }`}
            >
              <span className="flex items-center gap-2">
                {isTestingCountdown ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Playing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test Countdown
                  </>
                )}
              </span>
            </button>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• Countdown starts {COUNTDOWN_CONFIG.START_TIME / 1000} seconds before interval</p>
            <p>• {COUNTDOWN_CONFIG.INTERVAL / 1000} second between numbers</p>
            <p>• Volume set to {Math.round(COUNTDOWN_CONFIG.VOLUME * 100)}% of main audio</p>
          </div>
        </div>
      )}

      {/* Audio Generation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelClasses}>Audio</label>
          <div className="flex items-center gap-2">
            {hasAudio ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Audio Ready
              </span>
            ) : (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Needs Audio
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className={`${inputClasses} text-sm`}
            disabled={isGenerating}
          >
            <option value="21m00Tcm4TlvDq8ikWAM">Rachel (English - US)</option>
            <option value="AZnzlk1XvdvUeBnXmlld">Domi (English - US)</option>
            <option value="EXAVITQu4vr4xnSDxMaL">Bella (English - US)</option>
            <option value="ErXwobaYiN019PkySvjV">Antoni (English - US)</option>
          </select>

          <button
            onClick={generateAudio}
            disabled={isGenerating}
            className={`px-3 py-1.5 rounded text-white text-sm transition-colors
              ${isGenerating
                ? 'bg-blue-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Generate Audio
                </>
              )}
            </span>
          </button>
        </div>

        {hasAudio && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <audio src={interval.style.audioFile} controls className="h-8 w-48" />
          </div>
        )}

        <div className="text-xs text-gray-400 mt-1">
          Will speak: "{getSpokenText()}"
        </div>

        {/* Debug Info */}
        {debugInfo.lastGeneration && (
          <div className="mt-4 p-3 bg-gray-900 rounded-md text-xs font-mono">
            <div className="text-gray-400">Last Generation:</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              <div className="text-gray-500">Timestamp:</div>
              <div className="text-gray-300">{new Date(debugInfo.lastGeneration.timestamp).toLocaleString()}</div>
              
              <div className="text-gray-500">Text:</div>
              <div className="text-gray-300">{debugInfo.lastGeneration.text}</div>
              
              <div className="text-gray-500">Duration:</div>
              <div className="text-gray-300">
                {debugInfo.lastGeneration.duration ? 
                  `${debugInfo.lastGeneration.duration}ms` : 
                  'In progress...'}
              </div>

              {debugInfo.lastGeneration.error && (
                <>
                  <div className="text-gray-500">Error:</div>
                  <div className="text-red-400">{debugInfo.lastGeneration.error}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes (for overlay intervals) */}
      {isOverlay && (
        <div>
          <label className={labelClasses}>Notes</label>
          <textarea
            value={overlayInterval?.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
            className={inputClasses}
          />
        </div>
      )}

      {/* Media (for overlay intervals) */}
      {isOverlay && (
        <div className="space-y-2">
          <label className={labelClasses}>Media</label>
          <input
            type="text"
            value={overlayInterval?.media?.imageUrl ?? ''}
            onChange={(e) => onUpdate({ 
              media: { 
                ...overlayInterval?.media,
                imageUrl: e.target.value 
              } 
            })}
            placeholder="Image URL"
            className={inputClasses}
          />
          <input
            type="text"
            value={overlayInterval?.media?.imageAlt ?? ''}
            onChange={(e) => onUpdate({ 
              media: { 
                ...overlayInterval?.media,
                imageAlt: e.target.value 
              } 
            })}
            placeholder="Alt Text"
            className={inputClasses}
          />
          <input
            type="text"
            value={overlayInterval?.media?.caption ?? ''}
            onChange={(e) => onUpdate({ 
              media: { 
                ...overlayInterval?.media,
                caption: e.target.value 
              } 
            })}
            placeholder="Caption"
            className={inputClasses}
          />
        </div>
      )}
    </div>
  );
} 