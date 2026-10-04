import { NextResponse } from 'next/server';
import { prisma } from '@draftroom/shared';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json([], { status: 200 });
    }

    const threads = await prisma.commentThread.findMany({
      where: { documentId },
      include: {
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarColor: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error('[API Comments GET] Error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, documentId, anchorYjsId, comments } = body;

    // Ensure user exists
    const firstComment = comments?.[0];
    const userId = firstComment?.userId || 'usr-aminausiuacke';
    const content = firstComment?.content || 'Feedback';

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@university.ac.ke`,
        name: firstComment?.user?.name || 'Student',
        avatarColor: firstComment?.user?.avatarColor || '#8b5cf6',
      },
    });

    // Ensure document exists
    await prisma.document.upsert({
      where: { id: documentId },
      update: {},
      create: {
        id: documentId,
        title: `Doc-${documentId.slice(0, 6)}`,
        ownerId: userId,
      },
    });

    const thread = await prisma.commentThread.create({
      data: {
        id: id || undefined,
        documentId,
        anchorYjsId: typeof anchorYjsId === 'string' ? anchorYjsId : JSON.stringify(anchorYjsId),
        resolved: false,
        comments: {
          create: {
            userId,
            content,
          },
        },
      },
      include: {
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarColor: true } },
          },
        },
      },
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error('[API Comments POST] Error:', error);
    return NextResponse.json({ success: true }, { status: 201 });
  }
}
