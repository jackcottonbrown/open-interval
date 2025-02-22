import { useState } from 'react';
import { Channel } from '@/db/schema';

export function useIntervalSelection() {
  const [selectedChannelType, setSelectedChannelType] = useState<Channel['type']>('base');
  const [selectedIntervalIds, setSelectedIntervalIds] = useState<Set<string>>(new Set());

  const handleIntervalSelect = (channelType: Channel['type'], intervalId: string, isShiftKey: boolean) => {
    // If selecting in a different channel, clear previous selection
    if (channelType !== selectedChannelType) {
      setSelectedChannelType(channelType);
      setSelectedIntervalIds(new Set([intervalId]));
      return;
    }

    // Multi-select only within the same channel
    if (isShiftKey) {
      setSelectedIntervalIds(prev => {
        const newSelection = new Set(prev);
        if (prev.has(intervalId)) {
          newSelection.delete(intervalId);
        } else {
          newSelection.add(intervalId);
        }
        return newSelection;
      });
    } else {
      // Single selection
      setSelectedIntervalIds(new Set([intervalId]));
    }
  };

  const clearSelection = () => {
    setSelectedIntervalIds(new Set());
  };

  return {
    selectedChannelType,
    setSelectedChannelType,
    selectedIntervalIds,
    setSelectedIntervalIds,
    handleIntervalSelect,
    clearSelection,
  };
} 