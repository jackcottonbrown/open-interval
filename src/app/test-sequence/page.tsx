'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChannelEditor } from '@/components/channel-editor/ChannelEditor';
import type { Sequence } from '@/components/channel-editor/ChannelEditor';
import { useSequences } from '@/hooks/useSequences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function TestSequencePage() {
  const { fetchSequences, fetchSequence, updateSequence } = useSequences();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load sequences on mount
  useEffect(() => {
    fetchSequences().then(setSequences);
  }, []);

  // Load selected sequence
  useEffect(() => {
    if (!selectedSequenceId) {
      setSequence(null);
      return;
    }

    setIsLoading(true);
    fetchSequence(parseInt(selectedSequenceId))
      .then(setSequence)
      .finally(() => setIsLoading(false));
  }, [selectedSequenceId]);

  // Handle sequence updates
  const handleSequenceUpdate = useCallback(async (updatedSequence: Sequence) => {
    if (!sequence?.id) return;

    try {
      const result = await updateSequence(sequence.id, {
        channels: updatedSequence.channels
      });

      if (result) {
        setSequence(result);
      }
    } catch (error) {
      console.error('Failed to update sequence:', error);
    }
  }, [sequence?.id, updateSequence]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Test Sequence</h1>
          <p className="text-gray-400 mt-2">
            Select a sequence to test. You can play the sequence, edit intervals, and adjust channel volumes.
          </p>

          <div className="mt-4">
            <Select 
              value={selectedSequenceId} 
              onValueChange={setSelectedSequenceId}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a sequence to test" />
              </SelectTrigger>
              <SelectContent>
                {sequences.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id.toString()}>
                    {seq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            <p className="text-gray-400 mt-2">Loading sequence...</p>
          </div>
        ) : sequence ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
            <ChannelEditor
              sequence={sequence}
              onSequenceUpdate={handleSequenceUpdate}
            />
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <p className="text-gray-400">Select a sequence to begin testing</p>
          </div>
        )}
      </div>
    </div>
  );
} 