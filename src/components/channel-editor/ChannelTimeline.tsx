'use client';

import { useState, useEffect } from 'react';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';

type ChannelTimelineProps = {
  channels: Channel[];
  selectedChannelType: Channel['type'];
  onChannelSelect: (channelType: Channel['type']) => void;
  onIntervalSelect: (channelType: Channel['type'], intervalId: string) => void;
  onIntervalsReorder: (channelType: Channel['type'], intervals: (BaseInterval | OverlayInterval)[]) => void;
  onIntervalUpdate: (channelType: Channel['type'], intervalId: string, updates: Partial<OverlayInterval>) => void;
  selectedIntervalId?: string;
};

export function ChannelTimeline({
  channels,
  selectedChannelType,
  onChannelSelect,
  onIntervalSelect,
  onIntervalsReorder,
  onIntervalUpdate,
  selectedIntervalId
}: ChannelTimelineProps) {
  // Find base channel and calculate total duration
  const baseChannel = channels.find((c): c is BaseChannel => c.type === 'base')!;
  const totalDuration = baseChannel.intervals.reduce((sum, int) => sum + int.duration, 0);

  // Calculate time scale (pixels per millisecond)
  const timelineWidth = 1000; // px
  const pxPerMs = timelineWidth / totalDuration;

  // State for hover effects
  const [hoveredInterval, setHoveredInterval] = useState<string | null>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have a selected interval
      if (!selectedIntervalId) return;

      // Get the current channel
      const channel = channels.find(c => c.type === selectedChannelType);
      if (!channel) return;

      // Find the current interval
      const currentInterval = channel.intervals.find(i => i.id === selectedIntervalId);
      if (!currentInterval) return;

      const FINE_ADJUST = 100;   // 0.1 second
      const COARSE_ADJUST = 1000; // 1 second

      if (channel.type === 'base') {
        // For base channel - reorder intervals
        const currentIndex = channel.intervals.indexOf(currentInterval);
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          const newIntervals = [...channel.intervals];
          const temp = newIntervals[currentIndex];
          newIntervals[currentIndex] = newIntervals[currentIndex - 1];
          newIntervals[currentIndex - 1] = temp;
          onIntervalsReorder(channel.type, newIntervals);
          e.preventDefault();
        } else if (e.key === 'ArrowRight' && currentIndex < channel.intervals.length - 1) {
          const newIntervals = [...channel.intervals];
          const temp = newIntervals[currentIndex];
          newIntervals[currentIndex] = newIntervals[currentIndex + 1];
          newIntervals[currentIndex + 1] = temp;
          onIntervalsReorder(channel.type, newIntervals);
          e.preventDefault();
        }
      } else {
        // For overlay channels - adjust start time
        const interval = currentInterval as OverlayInterval;
        const adjustment = e.shiftKey ? COARSE_ADJUST : FINE_ADJUST;

        if (e.key === 'ArrowLeft') {
          const newStartTime = Math.max(0, interval.startTime - adjustment);
          onIntervalUpdate(channel.type, interval.id, { startTime: newStartTime });
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          const newStartTime = Math.min(totalDuration - interval.duration, interval.startTime + adjustment);
          onIntervalUpdate(channel.type, interval.id, { startTime: newStartTime });
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels, selectedChannelType, selectedIntervalId, totalDuration, onIntervalsReorder, onIntervalUpdate]);

  // Helper to format time (ms to MM:SS)
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Time markers */}
        <div className="h-6 border-b border-gray-700 flex relative">
          {/* Major time markers (every 10 seconds) */}
          {Array.from({ length: Math.ceil(totalDuration / 10000) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-full flex items-end pb-1"
              style={{ left: `${(i * 10000 * pxPerMs)}px` }}
            >
              <div className="h-2 border-l border-gray-600" />
              <span className="text-xs text-gray-400 ml-1 font-mono">
                {formatTime(i * 10000)}
              </span>
            </div>
          ))}
          
          {/* Minor time markers (every second) */}
          {Array.from({ length: Math.ceil(totalDuration / 1000) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-1/2 border-l border-gray-700"
              style={{ left: `${(i * 1000 * pxPerMs)}px` }}
            />
          ))}
        </div>

        {/* Channels */}
        <div className="relative">
          {channels.map((channel) => (
            <div
              key={channel.type}
              className={`relative h-12 border-b border-gray-700 hover:bg-gray-800/50 transition-colors
                ${selectedChannelType === channel.type ? 'bg-gray-800' : 'bg-gray-900'}`}
              onClick={() => onChannelSelect(channel.type)}
            >
              {/* Channel label */}
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 z-10 flex items-center px-2 border-r border-gray-700">
                <span className="text-sm font-medium text-gray-300 truncate">
                  {channel.name}
                </span>
                {/* Add keyboard hints */}
                {selectedChannelType === channel.type && (
                  <span className="ml-1 text-xs text-gray-500">
                    {channel.type === 'base' ? '(← →)' : '(←0.1s→ +⇧1s)'}
                  </span>
                )}
              </div>

              {/* Intervals */}
              <div className="ml-24 relative h-full">
                {channel.intervals.map(interval => {
                  // Calculate position and width
                  const startPosition = channel.type === 'base'
                    ? channel.intervals
                        .slice(0, channel.intervals.indexOf(interval))
                        .reduce((sum, int) => sum + int.duration, 0)
                    : (interval as OverlayInterval).startTime;
                  
                  const width = interval.duration * pxPerMs;

                  return (
                    <div
                      key={interval.id}
                      className={`absolute top-1 bottom-1 rounded cursor-pointer
                        transition-all duration-150
                        ${selectedIntervalId === interval.id ? 'ring-2 ring-blue-500 z-10' : ''}
                        ${hoveredInterval === interval.id ? 'brightness-110 shadow-lg' : ''}`}
                      style={{
                        left: `${startPosition * pxPerMs}px`,
                        width: `${width}px`,
                        backgroundColor: interval.style.color + '40',
                        borderLeft: `2px solid ${interval.style.color}`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIntervalSelect(channel.type, interval.id);
                      }}
                      onMouseEnter={() => setHoveredInterval(interval.id)}
                      onMouseLeave={() => setHoveredInterval(null)}
                    >
                      {/* Interval label */}
                      <div className="px-2 h-full flex items-center">
                        <span className="text-xs text-white truncate">
                          {interval.label}
                        </span>
                      </div>

                      {/* Duration tooltip on hover */}
                      {hoveredInterval === interval.id && (
                        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded border border-gray-700 shadow-lg">
                          <div className="font-mono">{formatTime(interval.duration)}</div>
                          {channel.type !== 'base' && (
                            <div className="text-gray-400">
                              Start: {formatTime((interval as OverlayInterval).startTime)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 