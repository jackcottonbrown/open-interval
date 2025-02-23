import { NextRequest } from 'next/server';
import { audioService } from '@/lib/audio-service';
import { UTApi } from "uploadthing/server";

// Initialize audio service and UploadThing
if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

if (!process.env.UPLOADTHING_TOKEN) {
  throw new Error('UPLOADTHING_TOKEN is not set in environment variables');
}

const utapi = new UTApi();

// Debug helper to safely stringify objects with circular references
function safeStringify(obj: any, space = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}

// Helper function to retry failed operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Operation failed');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      
      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Audio generation request received`);

  try {
    // Parse request body and validate
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body parsed:`, safeStringify(body));
    } catch (error) {
      console.error(`[${requestId}] Failed to parse request body:`, error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: error instanceof Error ? error.message : 'Failed to parse JSON'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { interval, options, metadata } = body;
    console.log(`[${requestId}] Request details:`, {
      interval: interval ? {
        id: interval.id,
        label: interval.label,
        text: interval.text || interval.label
      } : null,
      options,
      metadata,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Validate required parameters
    if (!interval?.id || !interval.label || !options?.voiceId || !metadata) {
      const missingParams = [];
      if (!interval?.id) missingParams.push('interval.id');
      if (!interval?.label) missingParams.push('interval.label');
      if (!options?.voiceId) missingParams.push('options.voiceId');
      if (!metadata) missingParams.push('metadata');

      console.error(`[${requestId}] Missing required parameters:`, { 
        missingParams, 
        receivedParams: {
          hasInterval: !!interval,
          hasOptions: !!options,
          hasMetadata: !!metadata
        }
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: `Missing: ${missingParams.join(', ')}`
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate audio
    let audioResult;
    try {
      console.log(`[${requestId}] Starting audio generation with ElevenLabs API`);
      audioResult = await audioService.generateIntervalAudio(
        { 
          ...interval,
          // Ensure we use the correct text for generation
          label: interval.text || interval.label
        }, 
        options
      );
      console.log(`[${requestId}] Audio generated:`, {
        id: interval.id,
        bufferSize: audioResult.audio.byteLength,
        generationTime: audioResult.generationTime
      });
    } catch (error) {
      console.error(`[${requestId}] Failed to generate audio:`, {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        interval: {
          id: interval.id,
          label: interval.label
        }
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate audio',
          details: error instanceof Error ? error.message : 'Unknown error in audio generation'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!audioResult.audio || audioResult.audio.byteLength === 0) {
      console.error(`[${requestId}] Generated audio buffer is empty:`, {
        interval: {
          id: interval.id,
          label: interval.label
        },
        audioResult
      });
      return new Response(
        JSON.stringify({ 
          error: 'Generated audio buffer is empty',
          details: 'The audio generation completed but produced no audio data'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Upload to UploadThing
    let uploadResponse;
    try {
      const buffer = Buffer.from(audioResult.audio);
      const filename = `${metadata.sequenceId}_${metadata.channelType}_${interval.id}.mp3`;

      console.log(`[${requestId}] Starting UploadThing upload:`, {
        filename,
        bufferSize: buffer.length,
        metadata
      });

      // Create a Blob from the buffer
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const file = new File([blob], filename, { type: 'audio/mpeg' });

      uploadResponse = await retryOperation(
        async () => {
          const response = await utapi.uploadFiles([file]);
          if (!response?.[0]?.data?.url) {
            throw new Error('Upload response missing URL');
          }
          return response;
        },
        3, // max retries
        1000 // delay between retries in ms
      );

      console.log(`[${requestId}] Audio uploaded:`, {
        id: interval.id,
        filename,
        url: uploadResponse[0].data.url,
        response: uploadResponse
      });
    } catch (error) {
      console.error(`[${requestId}] Failed to upload to UploadThing after retries:`, {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        interval: {
          id: interval.id,
          label: interval.label
        }
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload audio',
          details: error instanceof Error ? error.message : 'Unknown error in upload'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!uploadResponse?.[0]?.data?.url) {
      console.error(`[${requestId}] Upload response missing URL:`, {
        response: uploadResponse,
        interval: {
          id: interval.id,
          label: interval.label
        }
      });
      return new Response(
        JSON.stringify({ 
          error: 'Upload failed',
          details: 'Upload completed but no URL was returned'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Audio generation and upload completed successfully:`, {
      interval: {
        id: interval.id,
        label: interval.label
      },
      url: uploadResponse[0].data.url,
      generationTime: audioResult.generationTime,
      bufferSize: audioResult.audio.byteLength
    });

    return new Response(
      JSON.stringify({
        url: uploadResponse[0].data.url,
        debug: {
          requestId,
          generationTime: audioResult.generationTime,
          bufferSize: audioResult.audio.byteLength
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    // This is our last resort error handler
    console.error(`[${requestId}] Unhandled error in audio generation:`, {
      error,
      errorMessage: error instanceof Error ? error.message : 'An unexpected error occurred',
      errorStack: error instanceof Error ? error.stack : undefined,
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PUT endpoint for batch audio generation
export async function PUT(request: NextRequest) {
  try {
    const { intervals, options, metadata } = await request.json();
    console.log('Received batch audio generation request:', {
      intervalCount: intervals?.length,
      options,
      metadata
    });

    if (!intervals || !options.voiceId || !metadata) {
      console.error('Missing required parameters:', { intervals, options, metadata });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
      });
    }

    const startTime = Date.now();
    const results = [];
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

        // Create a Buffer from the ArrayBuffer
        const buffer = Buffer.from(audio);
        const filename = `${metadata.sequenceId}_${metadata.channelType}_${interval.id}.mp3`;

        // Create a File from the buffer
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const file = new File([blob], filename, { type: 'audio/mpeg' });

        // Upload to UploadThing with retries
        const uploadResponse = await retryOperation(
          async () => {
            const response = await utapi.uploadFiles([file]);
            if (!response?.[0]?.data?.url) {
              throw new Error('Upload response missing URL');
            }
            return response;
          },
          3, // max retries
          1000 // delay between retries in ms
        );

        results.push({
          id: interval.id,
          success: true,
          url: uploadResponse[0].data.url,
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

    console.log('Batch processing completed:', {
      generated: generatedCount,
      failed: intervals.length - generatedCount,
      totalGenerationTime
    });

    return new Response(
      JSON.stringify({
        results,
        debug: {
          totalGenerationTime,
          totalTime: Date.now() - startTime,
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