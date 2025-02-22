'use client';

import { useState } from 'react';
import { ChannelEditor } from '@/components/channel-editor/ChannelEditor';
import { pushupSequence } from '@/db/example-sequences';

export default function TestSequencePage() {
  const [sequence, setSequence] = useState(pushupSequence);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Sequence Editor Test</h1>
          <p className="text-gray-400 mt-2">
            Test the sequence editor with the example push-up workout sequence.
            Try playing the sequence, editing intervals, and adjusting channel volumes.
          </p>
        </div>

        {/* Channel Editor */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          <ChannelEditor
            sequence={sequence}
            onSequenceUpdate={(updatedSequence) => {
              setSequence(updatedSequence);
              console.log('Sequence updated:', updatedSequence);
            }}
          />
        </div>

        {/* Debug Panel */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Debug Panel</h2>
            <button
              onClick={() => setSequence(pushupSequence)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 
                       active:bg-indigo-700 transition-colors"
            >
              Reset to Original
            </button>
          </div>
          <div className="bg-gray-900 rounded-md p-4 overflow-auto max-h-96">
            <pre className="text-sm text-gray-300 font-mono">
              {JSON.stringify(sequence, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 