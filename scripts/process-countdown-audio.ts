import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { COUNTDOWN_VOICES } from '../src/lib/countdown-config';

// Ensure all voice directories exist
COUNTDOWN_VOICES.forEach(voice => {
  const dir = path.join(process.cwd(), 'public', 'audio', 'countdown', voice.name);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

console.log('✅ Created voice directories');
console.log('\nPlease add a countdown.mp3 file for each voice:');
console.log('The file should be a 3-second audio clip containing "three, two, one"');
console.log('Each number should be spoken at 1-second intervals\n');
console.log('Place the countdown.mp3 files in these directories:');
COUNTDOWN_VOICES.forEach(voice => {
  console.log(`public/audio/countdown/${voice.name}/`);
}); 