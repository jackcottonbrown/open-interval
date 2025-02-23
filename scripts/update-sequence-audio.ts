import { UTApi } from "uploadthing/server";
import * as dotenv from "dotenv";
import path from "path";
import { db } from "../src/db/db";
import { sequences } from "../src/db/schema";
import { eq } from "drizzle-orm";
import type { Channel, BaseInterval, OverlayInterval } from "../src/db/schema";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN;

if (!UPLOADTHING_TOKEN) {
  console.error("Error: UPLOADTHING_TOKEN not found in environment variables");
  process.exit(1);
}

const utapi = new UTApi();

type AudioFile = {
  name: string;
  key: string;
  url?: string;
  size: number;
  uploadedAt: number;
  status: string;
};

async function updateSequenceAudio(sequenceId: string) {
  try {
    console.log(`\nFetching sequence ${sequenceId} from database...`);
    
    // Get sequence from database
    const sequence = await db.query.sequences.findFirst({
      where: eq(sequences.id, parseInt(sequenceId)),
    });

    if (!sequence) {
      console.error(`Sequence ${sequenceId} not found in database`);
      process.exit(1);
    }

    console.log(`Found sequence: ${sequence.name}`);

    // Get all files from UploadThing
    console.log('\nFetching files from UploadThing...');
    const response = await utapi.listFiles();
    
    // Filter and group files by channel and interval
    const audioFiles = response.files
      .filter(file => 
        file.name.startsWith(`${sequenceId}_`) && 
        file.name.endsWith('.mp3')
      )
      .sort((a, b) => b.uploadedAt - a.uploadedAt); // Sort by newest first

    // Get URLs for all files
    console.log('\nFetching file URLs...');
    const keys = audioFiles.map(file => file.key);
    const urlResponse = await utapi.getFileUrls(keys);

    // Create a map of filename pattern to URL
    const audioFileMap = new Map<string, string>();
    
    audioFiles.forEach(file => {
      const [, channelType, intervalId] = file.name.split('_');
      const pattern = `${channelType}_${intervalId}`;
      
      // Only add if not already present (keeps newest due to sort above)
      if (!audioFileMap.has(pattern)) {
        const urlData = urlResponse.data.find(item => item.key === file.key);
        if (urlData?.url) {
          audioFileMap.set(pattern, urlData.url);
        }
      }
    });

    // Update sequence channels
    const updatedChannels = sequence.channels.map(channel => ({
      ...channel,
      intervals: channel.intervals.map(interval => {
        const pattern = `${channel.type}_${interval.id}.mp3`;
        const url = audioFileMap.get(pattern);
        
        if (url) {
          return {
            ...interval,
            audioFile: url
          };
        }
        return interval;
      })
    }));

    // Update sequence in database
    console.log('\nUpdating sequence in database...');
    const [updatedSequence] = await db.update(sequences)
      .set({
        channels: updatedChannels as Channel[],
        updatedAt: new Date(),
      })
      .where(eq(sequences.id, parseInt(sequenceId)))
      .returning();

    console.log('\nSequence updated successfully!');
    console.log('\nSummary of updates:');
    
    updatedChannels.forEach(channel => {
      const withAudio = channel.intervals.filter(int => int.audioFile).length;
      const total = channel.intervals.length;
      console.log(`${channel.type} channel: ${withAudio}/${total} intervals have audio`);
    });

  } catch (error) {
    console.error("Error updating sequence audio:", error);
    process.exit(1);
  }
}

// Get sequence ID from command line arguments
const sequenceId = process.argv[2];

if (!sequenceId) {
  console.error("Please provide a sequence ID as an argument");
  console.log("Usage: npm run update-sequence-audio <sequenceId>");
  process.exit(1);
}

updateSequenceAudio(sequenceId); 