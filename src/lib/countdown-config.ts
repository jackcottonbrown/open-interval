import { VoiceSettings } from './elevenlabs';

export const COUNTDOWN_CONFIG = {
  START_TIME: 3000, // 3 seconds before interval
  INTERVAL: 1000,   // 1 second between numbers
  VOLUME: 0.7,      // 70% of main audio volume
} as const;

export const VOICE_CONFIG = {
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    } as VoiceSettings
  },
  domi: {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    } as VoiceSettings
  },
  bella: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    } as VoiceSettings
  },
  antoni: {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    } as VoiceSettings
  }
} as const;

export type VoiceId = keyof typeof VOICE_CONFIG;

export function getCountdownPath(number: 'one' | 'two' | 'three', voiceId: VoiceId) {
  const voice = VOICE_CONFIG[voiceId];
  return `/audio/countdown/${voice.name.toLowerCase()}/${number}.mp3`;
}

export function getAllCountdownPaths() {
  const paths: Record<VoiceId, Record<'one' | 'two' | 'three', string>> = {} as any;
  
  (Object.keys(VOICE_CONFIG) as VoiceId[]).forEach(voiceId => {
    paths[voiceId] = {
      one: getCountdownPath('one', voiceId),
      two: getCountdownPath('two', voiceId),
      three: getCountdownPath('three', voiceId)
    };
  });

  return paths;
} 