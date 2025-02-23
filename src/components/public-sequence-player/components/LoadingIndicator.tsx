// Force TypeScript to reprocess this file
import { LoadingStatus } from '../hooks/useAudioPlayback';

type LoadingIndicatorProps = {
  status: LoadingStatus;
};

export function LoadingStatusIndicator({ status }: LoadingIndicatorProps) {
  if (status.total === 0) return null;

  const progress = Math.round((status.loaded / status.total) * 100);
  const hasErrors = status.failed > 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${hasErrors ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {status.loaded}/{status.total}
        </span>
      </div>
      {hasErrors && (
        <div className="text-sm text-red-500">
          {status.failed} file(s) failed to load
          <ul className="mt-1 text-xs">
            {status.errors.map((error, i) => (
              <li key={i} className="truncate">{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 