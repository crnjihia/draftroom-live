import { NextResponse } from 'next/server';
import { prisma } from '@studyroom/shared';

export async function GET(
  request: Request,
  { params }: { params: { docId: string } }
) {
  try {
    const versions = await prisma.namedVersion.findMany({
      where: { documentId: params.docId },
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
    return NextResponse.json([]);
  }
}
