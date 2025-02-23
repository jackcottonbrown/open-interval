import { Channel, BaseChannel, BaseInterval, OverlayInterval } from '@/db/schema';

export function isOverlayInterval(interval: BaseInterval | OverlayInterval): interval is OverlayInterval {
  return interval.type === 'overlay';
}

export function findBaseChannel(channels: Channel[]): BaseChannel | undefined {
  return channels.find((c): c is BaseChannel => c.type === 'base');
}

export function calculateTotalDuration(baseChannel?: BaseChannel): number {
  return baseChannel?.intervals.reduce((sum, int) => sum + int.duration, 0) ?? 0;
}

export function channelsChanged(prevChannels: Channel[] | undefined, nextChannels: Channel[]): boolean {
  // Always initialize on first load
  if (!prevChannels) return true;
  
  if (prevChannels.length !== nextChannels.length) return true;
  
  for (let i = 0; i < prevChannels.length; i++) {
    const prev = prevChannels[i];
    const next = nextChannels[i];
    
    if (prev.type !== next.type || prev.intervals.length !== next.intervals.length) return true;
    
    for (let j = 0; j < prev.intervals.length; j++) {
      const prevInt = prev.intervals[j];
      const nextInt = next.intervals[j];
      if (prevInt.id !== nextInt.id || prevInt.audioFile !== nextInt.audioFile) return true;
    }
  }
  
  return false;
}

export function getIntervalPosition(
  channel: Channel,
  interval: BaseInterval | OverlayInterval,
  totalDuration: number
): { left: string; width: string } {
  const startPosition = channel.type === 'base'
    ? (channel as BaseChannel).intervals
        .slice(0, (channel as BaseChannel).intervals.indexOf(interval as BaseInterval))
        .reduce((sum, int) => sum + int.duration, 0)
    : (interval as OverlayInterval).startTime;
  
  return {
    left: `${(startPosition / totalDuration) * 100}%`,
    width: `${(interval.duration / totalDuration) * 100}%`
  };
}

export function isIntervalActive(
  interval: BaseInterval | OverlayInterval,
  channel: Channel,
  currentTime: number
): boolean {
  const startPosition = channel.type === 'base'
    ? (channel as BaseChannel).intervals
        .slice(0, (channel as BaseChannel).intervals.indexOf(interval as BaseInterval))
        .reduce((sum, int) => sum + int.duration, 0)
    : (interval as OverlayInterval).startTime;
  
  return currentTime >= startPosition && currentTime < (startPosition + interval.duration);
} 