import { LoadingStatus } from '../hooks/useAudioPlayback';
import { formatTime } from '../utils/time';

type PlaybackControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  loadingStatus: LoadingStatus;
  onTogglePlayback: () => void;
};

export function PlaybackControls({
  isPlaying,
  currentTime,
  totalDuration,
  loadingStatus,
  onTogglePlayback
}: PlaybackControlsProps) {
  const isLoading = loadingStatus.loaded < loadingStatus.total;

  return (
    <div className="flex items-center gap-4 mb-4">
      <button
        onClick={onTogglePlayback}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-white transition-colors flex items-center gap-2
          ${isPlaying 
            ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
            : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading Audio ({loadingStatus.loaded}/{loadingStatus.total})
          </>
        ) : (
          isPlaying ? 'Pause' : 'Play'
        )}
      </button>
      <span className="text-sm text-gray-300 font-mono">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>
    </div>
  );
} 