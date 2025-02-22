import { NextRequest } from 'next/server';
import { AudioService } from '@/lib/audio-service';
import { AudioStorage } from '@/lib/audio-storage';

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const audioService = new AudioService(process.env.ELEVENLABS_API_KEY);
const audioStorage = new AudioStorage();

// Initialize storage on startup
audioStorage.init().catch(console.error);

export async function POST(request: NextRequest) {
  try {
    console.log('Starting countdown audio generation');

    // Generate countdown audio for all voices
    await audioStorage.generateCountdownAudio(audioService);

    // Get storage info for debugging
    const storageInfo = await audioStorage.getStorageInfo();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Countdown audio files generated successfully',
        debug: {
          storage: storageInfo
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating countdown audio:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500 }
    );
  }
} 