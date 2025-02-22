import { useEffect } from 'react';
import { Channel } from '@/db/schema';

type KeyboardHandlers = {
  sequence: { channels: Channel[] };
  selectedChannel: Channel | undefined;
  selectedChannelType: Channel['type'];
  selectedIntervalIds: Set<string>;
  onReorder: (
    sequence: { channels: Channel[] },
    channelType: Channel['type'],
    selectedIntervalIds: Set<string>,
    direction: 'left' | 'right',
    amount: number
  ) => void;
  onTimeAdjust: (
    sequence: { channels: Channel[] },
    selectedChannelType: Channel['type'],
    selectedIntervalIds: Set<string>,
    direction: 'left' | 'right',
    isShiftKey: boolean
  ) => void;
};

export function useKeyboardShortcuts({
  sequence,
  selectedChannel,
  selectedChannelType,
  selectedIntervalIds,
  onReorder,
  onTimeAdjust,
}: KeyboardHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedChannel || selectedIntervalIds.size === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? 'left' : 'right';

        if (selectedChannelType === 'base') {
          // For base channel, reorder intervals
          const amount = e.shiftKey ? 10 : 1;
          onReorder(sequence, selectedChannelType, selectedIntervalIds, direction, amount);
        } else {
          // For overlay channels, adjust start time
          onTimeAdjust(sequence, selectedChannelType, selectedIntervalIds, direction, e.shiftKey);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    sequence,
    selectedChannel,
    selectedChannelType,
    selectedIntervalIds,
    onReorder,
    onTimeAdjust,
  ]);
} 