// ElevenLabs API Types
export type Voice = {
  voice_id: string;
  name: string;
  category: string;
};

export type TextToSpeechRequest = {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;      // 0-1
    similarity_boost: number; // 0-1
    style: number;         // 0-1
    use_speaker_boost?: boolean;
  };
};

export type TextToSpeechResponse = {
  audio: ArrayBuffer;
  generationTime: number;
};

export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // List available voices
  async listVoices(): Promise<Voice[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices;
  }

  // Generate speech from text
  async generateSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const startTime = Date.now();

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${request.voice_id}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model_id || 'eleven_monolingual_v1',
          voice_settings: request.voice_settings || {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate speech: ${response.statusText}`);
    }

    const audio = await response.arrayBuffer();
    const generationTime = Date.now() - startTime;

    return { audio, generationTime };
  }

  // Helper to convert ArrayBuffer to Blob URL
  static audioBufferToUrl(buffer: ArrayBuffer): string {
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }
} 