'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

const DEMO_STUDENTS = [
  {
    name: 'Amina Odhiambo',
    email: 'amina@usiu.ac.ke',
    university: 'USIU-Africa',
    color: '#8b5cf6',
  },
  {
    name: 'Brian Kiprop',
    email: 'brian@uonbi.ac.ke',
    university: 'University of Nairobi',
    color: '#0284c7',
  },
  {
    name: 'Faith Wanjiku',
    email: 'wanjiku@strathmore.edu',
    university: 'Strathmore University',
    color: '#059669',
  },
];

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (studentEmail: string) => {
    setLoading(true);
    const res = await signIn('credentials', {
      email: studentEmail,
      password: 'password123',
      redirect: false,
    });

    if (res?.ok) {
      router.push('/');
      router.refresh();
    } else {
      // Direct navigate on mock
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl mx-auto shadow-lg mb-3">
            D
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Draftroom Live
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Collaborative Editor for University Teams
          </p>
        </div>

        {/* 1-Click University Student Login */}
        <div className="space-y-3 mb-6">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            Sign in as demo student
          </span>

          {DEMO_STUDENTS.map((student) => (
            <button
              key={student.email}
              onClick={() => handleSignIn(student.email)}
              disabled={loading}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between transition-all group text-left"
            >
              <div className="flex items-center space-x-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: student.color }}
                >
                  {student.name[0]}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {student.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-blue-500" />
                    <span>{student.university}</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold">
              Or use your student email
            </span>
          </div>
        </div>

        {/* Custom Credentials Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) handleSignIn(email);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              University Email
            </label>
            <input
              type="email"
              placeholder="e.g. yourname@usiu.ac.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!email || loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In with Email'}
          </button>
        </form>
      </div>
    </main>
  );
}
