import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/sequences/public/[id] - Get a specific public sequence
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const sequenceId = parseInt(id);

    if (isNaN(sequenceId)) {
      return Response.json({ error: 'Invalid sequence ID' }, { status: 400 });
    }

    const sequence = await db.query.sequences.findFirst({
      where: and(
        eq(sequences.id, sequenceId),
        eq(sequences.isPublic, true)
      ),
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

    if (!sequence) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return Response.json(sequence);
  } catch (error) {
    console.error('Error fetching public sequence:', error);
    return Response.json(
      { error: 'Failed to fetch sequence' }, 
      { status: 500 }
    );
  }
} 