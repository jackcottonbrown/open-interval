import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Validate environment variables
if (!process.env.UPLOADTHING_TOKEN) {
  throw new UploadThingError(
    'Missing UploadThing token. Please ensure UPLOADTHING_TOKEN is set in your environment variables.'
  );
}

const f = createUploadthing();

// Define input validation schema
const uploadInputSchema = z.object({
  sequenceId: z.string(),
  sequenceName: z.string(),
  intervalId: z.string(),
  channelType: z.string()
});

export type UploadMetadata = z.infer<typeof uploadInputSchema>;

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  audioUploader: f({
    audio: {
      maxFileSize: "32MB",
      maxFileCount: 1,
      contentDisposition: 'inline'
    }
  })
    .input(uploadInputSchema)
    .middleware(async ({ req, input }) => {
      try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
          throw new UploadThingError("You must be logged in to upload files");
        }

        // Log incoming request for debugging
        console.log('Upload middleware input:', { userId, input });

        // Return validated metadata and userId
        return {
          userId,
          ...input
        };
      } catch (error) {
        console.error('Error in upload middleware:', error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Starting onUploadComplete with:', { metadata, file });
      
      try {
        if (!metadata || !file) {
          console.error('Missing metadata or file in onUploadComplete:', { metadata, file });
          throw new UploadThingError('Missing metadata or file data');
        }

        // Create a consistent file name for overwriting
        const folderPath = `sequences/${metadata.sequenceId}/${metadata.channelType}`;
        const fileName = `${metadata.intervalId}.mp3`; // Always use .mp3 extension for consistency
        const fullPath = `${folderPath}/${fileName}`;
        
        // Log the upload details
        console.log("Upload complete:", {
          userId: metadata.userId,
          sequence: metadata.sequenceName,
          channel: metadata.channelType,
          interval: metadata.intervalId,
          url: file.url,
          path: fullPath,
        });
        
        // Return both the URL and the constructed path
        return { 
          url: file.url,
          path: fullPath
        };
      } catch (error) {
        // Log the full error details
        console.error('Error in onUploadComplete:', {
          error,
          metadata,
          file,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Rethrow with more context
        throw new UploadThingError(
          `Failed to process upload: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 