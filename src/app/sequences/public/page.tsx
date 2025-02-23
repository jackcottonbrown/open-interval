import { Suspense } from 'react';
import Link from 'next/link';
import { db } from '@/db';
import { sequences } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Tag, User } from 'lucide-react';

async function getPublicSequences(page = 1, limit = 12) {
  const offset = (page - 1) * limit;

  const publicSequences = await db.query.sequences.findMany({
    where: eq(sequences.isPublic, true),
    orderBy: [desc(sequences.updatedAt)],
    limit: limit,
    offset: offset,
    with: {
      user: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      }
    }
  });

  const totalCount = await db.select({ count: sequences.id })
    .from(sequences)
    .where(eq(sequences.isPublic, true))
    .then(result => result[0]?.count || 0);

  return {
    sequences: publicSequences,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

function SequenceCard({ sequence }: { sequence: Awaited<ReturnType<typeof getPublicSequences>>['sequences'][0] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          {sequence.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {sequence.description}
        </p>
        
        <div className="space-y-2">
          {sequence.tags && sequence.tags.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Tag className="w-4 h-4" />
              <div className="flex flex-wrap gap-1">
                {sequence.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>
              {sequence.user.firstName} {sequence.user.lastName}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Updated {formatDistanceToNow(new Date(sequence.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href={`/sequences/${sequence.id}`}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            View Sequence →
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

type PageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PublicSequencesPage({
  searchParams
}: PageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({ page: '1' }));
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const { sequences: publicSequences, pagination } = await getPublicSequences(page);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Explore Sequences
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Discover and try public sequences created by the community
          </p>
        </div>
        <Link
          href="/build-sequence"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Create Your Own
        </Link>
      </div>

      <Suspense fallback={<LoadingGrid />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicSequences.map((sequence) => (
            <SequenceCard key={sequence.id} sequence={sequence} />
          ))}
        </div>

        {publicSequences.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">
              No public sequences available yet.
            </p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/sequences/public?page=${pageNum}`}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  pageNum === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {pageNum}
              </Link>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
} 