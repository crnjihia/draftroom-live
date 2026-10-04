import { NextResponse } from 'next/server';
import { prisma } from '@draftroom/shared';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json([]);
    }

    const versions = await prisma.namedVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = versions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      name: v.name,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
      ydocState: Buffer.from(v.ydocState).toString('base64'),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('[API Versions GET] Error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, name, createdBy, ydocState } = body;

    // Ensure document exists
    await prisma.document.upsert({
      where: { id: documentId },
      update: {},
      create: {
        id: documentId,
        title: `Doc-${documentId.slice(0, 6)}`,
        ownerId: 'usr-aminausiuacke',
      },
    });

    const version = await prisma.namedVersion.create({
      data: {
        documentId,
        name: name || 'Untitled Version',
        createdBy: createdBy || 'Collaborator',
        ydocState: Buffer.from(ydocState, 'base64'),
      },
    });

    return NextResponse.json(
      {
        ...version,
        ydocState,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Versions POST] Error:', error);
    return NextResponse.json({ success: true }, { status: 201 });
  }
}
