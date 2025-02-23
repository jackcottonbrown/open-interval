import { db } from './db';
import { sequences } from './schema';
import { workoutSequence, meditationSequence, hiitSequence, guidedMeditationSequence } from './example-sequences';

const USER_ID = 'user_2tNPooJBjU4mja9G8b3XD3FGJLe';

async function seedSequences() {
  try {
    console.log('Starting to seed sequences...');
    console.log('Using user ID:', USER_ID);

    // Insert workout sequence
    const workoutResult = await db.insert(sequences).values({
      userId: USER_ID,
      name: 'Basic Workout',
      description: 'A simple workout routine with push-ups and squats',
      isPublic: true,
      channels: workoutSequence,
      tags: ['workout', 'beginner', 'strength'],
      config: {},
    }).returning();

    console.log('Inserted workout sequence:', workoutResult[0].id);

    // Insert meditation sequence
    const meditationResult = await db.insert(sequences).values({
      userId: USER_ID,
      name: 'Mindful Meditation',
      description: 'A calming meditation session with breathing exercises',
      isPublic: true,
      channels: meditationSequence,
      tags: ['meditation', 'mindfulness', 'breathing'],
      config: {},
    }).returning();

    console.log('Inserted meditation sequence:', meditationResult[0].id);

    // Insert HIIT sequence
    const hiitResult = await db.insert(sequences).values({
      userId: USER_ID,
      name: 'HIIT Sprint Workout',
      description: 'High-intensity interval training with sprints and walking recovery',
      isPublic: true,
      channels: hiitSequence,
      tags: ['hiit', 'cardio', 'sprint'],
      config: {},
    }).returning();

    console.log('Inserted HIIT sequence:', hiitResult[0].id);

    console.log('Successfully seeded all sequences!');
  } catch (error) {
    console.error('Error seeding sequences:', error);
    throw error;
  }
}

// Function to add just the guided meditation sequence
async function addGuidedMeditation() {
  try {
    console.log('Adding guided meditation sequence...');
    console.log('Using user ID:', USER_ID);

    const result = await db.insert(sequences).values({
      userId: USER_ID,
      name: 'Guided 5-Minute Meditation',
      description: 'A gentle guided meditation with continuous voice guidance, perfect for beginners or quick relaxation breaks',
      isPublic: true,
      channels: guidedMeditationSequence,
      tags: ['meditation', 'guided', 'relaxation', 'mindfulness', 'voice-guided'],
      config: {},
    }).returning();

    console.log('Successfully added guided meditation sequence:', result[0].id);
    return result[0];
  } catch (error) {
    console.error('Error adding guided meditation sequence:', error);
    throw error;
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  // Check for command line argument
  const shouldSeedAll = process.argv.includes('--seed-all');
  
  if (shouldSeedAll) {
    seedSequences()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Failed to seed sequences:', error);
        process.exit(1);
      });
  } else {
    addGuidedMeditation()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Failed to add guided meditation:', error);
        process.exit(1);
      });
  }
} 