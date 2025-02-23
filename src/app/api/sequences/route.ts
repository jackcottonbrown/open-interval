import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { sequences } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/sequences - Get all sequences for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const userSequences = await db.query.sequences.findMany({
      where: eq(sequences.userId, userId),
      orderBy: (sequences, { desc }) => [desc(sequences.updatedAt)]
    });

    return new Response(JSON.stringify(userSequences), { status: 200 });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch sequences' }), 
      { status: 500 }
    );
  }
}

// POST /api/sequences - Create a new sequence
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic = false, channels = [], tags = [] } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }), 
        { status: 400 }
      );
    }

    const [sequence] = await db.insert(sequences).values({
      userId,
      name,
      description,
      isPublic,
      channels,
      tags,
    }).returning();

    return new Response(JSON.stringify(sequence), { status: 201 });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create sequence' }), 
      { status: 500 }
    );
  }
} 