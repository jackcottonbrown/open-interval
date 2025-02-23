import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      console.error('Missing URL parameter');
      return new Response('Missing URL parameter', { status: 400 });
    }

    console.log('Proxying audio request for:', url);

    // Fetch the audio file
    const response = await fetch(url, {
      headers: {
        'Range': request.headers.get('range') || '',
        'Accept': 'audio/*'
      }
    });

    if (!response.ok && response.status !== 206) {
      console.error('Failed to fetch audio file:', {
        status: response.status,
        statusText: response.statusText,
        url
      });
      return new Response('Failed to fetch audio file', { status: response.status });
    }

    // Get the content type and other headers
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');

    console.log('Audio file details:', {
      contentType,
      contentLength,
      contentRange,
      status: response.status,
      url
    });

    // Create headers for our response
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Origin',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Accept-Ranges': 'bytes'
    });

    // Copy relevant headers from the original response
    ['content-length', 'content-range'].forEach(header => {
      const value = response.headers.get(header);
      if (value) headers.set(header, value);
    });

    // If this is a range request, ensure we're sending the correct status
    const status = response.status === 206 ? 206 : 200;

    // Stream the response
    return new Response(response.body, {
      headers,
      status
    });
  } catch (error) {
    console.error('Error proxying audio file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Origin',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 