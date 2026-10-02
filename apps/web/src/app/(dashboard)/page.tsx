import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">My Documents</h1>
      <!-- TODO: list user documents with links -->
      <ul>
        <li className="mb-2">
          <Link href="/documents/placeholder-id">Sample Document</Link>
        </li>
      </ul>
    </main>
  );
}
