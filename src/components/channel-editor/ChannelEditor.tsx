'use client';

import { useState } from 'react';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval, ChannelType } from '@/db/schema';
import { ChannelTimeline } from './ChannelTimeline';
import { IntervalEditor } from './IntervalEditor';
import { SequencePlayer } from './SequencePlayer';
import { AudioGenerationPanel } from './AudioGenerationPanel';
import { useIntervalSelection } from '@/hooks/useIntervalSelection';
import { useIntervalReordering } from '@/hooks/useIntervalReordering';
import { useIntervalTiming } from '@/hooks/useIntervalTiming';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export type Sequence = {
  name: string;
  description: string;
  channels: Channel[];
};

type ChannelEditorProps = {
  sequence: Sequence;
  onSequenceUpdate: (sequence: Sequence) => void;
};

// Type guard functions
function isBaseChannel(channel: Channel): channel is BaseChannel {
  return channel.type === 'base';
}

function isOverlayChannel(channel: Channel): channel is OverlayChannel {
  return channel.type === 'tutorial' || channel.type === 'encouragement' || channel.type === 'custom';
}

export function ChannelEditor({ sequence, onSequenceUpdate }: ChannelEditorProps) {
  // Audio generation state
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false);
  
  // Selection and editing hooks
  const {
    selectedChannelType,
    selectedIntervalIds,
    handleIntervalSelect,
    setSelectedChannelType,
    setSelectedIntervalIds,
  } = useIntervalSelection();

  const { handleIntervalsReorder } = useIntervalReordering((updatedSequence) => {
    onSequenceUpdate({
      ...sequence,
      ...updatedSequence,
    });
  });

  const { handleTimeAdjust } = useIntervalTiming((updatedSequence) => {
    onSequenceUpdate({
      ...sequence,
      ...updatedSequence,
    });
  });

  // Find base channel and selected intervals
  const baseChannel = sequence.channels.find(isBaseChannel);
  const totalDuration = baseChannel?.intervals?.reduce((sum, int) => sum + int.duration, 0) ?? 0;
  const selectedChannel = sequence.channels.find(c => c.type === selectedChannelType);
  const selectedInterval = selectedChannel?.intervals?.find(i => selectedIntervalIds.has(i.id));

  // Keyboard shortcuts
  useKeyboardShortcuts({
    sequence: { channels: sequence.channels },
    selectedChannel,
    selectedChannelType,
    selectedIntervalIds,
    onReorder: (
      seq: { channels: Channel[] },
      channelType: Channel['type'],
      selectedIds: Set<string>,
      direction: 'left' | 'right',
      amount: number
    ) => {
      handleIntervalsReorder(seq, channelType, selectedIds, direction, amount);
    },
    onTimeAdjust: (
      seq: { channels: Channel[] },
      channelType: Channel['type'],
      selectedIds: Set<string>,
      direction: 'left' | 'right',
      isShiftKey: boolean
    ) => {
      handleTimeAdjust(seq, channelType, selectedIds, direction, isShiftKey);
    },
  });

  // Handle interval updates
  const handleIntervalUpdate = (updates: Partial<BaseInterval | OverlayInterval>) => {
    if (!selectedChannel) return;

    const updatedChannels = sequence.channels.map(channel => {
      if (channel.type !== selectedChannelType) return channel;

      // Handle base channel
      if (isBaseChannel(channel)) {
        const updatedIntervals = channel.intervals.map(interval =>
          selectedIntervalIds.has(interval.id) 
            ? { ...interval, ...updates }
            : interval
        );
        const updatedChannel: BaseChannel = {
          ...channel,
          intervals: updatedIntervals,
        };
        return updatedChannel;
      }

      // Handle overlay channel
      if (isOverlayChannel(channel)) {
        const updatedIntervals = channel.intervals.map(interval =>
          selectedIntervalIds.has(interval.id) 
            ? { ...interval, ...updates }
            : interval
        );
        const updatedChannel: OverlayChannel = {
          ...channel,
          intervals: updatedIntervals,
        };
        return updatedChannel;
      }

      return channel;
    });

    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  return (
    <div className="space-y-4">
      {/* Sequence Player with integrated editing */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-white">{sequence.name}</h1>
          <button
            onClick={() => setIsAudioPanelOpen(true)}
            className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Generate Audio
          </button>
        </div>
        <SequencePlayer
          channels={sequence.channels}
          selectedChannelType={selectedChannelType}
          selectedIntervalIds={selectedIntervalIds}
          onChannelSelect={(channelType: Channel['type']) => {
            setSelectedChannelType(channelType);
            setSelectedIntervalIds(new Set());
          }}
          onIntervalSelect={handleIntervalSelect}
          onIntervalsReorder={(channelType: Channel['type'], direction: 'left' | 'right', amount: number) => {
            handleIntervalsReorder({ channels: sequence.channels }, channelType, selectedIntervalIds, direction, amount);
          }}
          onTimeAdjust={(direction: 'left' | 'right', isShiftKey: boolean) => {
            handleTimeAdjust({ channels: sequence.channels }, selectedChannelType, selectedIntervalIds, direction, isShiftKey);
          }}
        />
      </div>

      {/* Selected Interval Editor */}
      {selectedInterval && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedIntervalIds.size > 1 
                ? `Editing ${selectedIntervalIds.size} Intervals` 
                : `Edit Interval: ${selectedInterval.label}`}
            </h2>
            <div className="text-sm text-gray-400">
              {selectedChannelType === 'base' 
                ? 'Use ← → to reorder (hold Shift for 10 steps)'
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

      {/* Audio Generation Panel */}
      <AudioGenerationPanel
        isOpen={isAudioPanelOpen}
        onClose={() => setIsAudioPanelOpen(false)}
        channels={sequence.channels}
        onSequenceUpdate={(updatedChannels) => onSequenceUpdate({ 
          ...sequence, 
          channels: updatedChannels 
        })}
      />
    </div>
  );
} 