'use client';

import { useState, useEffect, useRef } from 'react';
import { BaseInterval, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG, COUNTDOWN_VOICES } from '@/lib/countdown-config';
import { toast } from '@/components/ui/use-toast';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { JsonEditor } from './JsonEditor';
import type { Sequence } from '@/components/channel-editor/ChannelEditor';

type IntervalEditorProps = {
  interval: BaseInterval | OverlayInterval;
  isBaseChannel: boolean;
  totalDuration: number;
  onUpdate: (updates: Partial<BaseInterval | OverlayInterval>) => void;
  sequenceId: string | number;
  sequence: Sequence;
  onSequenceUpdate: (sequence: Sequence) => void;
};

export function IntervalEditor({ 
  interval, 
  isBaseChannel, 
  totalDuration,
  onUpdate,
  sequenceId,
  sequence,
  onSequenceUpdate
}: IntervalEditorProps) {
  const isOverlay = !isBaseChannel;
  const overlayInterval = isOverlay ? interval as OverlayInterval : null;
  const { uploadAudio } = useAudioUpload();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM'); // Default to Rachel
  const [isTestingCountdown, setIsTestingCountdown] = useState(false);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [debugInfo, setDebugInfo] = useState<{
    lastGeneration?: {
      timestamp: string;
      text: string;
      duration: number;
      error?: string;
    };
  }>({});

  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const inputClasses = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-300";

  const hasAudio = Boolean(interval.audioFile);

  // Initialize countdown audio
  useEffect(() => {
    const voice = COUNTDOWN_VOICES.find(v => v.name === 'rachel') ?? 
                 COUNTDOWN_VOICES.find(v => v.name === COUNTDOWN_CONFIG.DEFAULT_VOICE)!;
                 
    const audio = new Audio();
    audio.src = `${voice.directory}/countdown.mp3`;
    audio.volume = COUNTDOWN_CONFIG.VOLUME;
    
    // Load the audio
    audio.load();
    
    // Wait for audio to be loaded
    audio.addEventListener('canplaythrough', () => {
      countdownAudioRef.current = audio;
    }, { once: true });

    audio.addEventListener('error', (e) => {
      console.error('Error loading countdown audio:', e);
      toast({
        title: 'Error',
        description: 'Failed to load countdown audio',
        variant: 'destructive',
      });
    }, { once: true });

    return () => {
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current.currentTime = 0;
        countdownAudioRef.current = null;
      }
    };
  }, []);

  const handleTestCountdown = () => {
    if (isTestingCountdown || !countdownAudioRef.current) {
      console.log('Cannot play countdown: ', {
        isTestingCountdown,
        hasAudio: Boolean(countdownAudioRef.current)
      });
      return;
    }
    
    setIsTestingCountdown(true);
    const audio = countdownAudioRef.current;
    
    const volume = interval.volume ?? 1;
    audio.volume = volume * COUNTDOWN_CONFIG.VOLUME;

    const playCountdown = async () => {
      try {
        audio.currentTime = 0;
        await audio.play();
        await new Promise(resolve => {
          audio.onended = resolve;
        });
      } catch (error) {
        console.error('Failed to play countdown:', error);
        toast({
          title: 'Error',
          description: 'Failed to play countdown audio',
          variant: 'destructive',
        });
      } finally {
        setIsTestingCountdown(false);
      }
    };

    playCountdown().catch(console.error);
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
  const handleGenerateAudio = async () => {
    if (!selectedVoice) {
      toast({
        title: 'Error',
        description: 'Please select a voice first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval: {
            id: interval.id,
            label: interval.label,
            text: interval.spokenLabel || interval.label
          },
          options: {
            voiceId: selectedVoice,
            voiceSettings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          },
          metadata: {
            sequenceId: sequenceId.toString(),
            sequenceName: isBaseChannel ? 'Base Channel' : interval.type,
            intervalId: interval.id,
            channelType: isBaseChannel ? 'base' : 'overlay',
          }
        }),
      });

      let errorData;
      let responseData;
      try {
        responseData = await response.json();
        if (!response.ok) {
          errorData = responseData;
          throw new Error(responseData.error || `Failed to generate audio: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        if (errorData) {
          throw new Error(errorData.error || 'Failed to generate audio');
        }
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      const { url } = responseData;
      onUpdate({ audioFile: url });

      setDebugInfo({
        lastGeneration: {
          timestamp: new Date().toISOString(),
          text: interval.spokenLabel || interval.label,
          duration: Date.now() - startTime,
        }
      });

      toast({
        title: 'Success',
        description: 'Audio generated successfully',
      });
    } catch (error) {
      console.error('Error generating audio:', error);
      
      // Extract the most useful error message
      let errorMessage = 'Failed to generate audio';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = (error as any).error || (error as any).message || JSON.stringify(error);
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
          {isOverlay ? (
            <input
              type="text"
              value={overlayInterval?.spokenLabel || ''}
              onChange={(e) => onUpdate({ spokenLabel: e.target.value || undefined })}
              className={inputClasses}
              placeholder="Leave empty to use written label for voice generation"
            />
          ) : (
            <input
              type="text"
              value=""
              disabled
              className={`${inputClasses} opacity-50`}
              placeholder="Spoken labels only available for overlay intervals"
            />
          )}
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
            value={interval.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className={`${inputClasses} h-10`}
          />
        </div>
        <div>
          <label className={labelClasses}>Volume</label>
          <input
            type="range"
            value={interval.volume ?? 1}
            onChange={(e) => onUpdate({ volume: Number(e.target.value) })}
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
              onClick={handleTestCountdown}
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
            <p>• {COUNTDOWN_CONFIG.DURATION / 1000} second countdown duration</p>
            <p>• Volume set to {Math.round(COUNTDOWN_CONFIG.VOLUME * 100)}% of main audio</p>
          </div>
        </div>
      )}

      {/* Audio File */}
      <div>
        <div className="flex items-center gap-4">
          <label className={labelClasses}>Audio</label>
          <div className="flex gap-2">
            {interval.audioFile ? (
              <>
                <button
                  onClick={() => onUpdate({ audioFile: '' })}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
                <button
                  onClick={() => {
                    // Check if this is already an UploadThing URL
                    if (!interval.audioFile) return;
                    
                    const url = interval.audioFile;
                    if (url.includes('ufs.sh/f/') || url.includes('utfs.io/f/')) {
                      // Already an UploadThing URL
                      toast({
                        title: 'Info',
                        description: 'This is already an UploadThing URL',
                      });
                      return;
                    }

                    // Extract just the filename
                    const filename = url.split('/').pop();
                    if (!filename) {
                      toast({
                        title: 'Error',
                        description: 'Invalid file path',
                        variant: 'destructive',
                      });
                      return;
                    }

                    // For now, just show a message that we need to re-upload
                    toast({
                      title: 'Action Required',
                      description: 'Please use the Generate button to upload this audio to UploadThing',
                      variant: 'destructive',
                    });
                  }}
                  className="text-xs text-blue-500 hover:text-blue-400"
                >
                  Check UploadThing URL
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateAudio}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded text-white text-sm transition-colors
                  ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            )}
          </div>
        </div>

        {interval.audioFile && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">
              {(interval.audioFile.includes('ufs.sh/f/') || interval.audioFile.includes('utfs.io/f/')) ? (
                <>
                  <span className="font-medium text-green-400">UploadThing URL</span>
                  <span className="mx-1">•</span>
                  <span>File: {interval.audioFile.split('/').pop()}</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-yellow-400">Local Path</span>
                  <span className="mx-1">•</span>
                  <span>Warning: This file needs to be uploaded to UploadThing</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 mb-2 break-all">
              {interval.audioFile}
            </div>
            <audio
              src={interval.audioFile}
              controls
              className="w-full"
            />
          </div>
        )}

        {isGenerating && (
          <div className="mt-2 text-sm text-gray-400">
            Will speak: "{interval.spokenLabel || interval.label}"
          </div>
        )}
      </div>

      {/* Audio Preview */}
      {interval.audioFile && (
        <div className="mt-4">
          <label className={labelClasses}>Audio Preview</label>
          <audio
            src={interval.audioFile}
            controls
            className="w-full mt-1"
          />
        </div>
      )}

      {/* Audio Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${interval.audioFile ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span className="text-xs text-gray-400">
          {interval.audioFile ? 'Audio Ready' : 'Needs Audio'}
        </span>
      </div>

      {/* Debug Info */}
      {debugInfo.lastGeneration && (
        <div className="mt-4 text-xs text-gray-400">
          <div>Last Generation:</div>
          <div>Time: {debugInfo.lastGeneration.timestamp}</div>
          <div>Text: {debugInfo.lastGeneration.text}</div>
          <div>Duration: {debugInfo.lastGeneration.duration}ms</div>
          {debugInfo.lastGeneration.error && (
            <div className="text-red-400">Error: {debugInfo.lastGeneration.error}</div>
          )}
        </div>
      )}

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
            value={overlayInterval?.imageUrl ?? ''}
            onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            placeholder="Image URL"
            className={inputClasses}
          />
          <input
            type="text"
            value={overlayInterval?.imageAlt ?? ''}
            onChange={(e) => onUpdate({ imageAlt: e.target.value })}
            placeholder="Alt Text"
            className={inputClasses}
          />
          <input
            type="text"
            value={overlayInterval?.imageCaption ?? ''}
            onChange={(e) => onUpdate({ imageCaption: e.target.value })}
            placeholder="Caption"
            className={inputClasses}
          />
        </div>
      )}

      <JsonEditor 
        sequence={sequence}
        selectedInterval={interval}
        onSequenceUpdate={onSequenceUpdate}
        debugInfo={debugInfo}
      />
    </div>
  );
} 