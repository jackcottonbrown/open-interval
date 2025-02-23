import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    // Use environment variable for token
    token: process.env.UPLOADTHING_TOKEN,
    // Enable more verbose logging in development
    logLevel: process.env.NODE_ENV === 'development' ? 'Debug' : 'Info',
    // Use pretty logging in development, JSON in production
    logFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'json',
    // Automatically detect if we're in development
    isDev: process.env.NODE_ENV === 'development',
  }
}); 