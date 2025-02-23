import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return new Response('Missing URL parameter', { status: 400 });
    }

    // Validate that this is an UploadThing URL
    if (!url.includes('ufs.sh/f/') && !url.includes('utfs.io/f/')) {
      return new Response('Invalid URL - must be an UploadThing URL', { status: 400 });
    }

    // Fetch the audio file
    const response = await fetch(url);
    if (!response.ok) {
      return new Response('Failed to fetch audio file', { status: response.status });
    }

    // Get the content type and other headers
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Create headers for our response
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Stream the response
    return new Response(response.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error('Error proxying audio file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 