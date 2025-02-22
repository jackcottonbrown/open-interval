import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sequences } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function MySequencesPage() {
  const { userId } = await auth();

  // Even though Clerk middleware handles auth, we still need to handle the type
  if (!userId) {
    notFound();
  }

  const userSequences = await db.query.sequences.findMany({
    where: eq(sequences.userId, userId),
    orderBy: (sequences, { desc }) => [desc(sequences.createdAt)],
    with: {
      user: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Sequences</h1>
        <Link
          href="/build-sequence"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Create New Sequence
        </Link>
      </div>

      {userSequences.length === 0 ? (
        <p className="text-center text-gray-600">You haven&apos;t created any sequences yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userSequences.map((sequence) => (
            <div key={sequence.id} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-2">{sequence.name}</h2>
              <p className="text-gray-600 mb-4">{sequence.description}</p>
              <div className="flex justify-end">
                <Link
                  href={`/sequences/${sequence.id}`}
                  className="text-blue-500 hover:text-blue-600"
                >
                  View Sequence
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 