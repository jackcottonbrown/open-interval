import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export type UploadMetadata = {
  sequenceId: string;
  sequenceName: string;
  intervalId: string;
  channelType: string;
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  audioUploader: f({ audio: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(async ({ req, input }) => {
      const metadata = input as UploadMetadata;
      
      // Validate metadata
      if (!metadata.sequenceId || !metadata.sequenceName || !metadata.intervalId) {
        throw new Error('Missing required metadata');
      }

      return metadata;
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Create a consistent file name for overwriting
      const folderPath = `sequences/${metadata.sequenceId}/${metadata.channelType}`;
      const fileName = `${metadata.intervalId}.mp3`; // Always use .mp3 extension for consistency
      
      // Log the upload details
      console.log("Upload complete (overwrite):", {
        sequence: metadata.sequenceName,
        channel: metadata.channelType,
        interval: metadata.intervalId,
        url: file.url,
        path: `${folderPath}/${fileName}`,
      });
      
      return { 
        url: file.url,
        path: `${folderPath}/${fileName}`,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 