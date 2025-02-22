import { useState } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import type { UploadMetadata } from '@/app/api/uploadthing/core';

type UploadStatus = {
  isUploading: boolean;
  progress: number;
  error?: string;
};

export function useAudioUpload() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
  });

  const { startUpload, permittedFileInfo } = useUploadThing("audioUploader", {
    onUploadProgress: (progress) => {
      setUploadStatus(prev => ({
        ...prev,
        progress: progress,
      }));
    },
    onUploadBegin: () => {
      setUploadStatus({
        isUploading: true,
        progress: 0,
      });
    },
    onUploadError: (error) => {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        error: error.message,
      });
    },
  });

  const uploadAudio = async (file: File, metadata: UploadMetadata): Promise<string> => {
    try {
      const response = await startUpload([file], { 
        ...metadata,
      });
      
      if (!response || response.length === 0) {
        throw new Error('Upload failed');
      }
      
      return response[0].url;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
      throw error;
    } finally {
      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
      }));
    }
  };

  return {
    uploadAudio,
    uploadStatus,
    permittedFileInfo,
  };
} 