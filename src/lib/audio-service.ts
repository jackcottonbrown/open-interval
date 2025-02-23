import { ElevenLabsClient, type VoiceSettings } from './elevenlabs';
import { BaseInterval, OverlayInterval, Channel } from '@/db/schema';

export type AudioGenerationOptions = {
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
};

export type AudioGenerationResult = {
  audio: ArrayBuffer;
  generationTime: number;
};

export class AudioService {
  private client: ElevenLabsClient;

  constructor() {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('Missing ELEVENLABS_API_KEY environment variable');
    }
    this.client = new ElevenLabsClient(process.env.ELEVENLABS_API_KEY!);
  }

  // Generate audio for a sequence
  async generateSequenceAudio(
    channels: Channel[],
    options: AudioGenerationOptions,
    onProgress?: (progress: { completed: number; total: number }) => void
  ): Promise<Map<string, AudioGenerationResult>> {
    const audioResults = new Map<string, AudioGenerationResult>();
    const intervals: (BaseInterval | OverlayInterval)[] = [];

    // Collect all intervals that need audio
    channels.forEach(channel => {
      intervals.push(...channel.intervals);
    });

    let completed = 0;
    const total = intervals.length;

    // Generate audio for each interval
    for (const interval of intervals) {
      try {
        const result = await this.generateIntervalAudio(interval, options);
        audioResults.set(interval.id, result);
        completed++;
        onProgress?.({ completed, total });
      } catch (error) {
        console.error(`Failed to generate audio for interval ${interval.id}:`, error);
        // Continue with next interval
      }
    }

    return audioResults;
  }

  // Generate audio for an interval
  async generateIntervalAudio(
    interval: BaseInterval | OverlayInterval,
    options: {
      voiceId: string;
      voiceSettings?: VoiceSettings;
    }
  ): Promise<AudioGenerationResult> {
    try {
      const { audio, generationTime } = await this.client.generateSpeech({
        text: this.getSpokenText(interval),
        voice_id: options.voiceId,
        voice_settings: options.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      });

      return { audio, generationTime };
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }

  private getSpokenText(interval: BaseInterval | OverlayInterval): string {
    // For overlay intervals, use spokenLabel if available
    if ('spokenLabel' in interval && interval.spokenLabel) {
      return interval.spokenLabel;
    }

    // For overlay intervals, combine label and notes if both exist
    if ('notes' in interval && interval.notes) {
      return `${interval.label}. ${interval.notes}`;
    }

    return interval.label;
  }
}

export const audioService = new AudioService(); 