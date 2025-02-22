import { Channel, BaseChannel, OverlayInterval } from '@/db/schema';

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
        const updatedIntervals = channel.intervals.map(interval => {
          if (selectedIntervalIds.has(interval.id)) {
            const overlay = interval as OverlayInterval;
            const newStartTime = Math.max(0, Math.min(
              totalDuration - overlay.duration,
              overlay.startTime + timeChange
            ));
            return {
              ...overlay,
              startTime: newStartTime
            };
          }
          return interval;
        });

        return {
          ...channel,
          intervals: updatedIntervals
        };
      }
      return channel;
    });

    onSequenceUpdate({ ...sequence, channels: updatedChannels });
  };

  return {
    handleTimeAdjust,
  };
} 