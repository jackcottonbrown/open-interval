import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sequences } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/sequences/public - Get all public sequences
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Get public sequences with pagination
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

    // Get total count for pagination
    const totalCount = await db.select({ count: sequences.id })
      .from(sequences)
      .where(eq(sequences.isPublic, true))
      .then(result => result[0]?.count || 0);

    return Response.json({
      sequences: publicSequences,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching public sequences:', error);
    return Response.json(
      { error: 'Failed to fetch public sequences' },
      { status: 500 }
    );
  }
} 