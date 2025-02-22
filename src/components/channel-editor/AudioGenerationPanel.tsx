'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Channel, BaseChannel, OverlayChannel } from '@/types/channel';
import type { Interval } from '@/types/interval';
import type { Sequence } from '@/types/sequence';

type AudioGenerationStatus = {
  status: 'idle' | 'generating' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  url?: string;
};

type QueuedInterval = {
  interval: Interval;
  status: AudioGenerationStatus;
};

interface AudioGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onSequenceUpdate: (channels: Channel[]) => void;
}

export function AudioGenerationPanel({ 
  isOpen,
  onClose,
  channels,
  onSequenceUpdate
}: AudioGenerationPanelProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [queue, setQueue] = useState<QueuedInterval[]>([]);
  const { uploadAudio, uploadStatus } = useAudioUpload();
  const { toast } = useToast();

  // Find the base channel
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base');
  if (!baseChannel) {
    return null; // Or show an error message
  }

  const handleGenerateAllAudio = useCallback(async () => {
    if (!selectedVoice) {
      toast({
        title: 'Error',
        description: 'Please select a voice first',
        variant: 'destructive',
      });
      return;
    }

    // Initialize queue with all intervals that need audio
    const newQueue = baseChannel.intervals
      .filter(interval => !interval.style.audioFile || interval.style.audioFile === '')
      .map(interval => ({
        interval,
        status: { status: 'idle', progress: 0 },
      }));

    if (newQueue.length === 0) {
      toast({
        title: 'Info',
        description: 'All intervals already have audio. Generate again to overwrite.',
      });
      // Include all intervals for regeneration
      newQueue.push(...baseChannel.intervals.map(interval => ({
        interval,
        status: { 
          status: 'idle', 
          progress: 0,
          url: interval.style.audioFile 
        },
      })));
    }

    setQueue(newQueue);

    // Process each interval
    for (let i = 0; i < newQueue.length; i++) {
      const queueItem = newQueue[i];
      
      try {
        // Update status to generating
        setQueue(prev => prev.map((item, index) => 
          index === i ? { ...item, status: { status: 'generating', progress: 0 } } : item
        ));

        // Generate audio
        const response = await fetch('/api/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: queueItem.interval.text,
            voice: selectedVoice,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate audio');
        }

        const audioBlob = await response.blob();
        const audioFile = new File([audioBlob], `${queueItem.interval.id}.mp3`, { type: 'audio/mpeg' });

        // Update status to uploading
        setQueue(prev => prev.map((item, index) => 
          index === i ? { ...item, status: { status: 'uploading', progress: 0 } } : item
        ));

        // Upload the generated audio with metadata for consistent file naming
        const audioUrl = await uploadAudio(audioFile, {
          sequenceId: baseChannel.id,
          sequenceName: baseChannel.name,
          intervalId: queueItem.interval.id,
          channelType: 'base',
        });

        // Update status to completed
        setQueue(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: { 
              status: 'completed', 
              progress: 100,
              url: audioUrl 
            } 
          } : item
        ));

        // Update the channel with the new audio URL
        const updatedChannels = channels.map(channel => {
          if (channel.type === 'base') {
            return {
              ...channel,
              intervals: channel.intervals.map(interval =>
                interval.id === queueItem.interval.id
                  ? {
                      ...interval,
                      style: {
                        ...interval.style,
                        audioFile: audioUrl
                      }
                    }
                  : interval
              )
            };
          }
          return channel;
        });

        // Notify parent components
        onSequenceUpdate(updatedChannels);

        // Show success toast for overwrite
        if (queueItem.status.url) {
          toast({
            title: 'Success',
            description: `Audio regenerated for interval: ${queueItem.interval.label}`,
          });
        }

      } catch (error) {
        console.error('Error processing interval:', error);
        setQueue(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: { 
              status: 'error', 
              progress: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              url: queueItem.status.url // Preserve existing URL if error during regeneration
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
  }, [selectedVoice, baseChannel, channels, onSequenceUpdate, uploadAudio, toast]);

  if (!isOpen) return null;

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
                <SelectItem value="voice1">Voice 1</SelectItem>
                <SelectItem value="voice2">Voice 2</SelectItem>
                <SelectItem value="voice3">Voice 3</SelectItem>
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
          </div>

          <div className="space-y-2">
            {queue.map((item, index) => (
              <div key={item.interval.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {item.interval.text}
                    {item.status.url && (
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
                  {item.status.status === 'completed' && (
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