'use client';

import { useState } from 'react';
import { BaseChannel, OverlayChannel, Channel, BaseInterval, OverlayInterval } from '@/db/schema';
import { ChannelTimeline } from './ChannelTimeline';
import { IntervalEditor } from './IntervalEditor';
import { SequencePlayer } from './SequencePlayer';

type ChannelEditorProps = {
  sequence: {
    name: string;
    description: string;
    channels: Channel[];
  };
  onSequenceUpdate: (sequence: {
    name: string;
    description: string;
    channels: Channel[];
  }) => void;
};

export function ChannelEditor({ sequence, onSequenceUpdate }: ChannelEditorProps) {
  // Track which channel and interval are being edited
  const [selectedChannelType, setSelectedChannelType] = useState<Channel['type']>('base');
  const [selectedIntervalId, setSelectedIntervalId] = useState<string>();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ completed: number; total: number }>();
  
  // Find base channel to calculate total duration
  const baseChannel = sequence.channels.find((c): c is BaseChannel => c.type === 'base');
  const totalDuration = baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0;

  // Find selected interval
  const selectedChannel = sequence.channels.find(c => c.type === selectedChannelType);
  const selectedInterval = selectedChannel?.intervals.find(i => i.id === selectedIntervalId);

  // Handle channel updates
  const handleChannelUpdate = (updatedChannel: Channel) => {
    const updatedChannels = sequence.channels.map(channel => 
      channel.type === updatedChannel.type ? updatedChannel : channel
    );
    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  // Handle interval updates
  const handleIntervalUpdate = (updates: Partial<BaseInterval | OverlayInterval>) => {
    if (!selectedChannel || !selectedInterval) return;

    const updatedIntervals = selectedChannel.intervals.map(interval =>
      interval.id === selectedIntervalId ? { ...interval, ...updates } : interval
    );

    handleChannelUpdate({
      ...selectedChannel,
      intervals: updatedIntervals
    });
  };

  // Handle interval reordering
  const handleIntervalsReorder = (channelType: Channel['type'], newIntervals: (BaseInterval | OverlayInterval)[]) => {
    const channel = sequence.channels.find(c => c.type === channelType);
    if (!channel) return;

    handleChannelUpdate({
      ...channel,
      intervals: newIntervals
    });
  };

  // Handle overlay interval timing adjustments
  const handleOverlayIntervalUpdate = (
    channelType: Channel['type'], 
    intervalId: string, 
    updates: Partial<OverlayInterval>
  ) => {
    const channel = sequence.channels.find(c => c.type === channelType);
    if (!channel) return;

    const updatedIntervals = channel.intervals.map(interval =>
      interval.id === intervalId 
        ? { ...interval, ...updates }
        : interval
    );

    handleChannelUpdate({
      ...channel,
      intervals: updatedIntervals
    });
  };

  // Generate audio for all intervals
  const handleGenerateAllAudio = async () => {
    setIsGeneratingAll(true);
    setGenerationProgress(undefined);

    try {
      // Collect all intervals that need audio
      const allIntervals = sequence.channels.flatMap(channel => {
        // For each channel, collect intervals that don't have audio yet
        return channel.intervals.filter(interval => !interval.style.audioFile);
      });

      if (allIntervals.length === 0) {
        alert('All intervals already have audio files.');
        setIsGeneratingAll(false);
        return;
      }

      const response = await fetch('/api/audio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervals: allIntervals,
          options: {
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Default to Rachel
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
        throw new Error('Failed to generate audio');
      }

      const { results, debug } = await response.json();
      console.log('Audio generation results:', debug);

      // Update intervals with new audio URLs
      const updatedChannels = sequence.channels.map(channel => ({
        ...channel,
        intervals: channel.intervals.map(interval => {
          const result = results.find((r: any) => r.id === interval.id);
          if (result?.success) {
            return {
              ...interval,
              style: {
                ...interval.style,
                audioFile: result.url
              }
            };
          }
          return interval;
        })
      }));

      onSequenceUpdate({ ...sequence, channels: updatedChannels });

      // Show summary
      const successCount = results.filter((r: any) => r.success).length;
      const reusedCount = results.filter((r: any) => r.reused).length;
      const failedCount = results.filter((r: any) => !r.success).length;

      alert(
        `Audio generation complete:\n` +
        `- ${successCount} files generated\n` +
        `- ${reusedCount} files reused\n` +
        (failedCount > 0 ? `- ${failedCount} files failed\n` : '') +
        `\nCheck the console for detailed results.`
      );
    } catch (error) {
      console.error('Failed to generate all audio:', error);
      alert('Failed to generate audio for some intervals. Please check the console for details.');
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with sequence info */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{sequence.name}</h1>
          <p className="text-gray-400">{sequence.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Total Duration: {Math.round(totalDuration / 1000)}s
          </div>
          <button
            onClick={handleGenerateAllAudio}
            disabled={isGeneratingAll}
            className={`px-4 py-2 rounded-md text-white text-sm transition-colors
              ${isGeneratingAll
                ? 'bg-blue-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
              }`}
          >
            <span className="flex items-center gap-2">
              {isGeneratingAll ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating All Audio...
                  {generationProgress && (
                    <span className="text-xs">
                      ({generationProgress.completed}/{generationProgress.total})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Generate All Audio
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Sequence Player */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
        <SequencePlayer 
          channels={sequence.channels}
          onTimeUpdate={(time) => {
            // Optional: Update UI based on current playback position
          }}
        />
      </div>

      {/* Timeline */}
      <div className="border border-gray-700 rounded-lg bg-gray-800/50 overflow-hidden">
        <ChannelTimeline
          channels={sequence.channels}
          selectedChannelType={selectedChannelType}
          selectedIntervalId={selectedIntervalId}
          onChannelSelect={setSelectedChannelType}
          onIntervalSelect={(channelType, intervalId) => {
            setSelectedChannelType(channelType);
            setSelectedIntervalId(intervalId);
          }}
          onIntervalsReorder={handleIntervalsReorder}
          onIntervalUpdate={handleOverlayIntervalUpdate}
        />
      </div>

      {/* Selected Interval Editor */}
      {selectedInterval && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">
              Edit Interval: {selectedInterval.label}
            </h2>
            <div className="text-sm text-gray-400">
              {selectedChannelType === 'base' 
                ? 'Use ← → to reorder'
                : 'Use ← → to adjust timing (hold Shift for 1s steps)'}
            </div>
          </div>
          <IntervalEditor
            interval={selectedInterval}
            isBaseChannel={selectedChannelType === 'base'}
            totalDuration={totalDuration}
            onUpdate={handleIntervalUpdate}
          />
        </div>
      )}
    </div>
  );
} 