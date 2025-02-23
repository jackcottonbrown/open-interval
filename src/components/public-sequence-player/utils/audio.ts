import { Channel, BaseChannel, BaseInterval, OverlayInterval } from '@/db/schema';
import { COUNTDOWN_CONFIG, COUNTDOWN_VOICES } from '@/lib/countdown-config';

export type AudioTrack = {
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

export type ScheduledAudio = {
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

export function getAudioUrl(url: string): string {
  console.log('Processing audio URL:', url);
  const proxyUrl = `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  console.log('Proxied URL:', proxyUrl);
  return proxyUrl;
}

export function getIntervalStartTime(channel: Channel, interval: BaseInterval | OverlayInterval): number {
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

export function createCountdownAudio(countdownVoice: string): HTMLAudioElement {
  const voice = COUNTDOWN_VOICES.find(v => v.name === countdownVoice) ?? 
               COUNTDOWN_VOICES.find(v => v.name === COUNTDOWN_CONFIG.DEFAULT_VOICE)!;
               
  const audio = new Audio(`${voice.directory}/countdown.mp3`);
  audio.volume = COUNTDOWN_CONFIG.VOLUME;
  return audio;
}

export function cleanupAudioTracks(tracks: AudioTrack[]): void {
  console.log('Cleaning up audio tracks:', tracks.length);
  tracks.forEach(track => {
    try {
      track.audio.pause();
      track.audio.currentTime = 0;
      track.audio.src = ''; // Clear the source to properly unload
    } catch (err) {
      console.error('Error cleaning up audio track:', err);
    }
  });
}

export function cleanupScheduledAudio(scheduled: ScheduledAudio[]): void {
  console.log('Cleaning up scheduled audio:', scheduled.length);
  scheduled.forEach(audio => {
    try {
      if (audio.playTimeoutId) window.clearTimeout(audio.playTimeoutId);
      if (audio.stopTimeoutId) window.clearTimeout(audio.stopTimeoutId);
      audio.audio.pause();
      audio.audio.currentTime = 0;
    } catch (err) {
      console.error('Error cleaning up scheduled audio:', err);
    }
  });
}

export function updateChannelVolume(tracks: AudioTrack[], channelType: Channel['type'], volume: number): void {
  console.log('Updating volume for channel type:', channelType, 'to:', volume);
  tracks
    .filter(track => track.channelType === channelType)
    .forEach(track => {
      try {
        track.audio.volume = volume * (track.interval.volume ?? 1);
        console.log('Set volume for track:', track.interval.id, 'to:', track.audio.volume);
      } catch (err) {
        console.error('Error updating channel volume:', err);
      }
    });
} 