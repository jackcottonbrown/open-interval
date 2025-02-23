import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Sequence } from './ChannelEditor';

type SequenceMetadataDialogProps = {
  sequence: Sequence;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (sequence: Sequence) => void;
};

export function SequenceMetadataDialog({
  sequence,
  isOpen,
  onClose,
  onUpdate,
}: SequenceMetadataDialogProps) {
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description || '');
  const [isPublic, setIsPublic] = useState(sequence.isPublic || false);
  const [tags, setTags] = useState(sequence.tags?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create updated sequence object
      const updatedSequence: Sequence = {
        ...sequence,
        name,
        description: description || null,
        isPublic,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      // Call the update function
      await onUpdate(updatedSequence);

      toast({
        title: 'Success',
        description: 'Sequence details updated successfully',
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sequence details',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Sequence Details</DialogTitle>
            <DialogDescription>
              Update the metadata for your sequence. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter sequence name"
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter sequence description"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter tags separated by commas"
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas (e.g., meditation, relaxation, mindfulness)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Make this sequence public
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 