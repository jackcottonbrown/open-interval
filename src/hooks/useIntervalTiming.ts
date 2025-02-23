import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';

type UpdateSequence = (sequence: {
  channels: Channel[];
  [key: string]: any;
}) => void;

export function useIntervalTiming(onSequenceUpdate: UpdateSequence) {
  const handleTimeAdjust = (
    sequence: { channels: Channel[] },
    selectedChannelType: Channel['type'],
    selectedIntervalIds: Set<string>,
    direction: 'left' | 'right',
    isShiftKey: boolean
  ) => {
    const baseChannel = sequence.channels.find((c): c is BaseChannel => c.type === 'base');
    const totalDuration = baseChannel?.intervals?.reduce((sum, int) => sum + int.duration, 0) ?? 0;
    
    const selectedChannel = sequence.channels.find(c => c.type === selectedChannelType);
    if (!selectedChannel || selectedIntervalIds.size === 0) return;

    const timeStep = isShiftKey ? 1000 : 100; // 1s or 100ms
    const timeChange = direction === 'left' ? -timeStep : timeStep;

    const updatedChannels = sequence.channels.map(channel => {
      if (channel.type === selectedChannelType) {
        if (channel.type === 'base') {
          // For base channels, we don't adjust timing
          return channel;
        } else {
          // For overlay channels, adjust the startTime
          const overlayChannel = channel as OverlayChannel;
          const updatedIntervals = overlayChannel.intervals.map(interval => {
            if (selectedIntervalIds.has(interval.id)) {
              const newStartTime = Math.max(0, Math.min(
                totalDuration - interval.duration,
                interval.startTime + timeChange
              ));
              return {
                ...interval,
                startTime: newStartTime
              };
            }
            return interval;
          });

          return {
            ...overlayChannel,
            intervals: updatedIntervals
          };
        }
      }
      return channel;
    });

    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  return {
    handleTimeAdjust,
  };
} 