import { Channel, BaseInterval, OverlayInterval } from '@/db/schema';

export type AudioLoadStatus = {
  isLoaded: boolean;
  error?: string;
  audio?: HTMLAudioElement;
};

export class AudioLoader {
  private audioCache: Map<string, AudioLoadStatus> = new Map();

  // Load all audio files for a sequence
  async loadSequenceAudio(channels: Channel[]): Promise<Map<string, AudioLoadStatus>> {
    const loadStatuses = new Map<string, AudioLoadStatus>();
    const loadPromises: Promise<void>[] = [];

    // Collect all intervals that need audio
    channels.forEach(channel => {
      channel.intervals.forEach(interval => {
        if (interval.audioFile) {
          loadPromises.push(
            this.loadAudio(interval)
              .then(status => {
                loadStatuses.set(interval.id, status);
              })
          );
        } else {
          loadStatuses.set(interval.id, { isLoaded: false });
        }
      });
    });

    // Wait for all loads to complete
    await Promise.allSettled(loadPromises);
    return loadStatuses;
  }

  // Load audio for a single interval
  private async loadAudio(interval: BaseInterval | OverlayInterval): Promise<AudioLoadStatus> {
    const audioFile = interval.audioFile;
    if (!audioFile) {
      return { isLoaded: false };
    }

    // Check cache first
    const cached = this.audioCache.get(audioFile);
    if (cached) {
      return cached;
    }

    // Create new audio element
    const audio = new Audio();
    
    try {
      // Load the audio file
      audio.src = audioFile;
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });

      // Set initial volume
      audio.volume = interval.volume ?? 1;

      const status = { isLoaded: true, audio };
      this.audioCache.set(audioFile, status);
      return status;
    } catch (error) {
      const status = { 
        isLoaded: false, 
        error: error instanceof Error ? error.message : 'Failed to load audio'
      };
      this.audioCache.set(audioFile, status);
      return status;
    }
  }

  // Get audio status for an interval
  getAudioStatus(interval: BaseInterval | OverlayInterval): AudioLoadStatus {
    if (!interval.audioFile) {
      return { isLoaded: false };
    }
    return this.audioCache.get(interval.audioFile) ?? { isLoaded: false };
  }

  // Clear all cached audio
  clearCache() {
    this.audioCache.forEach(status => {
      if (status.audio) {
        status.audio.pause();
        status.audio.src = '';
      }
    });
    this.audioCache.clear();
  }
} 