import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { VOICE_CONFIG, COUNTDOWN_CONFIG, VoiceId } from './countdown-config';

export class AudioStorage {
  private storageDir: string;
  private initialized: boolean = false;

  constructor(baseDir: string = 'public/audio') {
    this.storageDir = baseDir;
  }

  // Initialize storage directory
  async init() {
    if (this.initialized) return;

    try {
      // Get absolute paths
      const publicDir = path.join(process.cwd(), 'public');
      const audioDir = path.join(process.cwd(), this.storageDir);

      // Create directories if they don't exist
      await fs.mkdir(publicDir, { recursive: true });
      await fs.mkdir(audioDir, { recursive: true });

      // Verify directories are writable
      try {
        const testFile = path.join(audioDir, '.test');
        await fs.writeFile(testFile, '');
        await fs.unlink(testFile);
      } catch (error) {
        throw new Error(`Audio directory is not writable: ${audioDir}`);
      }

      console.log('Audio storage initialized:', {
        publicDir,
        audioDir,
        writable: true
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio storage:', error);
      throw new Error(`Failed to initialize audio storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Generate a content-based hash for the audio file
  private generateContentHash(metadata: {
    text: string;
    voiceId: string;
    voiceSettings?: Record<string, any>;
  }): string {
    // Create a hash of the content + voice settings
    // This ensures same text + voice + settings = same file
    const contentString = JSON.stringify({
      text: metadata.text,
      voiceId: metadata.voiceId,
      voiceSettings: metadata.voiceSettings || {}
    });

    return crypto
      .createHash('sha256')
      .update(contentString)
      .digest('hex')
      .slice(0, 12);
  }

  // Create a readable prefix from text
  private createReadablePrefix(text: string): string {
    // Get first few words (up to 5)
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
      .split(/\s+/)                  // Split into words
      .filter(word => word.length > 0);  // Remove empty strings

    let prefix: string;
    
    if (words.length <= 3) {
      // For short text, use all words
      prefix = words.join('-');
    } else {
      // For longer text, use first 3 words + word count
      prefix = `${words.slice(0, 3).join('-')}-${words.length}w`;
    }

    // Ensure prefix isn't too long
    return prefix.slice(0, 50);
  }

  // Generate filename for audio content
  private generateFilename(metadata: {
    text: string;
    voiceId: string;
    voiceSettings?: Record<string, any>;
  }): { filename: string; hash: string } {
    const hash = this.generateContentHash(metadata);
    const prefix = this.createReadablePrefix(metadata.text);
    return {
      filename: `${prefix}-${hash}.mp3`,
      hash
    };
  }

  // Check if audio file exists for given content
  async getExistingAudioUrl(metadata: {
    text: string;
    voiceId: string;
    voiceSettings?: Record<string, any>;
  }): Promise<string | null> {
    await this.init();

    const { filename, hash } = this.generateFilename(metadata);
    const filepath = path.join(process.cwd(), this.storageDir, filename);

    try {
      await fs.access(filepath);
      return `/audio/${filename}`;
    } catch {
      // Check for any file with matching hash (in case prefix changed)
      const files = await fs.readdir(path.join(process.cwd(), this.storageDir));
      const existingFile = files.find(f => f.endsWith(`${hash}.mp3`));
      if (existingFile) {
        return `/audio/${existingFile}`;
      }
      return null;
    }
  }

  // Save audio buffer and return public URL
  async saveAudio(
    audioBuffer: ArrayBuffer,
    metadata: {
      text: string;
      voiceId: string;
      voiceSettings?: Record<string, any>;
    }
  ): Promise<string> {
    await this.init();

    try {
      const { filename, hash } = this.generateFilename(metadata);
      const filepath = path.join(process.cwd(), this.storageDir, filename);

      // Check if file with same hash exists (might have different prefix)
      const files = await fs.readdir(path.join(process.cwd(), this.storageDir));
      const existingFile = files.find(f => f.endsWith(`${hash}.mp3`));
      
      if (existingFile) {
        // Verify the existing file is readable
        try {
          await fs.access(path.join(process.cwd(), this.storageDir, existingFile), fs.constants.R_OK);
          return `/audio/${existingFile}`;
        } catch {
          console.log('Existing file not readable, will recreate:', existingFile);
        }
      }

      // Save new file
      try {
        await fs.writeFile(filepath, Buffer.from(audioBuffer));
        
        // Verify file was written correctly
        const stats = await fs.stat(filepath);
        if (stats.size === 0) {
          throw new Error('File was written but is empty');
        }

        // Verify file is readable
        await fs.access(filepath, fs.constants.R_OK);
        
        console.log('Audio file saved successfully:', {
          filename,
          size: stats.size,
          path: filepath,
          url: `/audio/${filename}`
        });

        return `/audio/${filename}`;
      } catch (error) {
        throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Failed to save audio file:', error);
      throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Delete unused audio files (files not referenced by any interval)
  async cleanupUnusedAudio(usedHashes: Set<string>): Promise<void> {
    await this.init();

    try {
      const files = await fs.readdir(path.join(process.cwd(), this.storageDir));
      
      for (const file of files) {
        // Extract hash from filename (last 12 chars before .mp3)
        const hash = file.slice(-16, -4);
        if (!usedHashes.has(hash)) {
          await fs.unlink(path.join(process.cwd(), this.storageDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to cleanup unused audio:', error);
      // Don't throw - failing to cleanup is not critical
    }
  }

  // Get debug info about storage
  async getStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    files: Array<{
      name: string;
      size: number;
      created: Date;
      hash: string;
      text: string;
    }>;
  }> {
    await this.init();

    try {
      const dirPath = path.join(process.cwd(), this.storageDir);
      const files = await fs.readdir(dirPath);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(path.join(dirPath, file));
          const hash = file.slice(-16, -4);
          const text = file.slice(0, -17).replace(/-/g, ' '); // Convert filename back to readable text
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            hash,
            text
          };
        })
      );

      return {
        totalFiles: files.length,
        totalSize: fileStats.reduce((sum, f) => sum + f.size, 0),
        files: fileStats
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        files: []
      };
    }
  }

  // Clean up old audio files for an interval
  async cleanupIntervalAudio(intervalId: string): Promise<void> {
    await this.init();

    try {
      const files = await fs.readdir(path.join(process.cwd(), this.storageDir));
      
      // Find files that might be associated with this interval
      // This is a best-effort cleanup since we don't store the interval ID in the filename
      for (const file of files) {
        try {
          const stats = await fs.stat(path.join(process.cwd(), this.storageDir, file));
          const ageInHours = (Date.now() - stats.birthtimeMs) / (1000 * 60 * 60);
          
          // Delete files older than 24 hours
          if (ageInHours > 24) {
            await fs.unlink(path.join(process.cwd(), this.storageDir, file));
            console.log('Deleted old audio file:', file);
          }
        } catch (error) {
          console.error('Error checking file:', file, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup interval audio:', error);
      // Don't throw - failing to cleanup is not critical
    }
  }

  // Get countdown audio file paths
  getCountdownAudioPaths(): { [key: string]: string } {
    // Import from countdown config
    const { getAllCountdownPaths } = require('./countdown-config');
    return getAllCountdownPaths().rachel; // Default to Rachel's voice
  }

  // Get countdown audio file paths for a specific voice
  getCountdownAudioPathsForVoice(voiceId: string): { [key: string]: string } {
    const { getAllCountdownPaths } = require('./countdown-config');
    const paths = getAllCountdownPaths();
    const voiceKey = Object.entries(VOICE_CONFIG)
      .find(([_, config]) => config.id === voiceId)?.[0] as VoiceId | undefined;
    return voiceKey ? paths[voiceKey] : paths.rachel;
  }

  // Generate countdown audio files for all voices
  async generateCountdownAudio(audioService: any): Promise<void> {
    // Create countdown directory structure
    const countdownDir = path.join(process.cwd(), this.storageDir, 'countdown');
    await fs.mkdir(countdownDir, { recursive: true });

    // Create voice-specific directories
    for (const [_, voice] of Object.entries(VOICE_CONFIG)) {
      const voiceDir = path.join(countdownDir, voice.name.toLowerCase());
      await fs.mkdir(voiceDir, { recursive: true });
    }

    const numbers = ['three', 'two', 'one'] as const;

    for (const [_, voice] of Object.entries(VOICE_CONFIG)) {
      const voiceDir = path.join('countdown', voice.name.toLowerCase());
      
      for (const number of numbers) {
        try {
          const result = await audioService.generateIntervalAudio(
            {
              id: `countdown-${number}-${voice.name.toLowerCase()}`,
              label: number,
              style: {},
              duration: COUNTDOWN_CONFIG.INTERVAL
            },
            {
              voiceId: voice.id,
              voiceSettings: voice.settings
            }
          );

          // Save to voice-specific directory
          const filename = `${number}.mp3`;
          const filepath = path.join(process.cwd(), this.storageDir, voiceDir, filename);
          await fs.writeFile(filepath, Buffer.from(result.audio));

          console.log(`Generated ${number} countdown for ${voice.name}`);
        } catch (error) {
          console.error(`Failed to generate ${number} countdown for ${voice.name}:`, error);
        }
      }
    }
  }
} 