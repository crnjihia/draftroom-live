import React from 'react';
import { getCsrfToken } from 'next-auth/react';

export default async function SignInPage() {
  const csrfToken = await getCsrfToken();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form method="post" action="/api/auth/signin/email" className="bg-white p-6 rounded shadow-md">
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
        <label className="block mb-2">Email address</label>
        <input name="email" type="email" required className="w-full p-2 border rounded mb-4" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
          Sign in with Email
        </button>
      </form>
    </main>
  );
}
