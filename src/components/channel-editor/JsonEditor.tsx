import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { BaseInterval, OverlayInterval, Channel } from '@/db/schema';
import type { Sequence } from '@/components/channel-editor/ChannelEditor';

// Type guard for overlay intervals
function isOverlayInterval(interval: BaseInterval | OverlayInterval): interval is OverlayInterval {
  return interval.type === 'overlay';
}

type JsonEditorProps = {
  sequence: Sequence;
  selectedInterval?: BaseInterval | OverlayInterval;
  onSequenceUpdate: (sequence: Sequence) => void;
  debugInfo?: {
    lastGeneration?: {
      timestamp: string;
      text: string;
      duration: number;
      error?: string;
    };
  };
};

export function JsonEditor({ sequence, selectedInterval, onSequenceUpdate, debugInfo }: JsonEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editMode, setEditMode] = useState<'interval' | 'sequence'>('interval');
  const [editedJson, setEditedJson] = useState(() => 
    JSON.stringify(selectedInterval || sequence, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Update JSON when interval or sequence changes
  useEffect(() => {
    const targetData = editMode === 'interval' ? selectedInterval : sequence;
    setEditedJson(JSON.stringify(targetData, null, 2));
    setJsonError(null);
  }, [selectedInterval, sequence, editMode]);

  const inputClasses = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-300";

  const handleJsonUpdate = () => {
    try {
      const parsed = JSON.parse(editedJson);
      
      if (editMode === 'interval' && selectedInterval) {
        // Update just the selected interval within the sequence
        const updatedChannels = sequence.channels.map(channel => ({
          ...channel,
          intervals: channel.intervals.map(interval => 
            interval.id === selectedInterval.id ? { ...interval, ...parsed } : interval
          )
        }));
        onSequenceUpdate({ ...sequence, channels: updatedChannels });
      } else {
        // Update the entire sequence
        onSequenceUpdate(parsed);
      }
      
      setJsonError(null);
      toast({
        title: 'Success',
        description: `${editMode === 'interval' ? 'Interval' : 'Sequence'} updated successfully`,
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
      toast({
        title: 'Error',
        description: 'Failed to parse JSON',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mt-8 border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <label className={labelClasses}>JSON Editor</label>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setEditMode('interval')}
              className={`px-2 py-1 rounded ${
                editMode === 'interval'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              disabled={!selectedInterval}
            >
              Interval
            </button>
            <button
              onClick={() => setEditMode('sequence')}
              className={`px-2 py-1 rounded ${
                editMode === 'sequence'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Full Sequence
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-400 hover:text-white"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">
                {editMode === 'interval' ? 'Interval JSON' : 'Sequence JSON'}
              </label>
              <div className="space-x-2">
                <button
                  onClick={handleJsonUpdate}
                  className="text-xs text-blue-500 hover:text-blue-400"
                  disabled={!!jsonError || (editMode === 'interval' && !selectedInterval)}
                >
                  Apply Changes
                </button>
                <button
                  onClick={() => {
                    const targetData = editMode === 'interval' ? selectedInterval : sequence;
                    setEditedJson(JSON.stringify(targetData, null, 2));
                    setJsonError(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
            <textarea
              value={editedJson}
              onChange={(e) => {
                setEditedJson(e.target.value);
                try {
                  JSON.parse(e.target.value);
                  setJsonError(null);
                } catch (error) {
                  setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
                }
              }}
              rows={10}
              className={`${inputClasses} font-mono text-sm ${
                jsonError ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder={
                editMode === 'interval' && !selectedInterval
                  ? 'Select an interval to edit'
                  : 'Edit JSON here'
              }
              disabled={editMode === 'interval' && !selectedInterval}
            />
            {jsonError && (
              <p className="mt-1 text-xs text-red-500">{jsonError}</p>
            )}
          </div>

          {editMode === 'interval' && selectedInterval && (
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
              <div>
                <h4 className="font-medium mb-1">Interval Info</h4>
                <div>ID: {selectedInterval.id}</div>
                <div>Type: {selectedInterval.type}</div>
                <div>Duration: {selectedInterval.duration}ms</div>
                {isOverlayInterval(selectedInterval) && (
                  <div>Start Time: {selectedInterval.startTime}ms</div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Audio Status</h4>
                <div>Has Audio: {selectedInterval.audioFile ? 'Yes' : 'No'}</div>
                <div>Volume: {selectedInterval.volume ?? 1}</div>
                {debugInfo?.lastGeneration && (
                  <>
                    <div>Last Generated: {new Date(debugInfo.lastGeneration.timestamp).toLocaleString()}</div>
                    <div>Generation Time: {debugInfo.lastGeneration.duration}ms</div>
                  </>
                )}
              </div>
            </div>
          )}

          {editMode === 'sequence' && (
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
              <div>
                <h4 className="font-medium mb-1">Sequence Info</h4>
                <div>ID: {sequence.id ?? 'New Sequence'}</div>
                <div>Name: {sequence.name}</div>
                <div>Description: {sequence.description || 'No description'}</div>
                <div>Public: {sequence.isPublic ? 'Yes' : 'No'}</div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Channel Info</h4>
                <div>Total Channels: {sequence.channels.length}</div>
                <div>Base Channel: {sequence.channels.find(c => c.type === 'base')?.name}</div>
                <div>Overlay Channels: {sequence.channels.filter(c => c.type !== 'base').length}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 