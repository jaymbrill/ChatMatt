import React, { useEffect, useRef, useState } from 'react';
import { ActiveCallState, TranscriptEntry } from '../types';

interface Props {
  call: ActiveCallState;
}

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  initiating: { label: 'Initiating...', color: 'text-yellow-400', pulse: true },
  ringing: { label: 'Ringing...', color: 'text-yellow-300', pulse: true },
  'in-progress': { label: 'Connected', color: 'text-green-400', pulse: false },
  completed: { label: 'Call ended', color: 'text-slate-400', pulse: false },
  failed: { label: 'Failed', color: 'text-red-400', pulse: false },
  'no-answer': { label: 'No answer', color: 'text-orange-400', pulse: false },
  busy: { label: 'Busy', color: 'text-orange-400', pulse: false },
};

function EntryBubble({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.speaker === 'ai';
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isAI
            ? 'bg-brand-700/40 border border-brand-600/50 text-slate-100 rounded-tl-sm'
            : 'bg-slate-700 border border-slate-600 text-slate-100 rounded-tr-sm'
        }`}
      >
        <p className={`text-xs mb-1 font-semibold ${isAI ? 'text-brand-300' : 'text-slate-400'}`}>
          {isAI ? 'You (AI)' : 'Them'}
        </p>
        {entry.text}
      </div>
    </div>
  );
}

export default function ActiveCall({ call }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(formatDuration(call.startedAt));
  const status = STATUS_CONFIG[call.status] || { label: call.status, color: 'text-slate-400', pulse: false };

  useEffect(() => {
    if (call.status !== 'in-progress') return;
    const interval = setInterval(() => setElapsed(formatDuration(call.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [call.status, call.startedAt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [call.entries.length]);

  return (
    <div className="card border-brand-600/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title mb-0">Active Call</p>
          <p className="text-slate-200 font-semibold">{call.audienceName}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            {status.pulse && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
            )}
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
          </div>
          {call.status === 'in-progress' && (
            <p className="text-slate-500 text-xs mt-1 font-mono">{elapsed}</p>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="bg-slate-950/50 rounded-lg p-3 h-64 overflow-y-auto"
      >
        {call.entries.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-600 text-sm italic">Waiting for conversation to begin...</p>
          </div>
        ) : (
          call.entries.map(entry => <EntryBubble key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
