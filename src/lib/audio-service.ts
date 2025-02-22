import { ElevenLabsClient, TextToSpeechRequest } from './elevenlabs';
import { BaseInterval, OverlayInterval, Channel } from '@/db/schema';

export type AudioGenerationOptions = {
  voiceId: string;
  modelId?: string;
  voiceSettings?: TextToSpeechRequest['voice_settings'];
};

export type AudioGenerationResult = {
  audio: ArrayBuffer;
  generationTime: number;
};

export class AudioService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.apiKey = apiKey;
    console.log('AudioService initialized with API key');
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
      voiceSettings?: {
        stability?: number;
        similarity_boost?: number;
        style?: number;
        use_speaker_boost?: boolean;
      };
    }
  ): Promise<AudioGenerationResult> {
    try {
      const startTime = Date.now();

      // Get text to speak
      const text = this.getSpokenText(interval);
      console.log('Generating audio for text:', {
        text,
        voiceId: options.voiceId,
        settings: options.voiceSettings
      });

      // Make request to ElevenLabs API
      const response = await fetch(`${this.baseUrl}/text-to-speech/${options.voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: options.voiceSettings || {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        console.error('ElevenLabs API error:', {
          status: response.status,
          statusText: response.statusText,
          error
        });
        throw new Error(`ElevenLabs API error: ${error.detail || 'Unknown error'}`);
      }

      // Get audio buffer
      const audio = await response.arrayBuffer();
      const generationTime = Date.now() - startTime;

      console.log('Received audio buffer:', {
        size: audio.byteLength,
        type: response.headers.get('content-type'),
        generationTime
      });

      if (!audio || audio.byteLength === 0) {
        throw new Error('Received empty audio buffer from ElevenLabs');
      }

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