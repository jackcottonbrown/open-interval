import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { sequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/sequences/[id] - Get a specific sequence
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await db.query.sequences.findFirst({
      where: and(
        eq(sequences.id, parseInt(id)),
        eq(sequences.userId, userId)
      ),
    });

    if (!sequence) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return Response.json(sequence);
  } catch (error) {
    console.error('Error fetching sequence:', error);
    return Response.json(
      { error: 'Failed to fetch sequence' }, 
      { status: 500 }
    );
  }
}

// PUT /api/sequences/[id] - Update a sequence
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic, channels, tags } = body;

    // Verify sequence exists and belongs to user
    const existingSequence = await db.query.sequences.findFirst({
      where: and(
        eq(sequences.id, parseInt(id)),
        eq(sequences.userId, userId)
      ),
    });

    if (!existingSequence) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Update sequence
    const [updatedSequence] = await db.update(sequences)
      .set({
        name: name ?? existingSequence.name,
        description: description ?? existingSequence.description,
        isPublic: isPublic ?? existingSequence.isPublic,
        channels: channels ?? existingSequence.channels,
        tags: tags ?? existingSequence.tags,
        updatedAt: new Date(),
      })
      .where(and(
        eq(sequences.id, parseInt(id)),
        eq(sequences.userId, userId)
      ))
      .returning();

    return Response.json(updatedSequence);
  } catch (error) {
    console.error('Error updating sequence:', error);
    return Response.json(
      { error: 'Failed to update sequence' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/sequences/[id] - Delete a sequence
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify sequence exists and belongs to user
    const existingSequence = await db.query.sequences.findFirst({
      where: and(
        eq(sequences.id, parseInt(id)),
        eq(sequences.userId, userId)
      ),
    });

    if (!existingSequence) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Delete sequence
    await db.delete(sequences)
      .where(and(
        eq(sequences.id, parseInt(id)),
        eq(sequences.userId, userId)
      ));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return Response.json(
      { error: 'Failed to delete sequence' }, 
      { status: 500 }
    );
  }
} 