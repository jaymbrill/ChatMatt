import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { callQueries, audienceQueries, transcriptQueries } from '../database';
import { initiateCall } from '../services/twilio';
import { generateGreeting, initConversationState } from '../services/ai';
import { textToSpeech } from '../services/elevenlabs';
import { broadcast } from '../websocket';

const router = Router();

// POST /api/calls - initiate a new call
router.post('/', async (req: Request, res: Response) => {
  const { audienceId, lifeEvents, questions } = req.body as {
    audienceId: string;
    lifeEvents: string[];
    questions: string[];
  };

  if (!audienceId) {
    res.status(400).json({ error: 'audienceId is required' });
    return;
  }

  const audience = audienceQueries.getById(audienceId);
  if (!audience) {
    res.status(404).json({ error: 'Audience not found' });
    return;
  }

  if (!audience.phone_number) {
    res.status(400).json({ error: `No phone number configured for ${audience.name}. Please set it first.` });
    return;
  }

  const callId = uuidv4();
  const events = lifeEvents || [];
  const qs = questions || [];

  callQueries.create({
    id: callId,
    audience_id: audienceId,
    status: 'initiating',
    life_events: JSON.stringify(events),
    questions: JSON.stringify(qs),
    conversation_state: null,
    started_at: new Date().toISOString(),
  });

  try {
    // Pre-generate greeting text and audio BEFORE placing the Twilio call.
    // This avoids Twilio's 15-second webhook timeout in /twiml/answer.
    const greetingText = await generateGreeting(audience, events, qs);
    const greetingAudio = await textToSpeech(greetingText, `${callId}-greeting`);

    const state = initConversationState(events, qs);
    state.phase = events.length > 0 ? 'updates' : qs.length > 0 ? 'questions' : 'casual';

    const entryId = uuidv4();
    callQueries.updateConversationState(callId, JSON.stringify({
      greetingAudio,
      state,
      history: [{ role: 'assistant', content: greetingText }],
    }));
    transcriptQueries.add({ id: entryId, call_id: callId, speaker: 'ai', text: greetingText, timestamp: new Date().toISOString() });

    const twilioSid = await initiateCall(audience.phone_number, callId);
    callQueries.updateTwilioSid(callId, twilioSid);
    callQueries.updateStatus(callId, 'ringing');

    broadcast({ type: 'transcript', callId, entry: { id: entryId, speaker: 'ai', text: greetingText } });

    res.json({ callId, status: 'ringing', twilioSid });
  } catch (err: unknown) {
    callQueries.updateStatus(callId, 'failed');
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/calls - list all calls
router.get('/', (_req: Request, res: Response) => {
  const calls = callQueries.getAll();
  res.json(calls);
});

// GET /api/calls/:id - get single call
router.get('/:id', (req: Request, res: Response) => {
  const call = callQueries.getById(req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }
  res.json(call);
});

export default router;
