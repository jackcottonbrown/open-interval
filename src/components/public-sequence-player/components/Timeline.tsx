import { Channel } from '@/db/schema';
import { formatTime } from '../utils/time';
import { getIntervalPosition, isIntervalActive } from '../utils/channel';
import { calculateTimeMarkers } from '../utils/time';

type TimelineProps = {
  channels: Channel[];
  currentTime: number;
  totalDuration: number;
  mutedChannels: Set<Channel['type']>;
  timelineRef: React.RefObject<HTMLDivElement>;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMuteToggle: (channelType: Channel['type']) => void;
  onVolumeChange: (channelType: Channel['type'], volume: number) => void;
};

export function Timeline({
  channels,
  currentTime,
  totalDuration,
  mutedChannels,
  timelineRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onMuteToggle,
  onVolumeChange
}: TimelineProps) {
  const timeMarkers = calculateTimeMarkers(totalDuration);

  return (
    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Scrubber */}
      <div className="relative flex">
        <div className="w-24 h-8 bg-gray-800 border-b border-r border-gray-700 shrink-0" />
        
        <div 
          ref={timelineRef}
          className="h-8 border-b border-gray-700 flex-1 relative cursor-pointer bg-gray-800/50"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          {/* Time markers */}
          {timeMarkers.map((time, i) => (
            <div
              key={i}
              className="absolute h-full flex items-end pb-1 pointer-events-none select-none"
              style={{ left: `${(time / totalDuration) * 100}%` }}
            >
              <div className="h-3 border-l border-gray-500" />
              <span className="text-xs text-gray-400 ml-1 font-mono">
                {formatTime(time)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="relative">
        {channels.map((channel) => (
          <div
            key={channel.type}
            className="relative h-12 border-b border-gray-700 bg-gray-900"
          >
            {/* Channel label with volume control */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 z-10 flex items-center px-2 border-r border-gray-700">
              <div className="flex flex-col w-full">
                <span className="text-sm font-medium text-gray-300 truncate">
                  {channel.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => onMuteToggle(channel.type)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {mutedChannels.has(channel.type) ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.414l12.828-12.828M19.513 12c0-1.414-.434-2.725-1.174-3.814M15.51 8.084C15.827 8.671 16 9.32 16 10M4.487 12c0 2.21 1.398 4.566 3.536 5.657L12 20V4l-3.977 3.314" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12l-4-4H4V10h4l4-4z" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    defaultValue={channel.volume}
                    onChange={(e) => onVolumeChange(channel.type, Number(e.target.value))}
                    className="w-12 h-1 accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Intervals */}
            <div className="ml-24 relative h-full">
              {channel.intervals.map(interval => {
                const { left, width } = getIntervalPosition(channel, interval, totalDuration);
                const isActive = isIntervalActive(interval, channel, currentTime);

                return (
                  <div
                    key={interval.id}
                    className={`absolute top-1 bottom-1 rounded transition-opacity duration-200
                      ${isActive ? 'opacity-100' : 'opacity-50'}`}
                    style={{
                      left,
                      width,
                      backgroundColor: interval.color + '40',
                      borderLeft: `2px solid ${interval.color}`
                    }}
                  >
                    <div className="px-2 h-full flex items-center">
                      <span className="text-xs text-white truncate">
                        {interval.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Playhead */}
      <div className="absolute top-0 bottom-0 left-24 right-0 pointer-events-none">
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50"
          style={{
            left: `${(currentTime / totalDuration) * 100}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
        </div>
      </div>
    </div>
  );
} 