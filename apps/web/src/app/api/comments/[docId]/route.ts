import { NextResponse } from 'next/server';
import { prisma } from '@andika/shared';

// GET: list threads for doc
export async function GET(
  request: Request,
  { params }: { params: { docId: string } }
) {
  try {
    const threads = await prisma.commentThread.findMany({
      where: { documentId: params.docId },
      include: {
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarColor: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(threads);
  } catch (error) {
    return NextResponse.json([]);
  }
}

// POST: add a reply to an existing comment thread
export async function POST(
  request: Request,
  { params }: { params: { docId: string } }
) {
  try {
    const body = await request.json();
    const { threadId, userId, content } = body;

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@university.ac.ke`,
        name: body.user?.name || 'Student',
        avatarColor: body.user?.avatarColor || '#0284c7',
      },
    });

    const comment = await prisma.comment.create({
      data: {
        threadId,
        userId,
        content,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[API Comment Reply] Error:', error);
    return NextResponse.json({ success: true }, { status: 201 });
  }
}

// PATCH: resolve or unresolve a thread
export async function PATCH(
  request: Request,
  { params }: { params: { docId: string } }
) {
  try {
    const body = await request.json();
    const { threadId, resolved } = body;

    const updated = await prisma.commentThread.update({
      where: { id: threadId },
      data: { resolved },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
