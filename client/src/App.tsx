import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Audience, ActiveCallState, CallRecord, TranscriptEntry } from './types';
import AudienceSelector from './components/AudienceSelector';
import ContentBuilder from './components/ContentBuilder';
import ActiveCall from './components/ActiveCall';
import TranscriptList from './components/TranscriptList';

export default function App() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [lifeEvents, setLifeEvents] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [pastCalls, setPastCalls] = useState<CallRecord[]>([]);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadAudiences = useCallback(async () => {
    const { data } = await axios.get<Audience[]>('/api/audiences');
    setAudiences(data);
    if (data.length > 0 && !selectedAudience) setSelectedAudience(data[0]);
  }, [selectedAudience]);

  const loadCalls = useCallback(async () => {
    const { data } = await axios.get<CallRecord[]>('/api/calls');
    setPastCalls(data.filter(c => c.status !== 'initiating' && c.status !== 'ringing' && c.status !== 'in-progress'));
  }, []);

  useEffect(() => {
    loadAudiences();
    loadCalls();
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        callId: string;
        entry?: TranscriptEntry;
        status?: string;
        duration?: number;
      };

      if (msg.type === 'transcript') {
        setActiveCall(prev => {
          if (!prev || prev.callId !== msg.callId) return prev;
          return { ...prev, entries: [...prev.entries, msg.entry!] };
        });
      }

      if (msg.type === 'callStatus') {
        setActiveCall(prev => {
          if (!prev || prev.callId !== msg.callId) return prev;
          return { ...prev, status: msg.status as ActiveCallState['status'] };
        });
        const terminal = ['completed', 'failed', 'no-answer', 'busy'];
        if (terminal.includes(msg.status || '')) {
          setTimeout(() => {
            setActiveCall(null);
            loadCalls();
          }, 3000);
        }
      }
    };

    ws.onerror = () => console.error('WebSocket error');
    return () => ws.close();
  }, [loadCalls]);

  async function startCall() {
    if (!selectedAudience) return;
    if (!selectedAudience.phone_number) {
      setError(`Please set a phone number for ${selectedAudience.name} first.`);
      return;
    }

    setError(null);
    setLaunching(true);
    try {
      const { data } = await axios.post<{ callId: string; status: string }>('/api/calls', {
        audienceId: selectedAudience.id,
        lifeEvents,
        questions,
      });

      setActiveCall({
        callId: data.callId,
        status: 'ringing',
        audienceName: selectedAudience.name,
        startedAt: new Date().toISOString(),
        entries: [],
      });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'Failed to start call';
      setError(msg || 'Failed to start call');
    } finally {
      setLaunching(false);
    }
  }

  const canCall = selectedAudience && selectedAudience.phone_number && !activeCall && !launching;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <h1 className="text-lg font-bold text-slate-100">ChatMatt</h1>
              <p className="text-xs text-slate-500">AI-powered personal calls</p>
            </div>
          </div>
          {activeCall && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="text-green-400 text-sm font-semibold">Call in progress</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <AudienceSelector
              audiences={audiences}
              selected={selectedAudience}
              onSelect={setSelectedAudience}
              onAudienceUpdated={loadAudiences}
            />

            {/* Call button */}
            <div className="card space-y-3">
              <p className="section-title mb-0">Ready to call?</p>
              {selectedAudience && (
                <p className="text-slate-400 text-sm">
                  Calling <span className="text-slate-200 font-medium">{selectedAudience.name}</span>
                  {lifeEvents.length > 0 && ` · ${lifeEvents.length} update${lifeEvents.length > 1 ? 's' : ''}`}
                  {questions.length > 0 && ` · ${questions.length} question${questions.length > 1 ? 's' : ''}`}
                </p>
              )}
              {error && (
                <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}
              <button
                className="btn-primary w-full text-base py-3"
                onClick={startCall}
                disabled={!canCall}
              >
                {launching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Starting call...
                  </span>
                ) : activeCall ? (
                  '📞 Call in progress...'
                ) : (
                  '📞 Start Call'
                )}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-6">
            <ContentBuilder
              lifeEvents={lifeEvents}
              questions={questions}
              onLifeEventsChange={setLifeEvents}
              onQuestionsChange={setQuestions}
            />

            {activeCall && <ActiveCall call={activeCall} />}

            <TranscriptList calls={pastCalls} />
          </div>
        </div>
      </main>
    </div>
  );
}
