// Voice settings type for ElevenLabs API
export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

export type CountdownVoice = {
  name: string;
  label: string;
  directory: string;
};

export const COUNTDOWN_VOICES: CountdownVoice[] = [
  {
    name: 'rachel',
    label: 'Rachel',
    directory: '/audio/countdown/rachel'
  },
  {
    name: 'domi',
    label: 'Domi',
    directory: '/audio/countdown/domi'
  },
  {
    name: 'bella',
    label: 'Bella',
    directory: '/audio/countdown/bella'
  },
  {
    name: 'dorothy',
    label: 'Dorothy',
    directory: '/audio/countdown/dorothy'
  },
  {
    name: 'josh',
    label: 'Josh',
    directory: '/audio/countdown/josh'
  }
];

export const COUNTDOWN_CONFIG = {
  START_TIME: 3000, // 3 seconds before interval
  DURATION: 3000,   // Total duration of countdown audio
  VOLUME: 0.7,      // 70% of main audio volume
  DEFAULT_VOICE: 'rachel'
} as const;

export type VoiceConfig = {
  id: string;
  name: string;
  settings: VoiceSettings;
};

export type VoiceId = 'rachel' | 'domi' | 'bella' | 'dorothy' | 'josh';

export const VOICE_CONFIG: Record<VoiceId, VoiceConfig> = {
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  domi: {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  bella: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  dorothy: {
    id: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  josh: {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  }
};

export function getCountdownPath(voiceId: VoiceId) {
  const voice = VOICE_CONFIG[voiceId];
  return `/audio/countdown/${voice.name.toLowerCase()}/countdown.mp3`;
}

export function getAllCountdownPaths() {
  const paths: Record<VoiceId, string> = {} as any;
  
  (Object.keys(VOICE_CONFIG) as VoiceId[]).forEach(voiceId => {
    paths[voiceId] = getCountdownPath(voiceId);
  });

  return paths;
} 