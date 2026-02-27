export interface ToneProfile {
  greeting: string[];
  style: string;
  closing: string[];
}

export interface Audience {
  id: string;
  name: string;
  relationship: 'wife' | 'parents' | 'children';
  phone_number: string;
  tone_profile: ToneProfile;
}

export interface CallRecord {
  id: string;
  audience_id: string;
  audience_name: string;
  relationship: string;
  twilio_call_sid: string | null;
  status: 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
  life_events: string;
  questions: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface TranscriptEntry {
  id: string;
  call_id: string;
  speaker: 'ai' | 'human';
  text: string;
  timestamp: string;
}

export interface ActiveCallState {
  callId: string;
  status: CallRecord['status'];
  audienceName: string;
  startedAt: string;
  entries: TranscriptEntry[];
}
