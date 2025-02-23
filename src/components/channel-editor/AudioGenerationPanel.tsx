'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';

type AudioGenerationStatus = {
  status: 'idle' | 'generating' | 'uploading' | 'complete' | 'error';
  progress: number;
  audioData?: string;  // base64 audio data
  error?: string;
};

type QueuedInterval = {
  interval: BaseInterval | OverlayInterval;
  status: AudioGenerationStatus;
  sequenceId: string | number;
  channelType: Channel['type'];
};

interface AudioGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onSequenceUpdate: (channels: Channel[]) => void;
  sequenceId: string | number;
}

// Add type guards at the top
function isBaseChannel(channel: Channel): channel is BaseChannel {
  return channel.type === 'base';
}

function isOverlayChannel(channel: Channel): channel is OverlayChannel {
  return channel.type === 'tutorial' || channel.type === 'encouragement' || channel.type === 'custom';
}

export function AudioGenerationPanel({ 
  isOpen,
  onClose,
  channels,
  onSequenceUpdate,
  sequenceId
}: AudioGenerationPanelProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [queue, setQueue] = useState<QueuedInterval[]>([]);
  const { uploadAudio } = useAudioUpload();
  const { toast } = useToast();
  const [status, setStatus] = useState<AudioGenerationStatus>({ status: 'idle', progress: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateAllAudio = useCallback(async () => {
    if (!selectedVoice) {
      toast({
        title: 'Error',
        description: 'Please select a voice first',
        variant: 'destructive',
      });
      return;
    }

    // Initialize queue with ALL intervals from ALL channels
    const queueItems: QueuedInterval[] = [];
    
    // Process each channel
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        queueItems.push({
          interval,
          status: { 
            status: 'idle' as const, 
            progress: 0,
            audioData: undefined // Remove initial audioFile to force generation
          },
          sequenceId,
          channelType: channel.type
        });
      });
    });

    // Set initial queue state
    setQueue(queueItems);

    // Process each interval
    for (let i = 0; i < queueItems.length; i++) {
      const queueItem = queueItems[i];
      
      try {
        // Update status to generating
        setQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: { status: 'generating' as const, progress: 0 } } : item
        ));

        // Get text to generate audio from
        const textToSpeak = queueItem.interval.spokenLabel || queueItem.interval.label;

        console.log(`Generating audio for interval: ${queueItem.interval.id} (${textToSpeak})`);

        // Generate audio and upload directly from server
        const response = await fetch('/api/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interval: {
              id: queueItem.interval.id,
              label: textToSpeak
            },
            options: {
              voiceId: selectedVoice,
              voiceSettings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
              }
            },
            metadata: {
              sequenceId: queueItem.sequenceId.toString(),
              sequenceName: queueItem.channelType,
              intervalId: queueItem.interval.id.toString(),
              channelType: queueItem.channelType
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Audio generation failed:', errorData);
          throw new Error(errorData.error || `Failed to generate audio: ${response.status} ${response.statusText}`);
        }

        const { url } = await response.json();
        console.log(`Generated audio URL for interval ${queueItem.interval.id}: ${url}`);

        // Update status to complete
        setQueue(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: { 
              status: 'complete' as const, 
              progress: 100,
              audioData: url 
            } 
          } : item
        ));

        // Update the channel with the new audio URL
        const updatedChannels = channels.map(channel => {
          if (channel.type === queueItem.channelType) {
            if (isBaseChannel(channel)) {
              return {
                ...channel,
                intervals: channel.intervals.map(interval => 
                  interval.id === queueItem.interval.id
                    ? { ...interval, audioFile: url, type: 'base' as const }
                    : interval
                )
              };
            } else if (isOverlayChannel(channel)) {
              return {
                ...channel,
                intervals: channel.intervals.map(interval =>
                  interval.id === queueItem.interval.id
                    ? { ...interval, audioFile: url, type: 'overlay' as const }
                    : interval
                )
              };
            }
          }
          return channel;
        });

        onSequenceUpdate(updatedChannels);

        toast({
          title: 'Success',
          description: `Generated audio for: ${queueItem.interval.label}`,
        });

      } catch (error) {
        console.error('Error processing interval:', error);
        setQueue(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: { 
              status: 'error' as const, 
              progress: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              audioData: queueItem.status.audioData
            } 
          } : item
        ));
        
        toast({
          title: 'Error',
          description: `Failed to process interval: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    }
  }, [selectedVoice, channels, onSequenceUpdate, toast, sequenceId]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base');
    if (!baseChannel) {
      toast({
        title: 'Error',
        description: 'No base channel found',
        variant: 'destructive',
      });
      return;
    }

    setStatus({ status: 'uploading' as const, progress: 0 });
    
    try {
      const url = await uploadAudio(file, {
        sequenceId: baseChannel.name,
        sequenceName: baseChannel.name,
        intervalId: queue[0]?.interval.id || '',
        channelType: baseChannel.type
      });

      const updatedQueue = [...queue];
      if (updatedQueue[0]) {
        updatedQueue[0].status = {
          status: 'complete' as const,
          progress: 100,
          audioData: url
        };
      }
      setQueue(updatedQueue);
      setStatus({ status: 'complete' as const, progress: 100 });
      toast({
        title: 'Upload complete',
        description: 'Audio file has been uploaded successfully.'
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus({ 
        status: 'error' as const,
        progress: 0,
        error: 'Failed to upload audio file'
      });
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading the audio file.',
        variant: 'destructive'
      });
    }
  }, [channels, queue, uploadAudio, toast]);

  // Add migration helper function
  const handleFixJsonFormat = useCallback(() => {
    try {
      // Update all channels to match the new schema
      const updatedChannels = channels.map(channel => {
        const updatedIntervals = channel.intervals.map(interval => {
          // Extract style properties from the interval
          const { style, ...rest } = interval as any;
          
          // If interval has a style object, move audioFile to top level
          if (style?.audioFile) {
            return {
              ...rest,
              audioFile: style.audioFile,
              type: channel.type === 'base' ? 'base' as const : 'overlay' as const
            };
          }
          
          // If no style object, just ensure type is set
          return {
            ...interval,
            type: channel.type === 'base' ? 'base' as const : 'overlay' as const
          };
        });

        return {
          ...channel,
          intervals: updatedIntervals
        };
      });

      onSequenceUpdate(updatedChannels);
      toast({
        title: 'Success',
        description: 'JSON format has been updated to match the current schema',
      });
    } catch (error) {
      console.error('Error fixing JSON format:', error);
      toast({
        title: 'Error',
        description: 'Failed to update JSON format',
        variant: 'destructive',
      });
    }
  }, [channels, onSequenceUpdate, toast]);

  if (!isOpen) return null;

  // Find the base channel for rendering
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base');
  if (!baseChannel) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-red-400">No base channel found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Generate Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel</SelectItem>
                <SelectItem value="AZnzlk1XvdvUeBnXmlld">Domi</SelectItem>
                <SelectItem value="EXAVITQu4vr4xnSDxMaL">Bella</SelectItem>
                <SelectItem value="ThT5KcBeYPX3keUQqHPh">Dorothy</SelectItem>
                <SelectItem value="TX3LPaxmHKxFdv7VOQC5">Josh</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleGenerateAllAudio}
              disabled={!selectedVoice || queue.some(item => 
                item.status.status === 'generating' || 
                item.status.status === 'uploading'
              )}
            >
              {queue.length === 0 ? 'Generate All Audio' : 'Regenerate Audio'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept="audio/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={status.status === 'uploading'}
            >
              Upload Audio
            </Button>
            <Button
              onClick={handleFixJsonFormat}
              variant="outline"
            >
              Fix JSON Format
            </Button>
          </div>

          {status.status !== 'idle' && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {status.status === 'uploading' && 'Uploading audio file...'}
                  {status.status === 'complete' && 'Upload complete'}
                  {status.status === 'error' && 'Upload failed'}
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>
              <div className="w-24 flex items-center justify-end">
                {status.status === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading</span>
                  </div>
                )}
                {status.status === 'complete' && (
                  <span className="text-sm text-green-600">Completed</span>
                )}
                {status.status === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Error</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.interval.id} className="flex items-center gap-4">
                <div className="px-2 h-full flex items-center">
                  <span className="text-xs text-white truncate">
                    {item.interval.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {item.interval.label}
                    {item.status.audioData && (
                      <span className="ml-2 text-xs text-gray-400">
                        (Overwriting existing audio)
                      </span>
                    )}
                  </div>
                  <Progress value={item.status.progress} className="h-2" />
                </div>
                <div className="w-24 flex items-center justify-end">
                  {item.status.status === 'generating' && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating</span>
                    </div>
                  )}
                  {item.status.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Uploading</span>
                    </div>
                  )}
                  {item.status.status === 'complete' && (
                    <span className="text-sm text-green-600">Completed</span>
                  )}
                  {item.status.status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 