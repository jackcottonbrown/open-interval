// Convert AudioBuffer to WAV format
// Based on https://github.com/Jam3/audiobuffer-to-wav
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = interleave(buffer);
  const dataBytes = data.length * bytesPerSample;
  const headerBytes = 44;
  const totalBytes = headerBytes + dataBytes;
  
  const wav = new ArrayBuffer(totalBytes);
  const view = new DataView(wav);
  
  // RIFF identifier 'RIFF'
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier length and file description length
  view.setUint32(4, totalBytes - 8, true);
  // RIFF type 'WAVE'
  writeString(view, 8, 'WAVE');
  // format chunk identifier 'fmt '
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier 'data'
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataBytes, true);
  
  // Write the PCM samples
  const offset = 44;
  for (let i = 0; i < data.length; i++) {
    view.setInt16(offset + (i * bytesPerSample), data[i] * 0x7FFF, true);
  }
  
  return wav;
}

// Helper function to write a string to a DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Helper function to interleave audio channels
function interleave(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels;
  const result = new Float32Array(length);
  
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    for (let channel = 0; channel < numChannels; channel++) {
      result[index++] = buffer.getChannelData(channel)[inputIndex];
    }
    inputIndex++;
  }
  
  return result;
} 