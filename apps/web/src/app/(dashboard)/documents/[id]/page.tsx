import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@draftroom/shared';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/editor/Editor'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="flex items-center space-x-3 text-slate-600 font-medium">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading Editor...</span>
      </div>
    </div>
  ),
});

interface PageProps {
  params: { id: string };
}

export default async function DocumentPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  let doc = null;
  try {
    doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
    });

    if (!doc) {
      // Auto-create document for collaborative shared link rooms
      doc = await prisma.document.create({
        data: {
          id: params.id,
          title: `Assignment-${params.id.slice(0, 6)}`,
          ownerId: (session?.user as any)?.id || 'usr-aminausiuacke',
        },
      });
    }
  } catch (error) {
    console.warn('[DocumentPage] Could not query document from DB:', error);
  }

  const currentUser = {
    id: (session?.user as any)?.id || `guest-${Math.random().toString(36).slice(2, 6)}`,
    name: session?.user?.name || 'Amina Odhiambo',
    color: (session?.user as any)?.avatarColor || '#8b5cf6',
    university: (session?.user as any)?.university || 'USIU-Africa',
  };

  const title = doc?.title || `Assignment (${params.id.slice(0, 6)})`;

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100">
      <Editor
        documentId={params.id}
        documentTitle={title}
        currentUser={currentUser}
      />
    </main>
  );
}
