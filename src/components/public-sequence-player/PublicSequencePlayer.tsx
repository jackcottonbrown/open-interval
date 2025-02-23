'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Channel, BaseChannel, OverlayChannel, BaseInterval, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG, COUNTDOWN_VOICES } from '@/lib/countdown-config';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useTimelineControls } from './hooks/useTimelineControls';
import { useChannelState } from './hooks/useChannelState';
import { PlaybackControls, Timeline, LoadingStatusIndicator } from './components';

// Type guard for overlay intervals
function isOverlayInterval(interval: BaseInterval | OverlayInterval): interval is OverlayInterval {
  return interval.type === 'overlay';
}

type PublicSequencePlayerProps = {
  channels: Channel[];
  onTimeUpdate?: (currentTime: number) => void;
  countdownVoice?: string;
};

type AudioTrack = {
  audio: HTMLAudioElement;
  channelType: Channel['type'];
  interval: {
    id: string;
    startTime: number;
    duration: number;
    volume?: number;
  };
  channelVolume: number;
  isLoaded: boolean;
  error?: string;
};

type ScheduledAudio = {
  id: string;
  channelType: Channel['type'];
  audio: HTMLAudioElement;
  startTime: number;
  duration: number;
  volume: number;
  playTimeoutId?: number;
  stopTimeoutId?: number;
  isCountdown?: boolean;
};

type LoadingStatus = {
  total: number;
  loaded: number;
  failed: number;
  errors: string[];
};

function getAudioUrl(url: string): string {
  // Check for both old and new UploadThing URL formats
  const isUploadThingUrl = url.includes('ufs.sh/f/') || url.includes('utfs.io/f/');
  if (!isUploadThingUrl) {
    console.log('Using direct URL:', url);
    return url;
  }

  const proxyUrl = `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  console.log('Using proxy for UploadThing URL:', {
    original: url,
    proxy: proxyUrl
  });
  return proxyUrl;
}

function getIntervalStartTime(channel: Channel, interval: BaseInterval | OverlayInterval): number {
  if (channel.type === 'base') {
    const baseChannel = channel as BaseChannel;
    const baseInterval = interval as BaseInterval;
    return baseChannel.intervals
      .slice(0, baseChannel.intervals.indexOf(baseInterval))
      .reduce((sum, int) => sum + int.duration, 0);
  } else {
    return (interval as OverlayInterval).startTime;
  }
}

export function PublicSequencePlayer({ 
  channels, 
  onTimeUpdate,
  countdownVoice = COUNTDOWN_CONFIG.DEFAULT_VOICE
}: PublicSequencePlayerProps) {
  // Initialize channel state
  const { baseChannel, totalDuration, getTimelineMetrics } = useChannelState(channels);

  // Initialize audio playback
  const {
    isPlaying,
    currentTime,
    loadingStatus,
    mutedChannels,
    togglePlayback,
    handleSeek,
    handleMuteToggle,
    updateChannelVolume
  } = useAudioPlayback(channels, baseChannel, countdownVoice);

  // Initialize timeline controls
  const {
    isDragging,
    timelineRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useTimelineControls(totalDuration, handleSeek);

  // Call onTimeUpdate prop when currentTime changes
  useEffect(() => {
    onTimeUpdate?.(currentTime);
  }, [currentTime, onTimeUpdate]);

  return (
    <div className="relative w-full h-full">
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        loadingStatus={loadingStatus}
        onTogglePlayback={togglePlayback}
      />

      <Timeline
        channels={channels}
        currentTime={currentTime}
        totalDuration={totalDuration}
        mutedChannels={mutedChannels}
        timelineRef={timelineRef as React.RefObject<HTMLDivElement>}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMuteToggle={handleMuteToggle}
        onVolumeChange={updateChannelVolume}
      />

      <LoadingStatusIndicator status={loadingStatus} />
    </div>
  );
} 