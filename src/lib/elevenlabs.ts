// ElevenLabs API Types
export type Voice = {
  voice_id: string;
  name: string;
  preview_url: string;
  labels: Record<string, string>;
};

export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost?: boolean;
};

export type TextToSpeechRequest = {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: VoiceSettings;
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
    const requestId = Math.random().toString(36).substring(7);

    try {
      console.log(`[${requestId}] Making ElevenLabs API request:`, {
        voiceId: request.voice_id,
        text: request.text,
        modelId: request.model_id || 'eleven_monolingual_v1',
        settings: request.voice_settings
      });

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

      console.log(`[${requestId}] Received ElevenLabs response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorText = await response.text();
          console.log(`[${requestId}] Error response body:`, errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
          } catch {
            errorDetails = errorText;
          }
        } catch {
          errorDetails = response.statusText;
        }

        throw new Error(`Failed to generate speech: ${errorDetails} (Status: ${response.status})`);
      }

      console.log(`[${requestId}] Getting audio buffer...`);
      const audio = await response.arrayBuffer();
      
      if (!audio || audio.byteLength === 0) {
        console.error(`[${requestId}] Generated audio buffer is empty`);
        throw new Error('Generated audio buffer is empty');
      }

      const generationTime = Date.now() - startTime;
      console.log(`[${requestId}] Audio generation completed:`, {
        bufferSize: audio.byteLength,
        generationTime
      });

      return { audio, generationTime };
    } catch (error) {
      // Add request details to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${requestId}] ElevenLabs API error:`, {
        error,
        errorMessage,
        request: {
          voiceId: request.voice_id,
          text: request.text,
          modelId: request.model_id
        }
      });
      throw new Error(`ElevenLabs API error: ${errorMessage} (Voice: ${request.voice_id}, Text: "${request.text}")`);
    }
  }

  // Helper to convert ArrayBuffer to Blob URL
  static audioBufferToUrl(buffer: ArrayBuffer): string {
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }
} 