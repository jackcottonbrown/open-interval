import type { Channel as DbChannel, BaseInterval as DbBaseInterval, OverlayInterval as DbOverlayInterval } from '@/db/schema';

// Player-specific interval types that extend the database types
export interface PlayerIntervalCore {
  id: string;
  name: string;
  audioFile?: string;
  volume?: number;
  color?: string;
}

export interface PlayerBaseInterval {
  id: string;
  type: 'base';
  label: string;         // Written label (required)
  spokenLabel?: string;  // Spoken label (optional)
  duration: number;      // Duration in milliseconds
  audioFile?: string;
  volume?: number;
  color?: string;
}

export interface PlayerOverlayInterval {
  id: string;
  type: 'overlay';
  label: string;         // Written label (required)
  spokenLabel?: string;  // Spoken label (optional)
  startTime: number;     // Start time in milliseconds relative to sequence start
  duration: number;
  audioFile?: string;
  volume?: number;
  color?: string;
}

export type PlayerInterval = PlayerBaseInterval | PlayerOverlayInterval;

// Player-specific channel type
export interface PlayerChannel {
  type: string;           // e.g., 'base' or 'overlay'
  name: string;           // Channel name – not conflicting with interval labels
  volume?: number;
  countdownVoice?: string; // Added optional property for countdown audio URL
  intervals: PlayerInterval[];
}

// Compiled audio types
export interface CompiledChannel {
  type: string;
  name: string;
  audioBlob: Blob;
  format: string;
  intervals: {
    interval: PlayerInterval;
    audioBlob: Blob;
  }[];
  volume?: number;
}

// Player props and state types
export interface PlayerProps {
  channels: PlayerChannel[];
  sequenceId: string | number;
  onTimeUpdate?: (currentTime: number) => void;
  onIntervalUpdate?: (channelType: string, intervalId: string, updates: { name: string }) => void;
}

export interface LoadingStatus {
  total: number;
  loaded: number;
  failed: number;
  errors: string[];
}

export interface CompilationStatus {
  isCompiling: boolean;
  progress: number;
  error?: string;
}

// Audio track types
export interface AudioTrack {
  id: string;
  howl: Howl;
  channelType: PlayerChannel['type'];
  startTime: number;
  duration: number;
  volume: number;
  isLoaded: boolean;
  error?: string;
} 