// Core interval properties that all intervals share
interface IntervalCore {
  id: string;
  label: string;        // display text
  spokenLabel?: string; // optional override for TTS
  color: string;        // CSS color value
  audioFile?: string;   // optional path to audio file
  volume?: number;      // 0-1 scale, defaults to 1
  notes?: string;       // user-written notes/instructions/reminders
  imageUrl?: string;    // optional image URL
  imageAlt?: string;    // optional image alt text
  imageCaption?: string; // optional image caption
}

// Base intervals are used for the main sequence and have countdown functionality
export interface BaseInterval extends IntervalCore {
  type: 'base';
  duration: number;     // milliseconds
}

// Overlay intervals trigger at specific times during the sequence
export interface OverlayInterval extends IntervalCore {
  type: 'overlay';
  startTime: number;    // milliseconds from sequence start
  duration: number;     // milliseconds
}

// Union type for any interval
export type Interval = BaseInterval | OverlayInterval; 