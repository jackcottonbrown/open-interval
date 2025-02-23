import { notFound } from "next/navigation";
import { db } from "@/db";
import { sequences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PublicSequencePlayer } from "@/components/public-sequence-player/PublicSequencePlayer";
import { formatDistanceToNow } from "date-fns";
import { User, Clock, Tag } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SequencePage({ 
  params,
  searchParams 
}: PageProps) {
  // Await the params and searchParams promises
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const sequenceId = parseInt(id, 10);

  if (isNaN(sequenceId)) {
    notFound();
  }
  
  const sequence = await db.query.sequences.findFirst({
    where: eq(sequences.id, sequenceId),
    with: {
      user: true,
    },
  });

  if (!sequence) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Sequence Info */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">{sequence.name}</h1>
          <div className="space-y-2">
            <div className="flex items-center text-gray-400">
              <User className="w-4 h-4 mr-2" />
              <span>Created by {sequence.user.firstName} {sequence.user.lastName}</span>
            </div>
            <div className="flex items-center text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              <span>Created {formatDistanceToNow(new Date(sequence.createdAt))} ago</span>
            </div>
            {sequence.tags && sequence.tags.length > 0 && (
              <div className="flex items-center text-gray-400">
                <Tag className="w-4 h-4 mr-2" />
                <div className="flex gap-2">
                  {sequence.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player */}
      <PublicSequencePlayer 
        channels={sequence.channels}
      />
    </div>
  );
} 