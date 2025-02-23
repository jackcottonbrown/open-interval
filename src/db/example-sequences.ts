import { BaseChannel, OverlayChannel } from './schema';

export const workoutSequence: BaseChannel[] = [
  {
    type: 'base',
    name: 'Exercise',
    isEnabled: true,
    volume: 1,
    intervals: [
      { type: 'base', id: 'pushups', duration: 60000, label: 'Push-ups', color: '#4CAF50' },
      { type: 'base', id: 'rest1', duration: 30000, label: 'Rest', color: '#90A4AE' },
      { type: 'base', id: 'squats', duration: 60000, label: 'Squats', color: '#4CAF50' },
      { type: 'base', id: 'rest2', duration: 30000, label: 'Rest', color: '#90A4AE' },
    ],
  },
];

export const meditationSequence: BaseChannel[] = [
  {
    type: 'base',
    name: 'Breathing',
    isEnabled: true,
    volume: 1,
    intervals: [
      { type: 'base', id: 'breathe-in', duration: 30000, label: 'Deep Breath In', color: '#2196F3' },
      { type: 'base', id: 'hold', duration: 30000, label: 'Hold', color: '#1976D2' },
      { type: 'base', id: 'breathe-out', duration: 30000, label: 'Deep Breath Out', color: '#2196F3' },
      { type: 'base', id: 'rest', duration: 30000, label: 'Rest', color: '#90A4AE' },
    ],
  },
];

export const hiitSequence: BaseChannel[] = [
  {
    type: 'base',
    name: 'Sprint Intervals',
    isEnabled: true,
    volume: 1,
    intervals: [
      { type: 'base', id: 'sprint1', duration: 30000, label: 'Sprint', color: '#F44336' },
      { type: 'base', id: 'walk1', duration: 60000, label: 'Walk', color: '#4CAF50' },
      { type: 'base', id: 'sprint2', duration: 30000, label: 'Sprint', color: '#F44336' },
      { type: 'base', id: 'walk2', duration: 60000, label: 'Walk', color: '#4CAF50' },
    ],
  },
];

export const guidedMeditationSequence: (BaseChannel | OverlayChannel)[] = [
  {
    type: 'base',
    name: 'Meditation Timer',
    isEnabled: true,
    volume: 0.3,
    intervals: [
      { type: 'base', id: 'meditate', duration: 300000, label: 'Meditate', color: '#3F51B5' },
    ],
  },
  {
    type: 'tutorial',
    name: 'Voice Guidance',
    isEnabled: true,
    volume: 1,
    intervals: [
      { type: 'overlay', id: 'intro', startTime: 0, duration: 60000, label: 'Introduction and getting comfortable', color: '#9C27B0' },
      { type: 'overlay', id: 'breathing', startTime: 60000, duration: 60000, label: 'Focus on breathing', color: '#E91E63' },
      { type: 'overlay', id: 'body', startTime: 120000, duration: 60000, label: 'Body awareness', color: '#FF5722' },
      { type: 'overlay', id: 'mindful', startTime: 180000, duration: 60000, label: 'Mindful observation', color: '#673AB7' },
      { type: 'overlay', id: 'closing', startTime: 240000, duration: 60000, label: 'Closing guidance', color: '#2196F3' },
    ],
  },
]; 