import { UTApi } from "uploadthing/server";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN;

if (!UPLOADTHING_TOKEN) {
  console.error("Error: UPLOADTHING_TOKEN not found in environment variables");
  process.exit(1);
}

const utapi = new UTApi();

async function listAllFiles() {
  try {
    console.log('Fetching all files from UploadThing...');
    const response = await utapi.listFiles();
    
    console.log(`\nFound ${response.files.length} total files:`);
    for (const file of response.files) {
      console.log(`\nFile: ${file.name}`);
      console.log(`Key: ${file.key}`);
      console.log(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Status: ${file.status}`);
      console.log(`Uploaded: ${new Date(file.uploadedAt).toLocaleString()}`);
      if (file.customId) {
        console.log(`Custom ID: ${file.customId}`);
      }
    }

    // Group files by sequence ID
    const filesBySequence = response.files.reduce((acc, file) => {
      const match = file.name.match(/^(\d+)_/);
      if (match) {
        const seqId = match[1];
        if (!acc[seqId]) {
          acc[seqId] = [];
        }
        acc[seqId].push(file);
      }
      return acc;
    }, {} as Record<string, Array<(typeof response.files)[number]>>);

    console.log('\nFiles grouped by sequence:');
    for (const [seqId, files] of Object.entries(filesBySequence)) {
      console.log(`\nSequence ${seqId}: ${files.length} files`);
    }

  } catch (error) {
    console.error("Error listing files:", error);
    process.exit(1);
  }
}

async function listSequenceAudio(sequenceId: string) {
  try {
    console.log(`\nFetching audio files for sequence ${sequenceId}...`);
    
    // Get all files from UploadThing
    const response = await utapi.listFiles();
    
    // Filter files for this sequence - match pattern: {sequenceId}_{channelType}_{intervalId}.mp3
    const sequenceFiles = response.files.filter(file => 
      file.name.startsWith(`${sequenceId}_`) && 
      file.name.endsWith('.mp3')
    );

    if (sequenceFiles.length === 0) {
      console.log(`No audio files found for sequence ${sequenceId}`);
      return;
    }

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Get URLs for all files
    const keys = sequenceFiles.map(file => file.key);
    const urlResponse = await utapi.getFileUrls(keys);

    // Group files by channel type
    const filesByChannel = sequenceFiles.reduce((acc, file) => {
      const [, channelType] = file.name.split('_');
      if (!acc[channelType]) {
        acc[channelType] = [];
      }
      acc[channelType].push(file);
      return acc;
    }, {} as Record<string, typeof sequenceFiles>);

    // Prepare report data
    const report = {
      sequenceId,
      totalFiles: sequenceFiles.length,
      totalSize: sequenceFiles.reduce((sum, file) => sum + file.size, 0),
      channels: Object.entries(filesByChannel).map(([channelType, files]) => ({
        channelType,
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        files: files.map(file => {
          const urlData = urlResponse.data.find(item => item.key === file.key);
          return {
            name: file.name,
            key: file.key,
            url: urlData?.url,
            size: file.size,
            uploadedAt: file.uploadedAt,
            status: file.status,
            customId: file.customId
          };
        })
      }))
    };

    // Save report to file
    const reportPath = path.join(reportsDir, `sequence_${sequenceId}_audio_files.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Log results
    console.log(`\nFound ${sequenceFiles.length} audio files for sequence ${sequenceId}:`);
    
    for (const [channelType, files] of Object.entries(filesByChannel)) {
      console.log(`\nChannel: ${channelType} (${files.length} files)`);
      for (const file of files) {
        const urlData = urlResponse.data.find(item => item.key === file.key);
        console.log(`\n  File: ${file.name}`);
        console.log(`  Key: ${file.key}`);
        console.log(`  URL: ${urlData?.url}`);
        console.log(`  Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Status: ${file.status}`);
        console.log(`  Uploaded: ${new Date(file.uploadedAt).toLocaleString()}`);
        if (file.customId) {
          console.log(`  Custom ID: ${file.customId}`);
        }
      }
    }

    console.log(`\nDetailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error("Error listing audio files:", error);
    process.exit(1);
  }
}

// Get sequence ID from command line arguments
const sequenceId = process.argv[2];

if (!sequenceId) {
  // If no sequence ID provided, list all files
  listAllFiles();
} else {
  // Otherwise list files for the specific sequence
  listSequenceAudio(sequenceId);
} 