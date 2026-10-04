'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, BookOpen, GraduationCap } from 'lucide-react';

const COURSE_PRESETS = [
  {
    code: 'APT3040',
    title: 'Distributed Systems CRDT Assignment',
    uni: 'USIU-Africa',
  },
  {
    code: 'CSC411',
    title: 'Operating Systems Concurrent File System Report',
    uni: 'University of Nairobi',
  },
  {
    code: 'BBIT302',
    title: 'Enterprise Software Architecture Project Spec',
    uni: 'Strathmore University',
  },
];

export default function CreateDocumentPage() {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (res.ok) {
        const doc = await res.json();
        router.push(`/documents/${doc.id}`);
      } else {
        // Fallback room ID
        const fallbackId = `room-${Date.now().toString(36)}`;
        router.push(`/documents/${fallbackId}`);
      }
    } catch (err) {
      const fallbackId = `room-${Date.now().toString(36)}`;
      router.push(`/documents/${fallbackId}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Create Collaborative Document
            </h1>
            <p className="text-xs text-slate-500">
              Auto-generates a real-time room for your group members.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assignment Title
            </label>
            <input
              id="input-doc-title"
              type="text"
              placeholder="e.g. Distributed Systems Final Group Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
              autoFocus
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 mb-2">
              Or pick an assignment template:
            </span>
            <div className="space-y-2">
              {COURSE_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.code}
                  onClick={() => setTitle(`${preset.code}: ${preset.title}`)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-slate-800 mr-2">
                      {preset.code}
                    </span>
                    <span className="text-slate-600">{preset.title}</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Use &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-submit-create-doc"
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Room...' : 'Start Collaborating'}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
