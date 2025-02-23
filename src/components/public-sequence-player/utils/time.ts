export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function clampTime(time: number, min: number, max: number): number {
  return Math.max(min, Math.min(time, max));
}

export function calculateTimelineWidth(baseWidth: number, zoomLevel: number): number {
  return baseWidth * zoomLevel;
}

export function calculateVisibleDuration(totalDuration: number, zoomLevel: number): number {
  return totalDuration / zoomLevel;
}

export function calculatePixelsPerMs(timelineWidth: number, totalDuration: number): number {
  return timelineWidth / totalDuration;
}

export function calculateTimeMarkers(totalDuration: number, interval = 10000): number[] {
  return Array.from({ length: Math.ceil(totalDuration / interval) + 1 }, (_, i) => i * interval);
} 