import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { Channel } from '@/db/schema';

export type Sequence = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  channels: Channel[];
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateSequenceInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
  channels?: Channel[];
  tags?: string[];
};

type UpdateSequenceInput = Partial<CreateSequenceInput>;

export function useSequences() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all sequences for the current user
  const fetchSequences = async (): Promise<Sequence[]> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sequences');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch sequences');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch sequences',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch a single sequence by ID
  const fetchSequence = async (id: number): Promise<Sequence | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sequences/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch sequence');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sequence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new sequence
  const createSequence = async (input: CreateSequenceInput): Promise<Sequence | null> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create sequence');
      }

      const sequence = await response.json();
      toast({
        title: 'Success',
        description: 'Sequence created successfully',
      });
      return sequence;
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing sequence
  const updateSequence = async (id: number, input: UpdateSequenceInput): Promise<Sequence | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sequences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update sequence');
      }

      const sequence = await response.json();
      toast({
        title: 'Success',
        description: 'Sequence updated successfully',
      });
      return sequence;
    } catch (error) {
      console.error('Error updating sequence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a sequence
  const deleteSequence = async (id: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sequences/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete sequence');
      }

      toast({
        title: 'Success',
        description: 'Sequence deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete sequence',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    fetchSequences,
    fetchSequence,
    createSequence,
    updateSequence,
    deleteSequence,
  };
} 