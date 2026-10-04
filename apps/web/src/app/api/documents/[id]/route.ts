import { NextResponse } from 'next/server';
import { prisma } from '@andika/shared';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarColor: true } },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarColor: true } },
          },
        },
      },
    });

    if (!doc) {
      // Auto-create doc if accessed via shared link room ID
      const newDoc = await prisma.document.create({
        data: {
          id: params.id,
          title: `Assignment-${params.id.slice(0, 6)}`,
          ownerId: 'usr-aminausiuacke',
        },
      }).catch(() => null);

      if (newDoc) return NextResponse.json(newDoc);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('[API Document ID GET] Error:', error);
    return NextResponse.json(
      {
        id: params.id,
        title: `Assignment-${params.id.slice(0, 6)}`,
      },
      { status: 200 }
    );
  }
}
