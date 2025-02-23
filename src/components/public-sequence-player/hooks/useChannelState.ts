import { useMemo } from 'react';
import { Channel, BaseChannel } from '@/db/schema';
import { findBaseChannel, calculateTotalDuration } from '../utils/channel';
import { calculateTimelineWidth, calculateVisibleDuration, calculatePixelsPerMs } from '../utils/time';

export function useChannelState(channels: Channel[]) {
  // Find base channel and calculate total duration
  const baseChannel = useMemo(() => findBaseChannel(channels), [channels]);
  const totalDuration = useMemo(() => calculateTotalDuration(baseChannel), [baseChannel]);

  // Calculate timeline dimensions
  const baseTimelineWidth = 1000; // Base width in pixels

  const getTimelineMetrics = (zoomLevel: number) => {
    const timelineWidth = calculateTimelineWidth(baseTimelineWidth, zoomLevel);
    const visibleDuration = calculateVisibleDuration(totalDuration, zoomLevel);
    const pxPerMs = calculatePixelsPerMs(timelineWidth, totalDuration);

    return {
      timelineWidth,
      visibleDuration,
      pxPerMs
    };
  };

  return {
    baseChannel,
    totalDuration,
    baseTimelineWidth,
    getTimelineMetrics
  };
} 