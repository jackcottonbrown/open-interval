import { AudioService } from '../src/lib/audio-service';
import { VOICE_CONFIG, VoiceId } from '../src/lib/countdown-config';
import { writeFileSync } from 'fs';
import path from 'path';

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is required');
}

const audioService = new AudioService();

async function generateCountdownAudio() {
  console.log('Generating countdown audio files...\n');

  // Add pauses between numbers using SSML
  const countdownText = `<speak>
    three
    <break time="1s"/>
    two
    <break time="1s"/>
    one
  </speak>`;

  for (const [voiceId, voice] of Object.entries(VOICE_CONFIG)) {
    try {
      console.log(`Generating audio for ${voice.name}...`);
      
      const { audio } = await audioService.generateIntervalAudio(
        {
          id: 'countdown',
          label: countdownText,
          type: 'base',
          duration: 3000,
          color: '#000000'
        },
        {
          voiceId: voice.id,
          voiceSettings: voice.settings
        }
      );

      // Save the file
      const filePath = path.join(process.cwd(), 'public', 'audio', 'countdown', voice.name.toLowerCase(), 'countdown.mp3');
      writeFileSync(filePath, Buffer.from(audio));
      console.log(`✅ Saved countdown audio for ${voice.name}\n`);
    } catch (error) {
      console.error(`❌ Failed to generate audio for ${voice.name}:`, error);
    }
  }

  console.log('Done generating countdown audio files!');
}

generateCountdownAudio().catch(console.error); 