import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'chatmatt.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS audiences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      tone_profile TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      audience_id TEXT NOT NULL,
      twilio_call_sid TEXT,
      status TEXT NOT NULL,
      life_events TEXT NOT NULL,
      questions TEXT NOT NULL,
      conversation_state TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER,
      FOREIGN KEY (audience_id) REFERENCES audiences(id)
    );

    CREATE TABLE IF NOT EXISTS transcript_entries (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (call_id) REFERENCES calls(id)
    );
  `);

  seedDefaultAudiences();
}

function seedDefaultAudiences() {
  const database = getDb();
  const count = (database.prepare('SELECT COUNT(*) as count FROM audiences').get() as { count: number }).count;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = database.prepare(`
    INSERT INTO audiences (id, name, relationship, phone_number, tone_profile, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run('wife', 'Wife', 'wife', '', JSON.stringify({
    greeting: ['Hey honey!', 'Hey babe!', 'Hi love!'],
    style: 'warm, intimate, and loving. Use pet names occasionally. Reference shared experiences and inside jokes naturally. Keep it conversational and personal.',
    closing: ['Love you!', 'Miss you!', 'Can\'t wait to see you!'],
  }), now, now);

  insert.run('parents', 'Parents', 'parents', '', JSON.stringify({
    greeting: ['Hi Mom!', 'Hi Dad!', 'Hey, it\'s me!'],
    style: 'warm, respectful, and nostalgic. Sound like you\'re catching up after some time apart. Be enthusiastic about sharing news and genuinely interested in their lives.',
    closing: ['Love you guys!', 'Talk soon!', 'Take care!'],
  }), now, now);

  insert.run('children', 'Children', 'children', '', JSON.stringify({
    greeting: ['Hey buddy!', 'Hey sweetie!', 'Hi there!'],
    style: 'playful, encouraging, and nurturing. Keep language simple and enthusiastic. Be genuinely excited about their activities and interests. Use lots of positive reinforcement.',
    closing: ['Love you!', 'So proud of you!', 'Can\'t wait to hear more!'],
  }), now, now);
}

// Audience queries
export const audienceQueries = {
  getAll: () => getDb().prepare('SELECT * FROM audiences ORDER BY relationship').all() as AudienceRow[],
  getById: (id: string) => getDb().prepare('SELECT * FROM audiences WHERE id = ?').get(id) as AudienceRow | undefined,
  update: (id: string, phone: string, name: string) => {
    const now = new Date().toISOString();
    getDb().prepare('UPDATE audiences SET phone_number = ?, name = ?, updated_at = ? WHERE id = ?').run(phone, name, now, id);
  },
};

// Call queries
export const callQueries = {
  create: (call: Omit<CallRow, 'ended_at' | 'duration_seconds' | 'twilio_call_sid'>) => {
    getDb().prepare(`
      INSERT INTO calls (id, audience_id, twilio_call_sid, status, life_events, questions, conversation_state, started_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
    `).run(call.id, call.audience_id, call.status, call.life_events, call.questions, call.conversation_state, call.started_at);
  },
  getById: (id: string) => getDb().prepare('SELECT * FROM calls WHERE id = ?').get(id) as CallRow | undefined,
  getAll: () => getDb().prepare('SELECT c.*, a.name as audience_name, a.relationship FROM calls c JOIN audiences a ON c.audience_id = a.id ORDER BY c.started_at DESC').all() as (CallRow & { audience_name: string; relationship: string })[],
  updateTwilioSid: (id: string, sid: string) => getDb().prepare('UPDATE calls SET twilio_call_sid = ? WHERE id = ?').run(sid, id),
  updateStatus: (id: string, status: string) => getDb().prepare('UPDATE calls SET status = ? WHERE id = ?').run(status, id),
  updateConversationState: (id: string, state: string) => getDb().prepare('UPDATE calls SET conversation_state = ? WHERE id = ?').run(state, id),
  complete: (id: string, durationSeconds: number) => {
    const now = new Date().toISOString();
    getDb().prepare('UPDATE calls SET status = ?, ended_at = ?, duration_seconds = ? WHERE id = ?').run('completed', now, durationSeconds, id);
  },
  getBySid: (sid: string) => getDb().prepare('SELECT * FROM calls WHERE twilio_call_sid = ?').get(sid) as CallRow | undefined,
};

// Transcript queries
export const transcriptQueries = {
  add: (entry: TranscriptEntryRow) => {
    getDb().prepare(`
      INSERT INTO transcript_entries (id, call_id, speaker, text, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(entry.id, entry.call_id, entry.speaker, entry.text, entry.timestamp);
  },
  getByCallId: (callId: string) => getDb().prepare('SELECT * FROM transcript_entries WHERE call_id = ? ORDER BY timestamp ASC').all(callId) as TranscriptEntryRow[],
};

// Types
export interface AudienceRow {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  tone_profile: string;
  created_at: string;
  updated_at: string;
}

export interface CallRow {
  id: string;
  audience_id: string;
  twilio_call_sid: string | null;
  status: string;
  life_events: string;
  questions: string;
  conversation_state: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface TranscriptEntryRow {
  id: string;
  call_id: string;
  speaker: 'ai' | 'human';
  text: string;
  timestamp: string;
}
