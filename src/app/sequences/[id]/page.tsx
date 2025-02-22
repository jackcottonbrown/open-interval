import { notFound } from "next/navigation";
import { db } from "@/db";
import { sequences } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      <h1 className="text-3xl font-bold mb-6">{sequence.name}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">{sequence.description}</p>
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Sequence Details</h2>
          <p className="text-gray-700">Created: {sequence.createdAt.toLocaleDateString()}</p>
          <p className="text-gray-700">Created by: {sequence.user.email}</p>
        </div>
      </div>
    </div>
  );
} 