import { useState, useCallback, useEffect } from 'react';
import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import type { UploadMetadata } from '@/app/api/uploadthing/core';

type UploadStatus = {
  isUploading: boolean;
  progress: number;
  error?: string;
};

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export function useAudioUpload() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
  });

  // Keep track of successful uploads even if webhook fails
  const [lastSuccessfulUpload, setLastSuccessfulUpload] = useState<{ url: string } | null>(null);

  const { startUpload, isUploading, uploadProgress } = useUploadThing("audioUploader", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        // Store the successful upload
        setLastSuccessfulUpload(res[0]);
      }
      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
      }));
    },
    onUploadError: (error) => {
      // If it's just a webhook callback error and we have a successful upload, don't treat it as an error
      if (error.message?.includes('Failed to forward callback request') && lastSuccessfulUpload) {
        console.log('Upload completed successfully, ignoring webhook callback error');
        return;
      }
      
      console.error('UploadThing error:', error);
      setUploadStatus({
        isUploading: false,
        progress: 0,
        error: error.message,
      });
    },
  });

  // Update upload status based on uploadProgress
  useEffect(() => {
    if (isUploading && typeof uploadProgress === 'number') {
      setUploadStatus(prev => ({
        ...prev,
        isUploading: true,
        progress: uploadProgress,
      }));
    }
  }, [isUploading, uploadProgress]);

  const uploadAudio = async (file: File, metadata: UploadMetadata): Promise<string> => {
    try {
      console.log('Starting upload with metadata:', metadata);
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Reset states before starting new upload
      setLastSuccessfulUpload(null);
      setUploadStatus({
        isUploading: true,
        progress: 0,
      });

      // Pass metadata directly to startUpload
      const response = await startUpload([file], metadata);

      // If we have a lastSuccessfulUpload from the callback, use that
      if (lastSuccessfulUpload?.url) {
        console.log('Using URL from successful upload callback:', lastSuccessfulUpload.url);
        return lastSuccessfulUpload.url;
      }
      
      // Otherwise check the response
      if (!response || !Array.isArray(response) || response.length === 0) {
        console.error('Invalid upload response:', response);
        throw new Error('Upload failed - invalid response format');
      }

      const uploadedFile = response[0];
      if (!uploadedFile || typeof uploadedFile !== 'object') {
        console.error('Invalid uploaded file format:', uploadedFile);
        throw new Error('Upload failed - invalid file format in response');
      }

      console.log('Upload successful:', uploadedFile);
      
      // Ensure we have a valid URL
      if (!uploadedFile.url) {
        console.error('No URL in upload response:', uploadedFile);
        throw new Error('Upload succeeded but no URL was returned');
      }

      // Ensure the URL is properly formatted
      try {
        new URL(uploadedFile.url);
      } catch (error) {
        console.error('Invalid URL returned from UploadThing:', uploadedFile.url);
        throw new Error('Invalid URL returned from upload');
      }
      
      return uploadedFile.url;
    } catch (error) {
      // If we have a successful upload despite the error, use that
      if (lastSuccessfulUpload?.url) {
        console.log('Using fallback URL from successful upload:', lastSuccessfulUpload.url);
        return lastSuccessfulUpload.url;
      }

      console.error('Upload error details:', {
        error,
        metadata,
        file: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        stack: error instanceof Error ? error.stack : undefined
      });

      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        // Check for authentication errors
        if (error.message.includes('logged in')) {
          errorMessage = 'Please sign in to upload files';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  };

  return {
    uploadAudio,
    uploadStatus: {
      isUploading,
      progress: uploadProgress || 0,
      error: uploadStatus.error,
    },
  };
} 