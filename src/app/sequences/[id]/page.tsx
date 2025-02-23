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

export default async function SequencePage({ params }: PageProps) {
  const { id } = await params;
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">{sequence.name}</h1>
        <p className="text-gray-300 mb-6">{sequence.description}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>
              {sequence.user.firstName} {sequence.user.lastName}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              Updated {formatDistanceToNow(new Date(sequence.updatedAt), { addSuffix: true })}
            </span>
          </div>

          {sequence.tags && sequence.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <div className="flex flex-wrap gap-1">
                {sequence.tags.map(tag => (
                  <span key={tag} className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <PublicSequencePlayer channels={sequence.channels} />
      </div>
    </div>
  );
} 