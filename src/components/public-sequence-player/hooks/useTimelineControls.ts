import { useState, useRef, useCallback } from 'react';
import { clampTime } from '../utils/time';

export function useTimelineControls(
  totalDuration: number,
  onSeek: (time: number, totalDuration: number) => void
) {
  // State
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStartTime, setViewportStartTime] = useState(0);

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);

  // Handle mouse events for seeking
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onSeek(pos * totalDuration, totalDuration);
  }, [totalDuration, onSeek]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onSeek(pos * totalDuration, totalDuration);
  }, [isDragging, totalDuration, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zooming
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.1));
  }, []);

  // Handle viewport panning
  const handlePan = useCallback((direction: 'left' | 'right') => {
    const panAmount = totalDuration * 0.1; // Pan by 10% of total duration
    setViewportStartTime(prev => {
      const newTime = direction === 'left' 
        ? prev - panAmount 
        : prev + panAmount;
      return clampTime(newTime, 0, totalDuration - (totalDuration / zoomLevel));
    });
  }, [totalDuration, zoomLevel]);

  return {
    isDragging,
    zoomLevel,
    viewportStartTime,
    timelineRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleZoomIn,
    handleZoomOut,
    handlePan
  };
} 