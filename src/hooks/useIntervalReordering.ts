import { Channel, BaseChannel, OverlayChannel } from '@/db/schema';

type UpdateSequence = (sequence: {
  channels: Channel[];
  [key: string]: any;
}) => void;

export function useIntervalReordering(onSequenceUpdate: UpdateSequence) {
  const handleIntervalsReorder = (
    sequence: { channels: Channel[] },
    channelType: Channel['type'],
    selectedIntervalIds: Set<string>,
    direction: 'left' | 'right',
    amount: number = 1
  ) => {
    const selectedChannel = sequence.channels.find(c => c.type === channelType);
    if (!selectedChannel || selectedIntervalIds.size === 0) return;

    // Only allow reordering intervals within the same channel
    const selectedIntervalArray = Array.from(selectedIntervalIds);
    const selectedChannelIntervals = selectedChannel.intervals;
    const allIntervalsInSameChannel = selectedIntervalArray.every(id => 
      selectedChannelIntervals.some(interval => interval.id === id)
    );

    if (!allIntervalsInSameChannel) {
      alert('Cannot reorder intervals across different channels');
      return;
    }

    const updatedChannels = sequence.channels.map(channel => {
      if (channel.type === channelType) {
        const intervals = [...channel.intervals];
        const selectedIndices = selectedIntervalArray
          .map(id => intervals.findIndex(i => i.id === id))
          .filter(index => index !== -1)
          .sort((a, b) => direction === 'left' ? a - b : b - a);

        // Move intervals
        for (const index of selectedIndices) {
          for (let step = 0; step < amount; step++) {
            const newIndex = direction === 'left' 
              ? Math.max(0, index - 1) 
              : Math.min(intervals.length - 1, index + 1);
            
            if (newIndex === index) break;

            // Swap intervals
            const temp = intervals[index];
            intervals[index] = intervals[newIndex];
            intervals[newIndex] = temp;
          }
        }

        if (channel.type === 'base') {
          return {
            ...channel,
            intervals
          } as BaseChannel;
        } else {
          return {
            ...channel,
            intervals
          } as OverlayChannel;
        }
      }
      return channel;
    });

    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  return {
    handleIntervalsReorder,
  };
} 