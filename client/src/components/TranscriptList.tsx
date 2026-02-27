import React, { useState } from 'react';
import axios from 'axios';
import { CallRecord, TranscriptEntry } from '../types';

interface Props {
  calls: CallRecord[];
}

const RELATIONSHIP_ICONS: Record<string, string> = {
  wife: '💑',
  parents: '👨‍👩‍👦',
  children: '👧👦',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400',
  failed: 'text-red-400',
  'no-answer': 'text-orange-400',
  busy: 'text-orange-400',
  'in-progress': 'text-blue-400',
};

function TranscriptModal({ call, onClose }: { call: CallRecord; onClose: () => void }) {
  const [entries, setEntries] = useState<TranscriptEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    axios.get<TranscriptEntry[]>(`/api/transcripts/${call.id}`).then(r => {
      setEntries(r.data);
      setLoading(false);
    });
  }, [call.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <p className="font-semibold text-slate-100">
              {RELATIONSHIP_ICONS[call.relationship]} Call with {call.audience_name}
            </p>
            <p className="text-xs text-slate-500">{formatDate(call.started_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && <p className="text-slate-500 text-sm text-center">Loading...</p>}
          {entries && entries.length === 0 && (
            <p className="text-slate-500 text-sm text-center italic">No transcript available</p>
          )}
          {entries?.map(entry => (
            <div key={entry.id} className={`flex ${entry.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  entry.speaker === 'ai'
                    ? 'bg-brand-700/30 border border-brand-700/50 text-slate-200 rounded-tl-sm'
                    : 'bg-slate-700 border border-slate-600 text-slate-200 rounded-tr-sm'
                }`}
              >
                <p className={`text-xs mb-1 font-semibold ${entry.speaker === 'ai' ? 'text-brand-300' : 'text-slate-400'}`}>
                  {entry.speaker === 'ai' ? 'You (AI)' : call.audience_name}
                </p>
                {entry.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TranscriptList({ calls }: Props) {
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  if (calls.length === 0) {
    return (
      <div>
        <p className="section-title">Past Calls</p>
        <p className="text-slate-600 text-sm italic">No calls yet</p>
      </div>
    );
  }

  return (
    <div>
      <p className="section-title">Past Calls</p>
      <div className="space-y-2">
        {calls.map(call => (
          <div
            key={call.id}
            className="card flex items-center justify-between hover:border-slate-600 transition-colors cursor-pointer"
            onClick={() => setSelectedCall(call)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{RELATIONSHIP_ICONS[call.relationship] || '📞'}</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{call.audience_name}</p>
                <p className="text-xs text-slate-500">{formatDate(call.started_at)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold capitalize ${STATUS_COLORS[call.status] || 'text-slate-400'}`}>
                {call.status}
              </p>
              {call.duration_seconds && (
                <p className="text-xs text-slate-600">{formatDuration(call.duration_seconds)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedCall && (
        <TranscriptModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
