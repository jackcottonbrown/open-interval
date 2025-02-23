'use client';

import { useState, useEffect, useCallback } from 'react';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';
import { IntervalEditor } from './IntervalEditor';
import { SequencePlayer } from './SequencePlayer';
import { AudioGenerationPanel } from './AudioGenerationPanel';
import { SequenceMetadataDialog } from './SequenceMetadataDialog';
import { useIntervalSelection } from '@/hooks/useIntervalSelection';
import { useIntervalReordering } from '@/hooks/useIntervalReordering';
import { useIntervalTiming } from '@/hooks/useIntervalTiming';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSequences } from '@/hooks/useSequences';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, Lock, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export type Sequence = {
  id?: number;
  name: string;
  description: string | null;
  isPublic?: boolean;
  channels: Channel[];
  tags?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
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
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(sequence.updatedAt ? new Date(sequence.updatedAt) : null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  
  // Hooks
  const { updateSequence, createSequence } = useSequences();
  
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

  // Track changes
  useEffect(() => {
    if (!lastSaved) return;
    setHasUnsavedChanges(true);
  }, [sequence.channels, sequence.name, sequence.description]);

  // Find base channel and selected intervals
  const baseChannel = sequence.channels.find(isBaseChannel);
  const totalDuration = baseChannel?.intervals?.reduce((sum, int) => sum + int.duration, 0) ?? 0;
  const selectedChannel = sequence.channels.find(c => c.type === selectedChannelType);
  const selectedInterval = selectedChannel?.intervals?.find(i => selectedIntervalIds.has(i.id));

  // Handle saving sequence
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let savedSequence;
      if (sequence.id) {
        // Update existing sequence
        savedSequence = await updateSequence(sequence.id, {
          name: sequence.name,
          description: sequence.description || undefined,
          channels: sequence.channels,
        });
      } else {
        // Create new sequence
        savedSequence = await createSequence({
          name: sequence.name,
          description: sequence.description || undefined,
          channels: sequence.channels,
        });
      }

      if (savedSequence) {
        onSequenceUpdate(savedSequence);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle metadata update
  const handleMetadataUpdate = async (updatedSequence: Sequence) => {
    if (!sequence.id) return;
    
    setIsSaving(true);
    try {
      const result = await updateSequence(sequence.id, {
        name: updatedSequence.name,
        description: updatedSequence.description || undefined,
        isPublic: updatedSequence.isPublic,
        tags: updatedSequence.tags || [],
      });
      
      if (result) {
        onSequenceUpdate(result);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

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

      if (isBaseChannel(channel)) {
        const updatedIntervals = channel.intervals.map(interval => {
          if (!selectedIntervalIds.has(interval.id)) return interval;
          const baseUpdates = { ...updates };
          if ('startTime' in baseUpdates) delete baseUpdates.startTime;
          return { ...interval, ...baseUpdates, type: 'base' as const };
        });
        return { ...channel, intervals: updatedIntervals };
      }

      if (isOverlayChannel(channel)) {
        const updatedIntervals = channel.intervals.map(interval => {
          if (!selectedIntervalIds.has(interval.id)) return interval;
          return { ...interval, ...updates, type: 'overlay' as const };
        });
        return { ...channel, intervals: updatedIntervals };
      }

      return channel;
    });

    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-white">{sequence.name}</h2>
            {lastSaved && (
              <span className="text-sm text-gray-400">
                Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-400">
                • Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {sequence.id && (
              <Button
                onClick={() => setIsMetadataDialogOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isSaving}
              >
                <Settings className="w-4 h-4" />
                Edit Details
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex items-center gap-2"
              variant={hasUnsavedChanges ? "default" : "secondary"}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsAudioPanelOpen(true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Generate Audio
            </Button>
          </div>
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
            sequenceId={sequence.id ?? 'temp'}
            sequence={sequence}
            onSequenceUpdate={onSequenceUpdate}
          />
        </div>
      )}

      {/* Metadata Dialog */}
      <SequenceMetadataDialog
        sequence={sequence}
        isOpen={isMetadataDialogOpen}
        onClose={() => setIsMetadataDialogOpen(false)}
        onUpdate={handleMetadataUpdate}
      />

      {/* Audio Generation Panel */}
      <AudioGenerationPanel
        isOpen={isAudioPanelOpen}
        onClose={() => setIsAudioPanelOpen(false)}
        channels={sequence.channels}
        onSequenceUpdate={(updatedChannels) => onSequenceUpdate({ 
          ...sequence, 
          channels: updatedChannels 
        })}
        sequenceId={sequence.id ?? 'temp'}
      />
    </div>
  );
} 