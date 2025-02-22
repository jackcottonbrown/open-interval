import { NextRequest } from 'next/server';
import { AudioService } from '@/lib/audio-service';
import { AudioStorage } from '@/lib/audio-storage';
import { BaseInterval, OverlayInterval } from '@/db/schema';

// Log environment variables
console.log('Environment check:', {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY?.slice(0, 8) + '...',
  NODE_ENV: process.env.NODE_ENV,
  cwd: process.cwd()
});

// Initialize services
if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const audioService = new AudioService(process.env.ELEVENLABS_API_KEY);
const audioStorage = new AudioStorage();

// Initialize storage on startup
audioStorage.init().catch(console.error);

export async function POST(request: NextRequest) {
  try {
    const { interval, options } = await request.json();
    console.log('Received audio generation request:', { interval, options });

    if (!interval || !options.voiceId) {
      console.error('Missing required parameters:', { interval, options });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
      });
    }

    // Generate audio
    const startTime = Date.now();
    console.log('Generating audio for interval:', interval.id);
    
    const { audio, generationTime } = await audioService.generateIntervalAudio(interval, options);
    console.log('Audio generation completed:', {
      intervalId: interval.id,
      bufferSize: audio.byteLength,
      generationTime
    });
    
    if (!audio || audio.byteLength === 0) {
      throw new Error('Failed to generate audio buffer');
    }

    // Save audio and get URL
    console.log('Saving audio file...');
    const url = await audioStorage.saveAudio(audio, {
      text: interval.spokenLabel || interval.label,
      voiceId: options.voiceId,
      voiceSettings: options.voiceSettings
    });
    console.log('Audio file saved:', url);

    // Get storage info for debugging
    const storageInfo = await audioStorage.getStorageInfo();

    return new Response(
      JSON.stringify({
        success: true,
        url,
        debug: {
          storage: storageInfo,
          generationTime,
          totalTime: Date.now() - startTime
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in audio generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500 }
    );
  }
}

// Batch generate audio for multiple intervals
export async function PUT(request: NextRequest) {
  try {
    const { intervals, options } = await request.json();
    console.log('Received batch audio generation request:', {
      intervalCount: intervals?.length,
      options
    });

    if (!intervals || !options.voiceId) {
      console.error('Missing required parameters:', { intervals, options });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
      });
    }

    const startTime = Date.now();
    const results = [];
    let reusedCount = 0;
    let generatedCount = 0;
    let totalGenerationTime = 0;

    console.log('Processing intervals:', intervals.length);
    for (const interval of intervals) {
      try {
        console.log('Processing interval:', {
          id: interval.id,
          label: interval.label
        });

        // Generate audio
        const { audio, generationTime } = await audioService.generateIntervalAudio(interval, options);
        console.log('Audio generated:', {
          id: interval.id,
          bufferSize: audio.byteLength,
          generationTime
        });
        
        totalGenerationTime += generationTime;

        if (!audio || audio.byteLength === 0) {
          throw new Error('Failed to generate audio buffer');
        }

        // Save audio and get URL
        const url = await audioStorage.saveAudio(audio, {
          text: interval.spokenLabel || interval.label,
          voiceId: options.voiceId,
          voiceSettings: options.voiceSettings
        });
        console.log('Audio saved:', { id: interval.id, url });

        results.push({
          id: interval.id,
          success: true,
          url,
          reused: false,
          generationTime
        });
        generatedCount++;
      } catch (error) {
        console.error(`Failed to generate audio for interval ${interval.id}:`, error);
        results.push({
          id: interval.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Get final storage info
    const storageInfo = await audioStorage.getStorageInfo();
    console.log('Batch processing completed:', {
      generated: generatedCount,
      reused: reusedCount,
      failed: intervals.length - (generatedCount + reusedCount),
      totalGenerationTime
    });

    return new Response(
      JSON.stringify({
        results,
        debug: {
          storage: storageInfo,
          totalGenerationTime,
          totalTime: Date.now() - startTime,
          reusedCount,
          generatedCount
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in batch audio generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500 }
    );
  }
} 