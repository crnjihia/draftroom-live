import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // TODO: fetch document data via Prisma
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Document ID: {params.id}</h2>
      <!-- TODO: render editor component -->
      <div className="mt-4">
        <Editor />
      </div>
    </div>
  );
}
