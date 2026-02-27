import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import { callQueries, audienceQueries, transcriptQueries } from '../database';
import { textToSpeech } from '../services/elevenlabs';
import {
  generateGreeting,
  generateResponse,
  initConversationState,
  ConversationState,
  ConversationTurn,
} from '../services/ai';
import { broadcast } from '../websocket';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Twilio calls this when the person answers
router.post('/answer', async (req: Request, res: Response) => {
  const { callId } = req.query as { callId: string };
  const twiml = new VoiceResponse();

  try {
    const call = callQueries.getById(callId);
    if (!call) {
      twiml.say('Sorry, call not found.');
      res.type('text/xml').send(twiml.toString());
      return;
    }

    callQueries.updateStatus(callId, 'in-progress');

    const audience = audienceQueries.getById(call.audience_id);
    if (!audience) throw new Error('Audience not found');

    const lifeEvents = JSON.parse(call.life_events) as string[];
    const questions = JSON.parse(call.questions) as string[];

    // Generate greeting
    const greetingText = await generateGreeting(audience, lifeEvents, questions);
    const audioFile = await textToSpeech(greetingText, `${callId}-greeting`);
    const baseUrl = process.env.PUBLIC_BASE_URL;

    // Initialize conversation state
    const state = initConversationState(lifeEvents, questions);
    state.phase = lifeEvents.length > 0 ? 'updates' : questions.length > 0 ? 'questions' : 'casual';
    callQueries.updateConversationState(callId, JSON.stringify({ state, history: [{ role: 'assistant', content: greetingText }] }));

    // Save greeting to transcript
    const entryId = uuidv4();
    transcriptQueries.add({ id: entryId, call_id: callId, speaker: 'ai', text: greetingText, timestamp: new Date().toISOString() });
    broadcast({ type: 'transcript', callId, entry: { id: entryId, speaker: 'ai', text: greetingText } });

    // Build TwiML
    twiml.play(`${baseUrl}/audio/${audioFile}`);
    const gather = twiml.gather({
      input: ['speech'],
      action: `/twiml/gather?callId=${callId}`,
      speechTimeout: 'auto',
      language: 'en-US',
      speechModel: 'phone_call',
    });
    gather.say(''); // placeholder to keep gather active

  } catch (err) {
    console.error('TwiML answer error:', err);
    twiml.say('Sorry, there was an issue starting the call.');
  }

  res.type('text/xml').send(twiml.toString());
});

// Twilio calls this when speech is captured
router.post('/gather', async (req: Request, res: Response) => {
  const { callId } = req.query as { callId: string };
  const speechResult = req.body.SpeechResult as string | undefined;
  const twiml = new VoiceResponse();

  try {
    const call = callQueries.getById(callId);
    if (!call) {
      twiml.say('Goodbye!');
      twiml.hangup();
      res.type('text/xml').send(twiml.toString());
      return;
    }

    const audience = audienceQueries.getById(call.audience_id);
    if (!audience) throw new Error('Audience not found');

    // If no speech detected, prompt again
    if (!speechResult || speechResult.trim() === '') {
      const gather = twiml.gather({
        input: ['speech'],
        action: `/twiml/gather?callId=${callId}`,
        speechTimeout: 'auto',
        language: 'en-US',
      });
      gather.say('I\'m here, go ahead.');
      res.type('text/xml').send(twiml.toString());
      return;
    }

    // Save human speech to transcript
    const humanEntryId = uuidv4();
    transcriptQueries.add({
      id: humanEntryId,
      call_id: callId,
      speaker: 'human',
      text: speechResult,
      timestamp: new Date().toISOString(),
    });
    broadcast({ type: 'transcript', callId, entry: { id: humanEntryId, speaker: 'human', text: speechResult } });

    // Load conversation state
    const convData = call.conversation_state
      ? JSON.parse(call.conversation_state) as { state: ConversationState; history: ConversationTurn[] }
      : { state: initConversationState([], []), history: [] };

    convData.history.push({ role: 'user', content: speechResult });

    // Generate AI response
    const { text: aiResponse, updatedState } = await generateResponse(audience, convData.state, convData.history);
    convData.history.push({ role: 'assistant', content: aiResponse });
    convData.state = updatedState;

    // Save AI response to transcript
    const aiEntryId = uuidv4();
    transcriptQueries.add({
      id: aiEntryId,
      call_id: callId,
      speaker: 'ai',
      text: aiResponse,
      timestamp: new Date().toISOString(),
    });
    broadcast({ type: 'transcript', callId, entry: { id: aiEntryId, speaker: 'ai', text: aiResponse } });

    // Save updated state
    callQueries.updateConversationState(callId, JSON.stringify(convData));

    // Generate ElevenLabs audio
    const audioFile = await textToSpeech(aiResponse, `${callId}-${Date.now()}`);
    const baseUrl = process.env.PUBLIC_BASE_URL;

    twiml.play(`${baseUrl}/audio/${audioFile}`);

    // If farewell phase, hang up after speaking
    if (updatedState.phase === 'farewell') {
      twiml.pause({ length: 1 });
      twiml.hangup();
    } else {
      const gather = twiml.gather({
        input: ['speech'],
        action: `/twiml/gather?callId=${callId}`,
        speechTimeout: 'auto',
        language: 'en-US',
        speechModel: 'phone_call',
      });
      gather.say('');
    }

  } catch (err) {
    console.error('TwiML gather error:', err);
    twiml.say('Sorry, I had a technical issue. Talk soon!');
    twiml.hangup();
  }

  res.type('text/xml').send(twiml.toString());
});

// Twilio status callback
router.post('/status', (req: Request, res: Response) => {
  const { callId } = req.query as { callId: string };
  const callStatus = req.body.CallStatus as string;
  const callDuration = parseInt(req.body.CallDuration || '0', 10);

  if (callId) {
    if (callStatus === 'completed') {
      callQueries.complete(callId, callDuration);
      broadcast({ type: 'callStatus', callId, status: 'completed', duration: callDuration });
    } else if (['failed', 'no-answer', 'busy', 'canceled'].includes(callStatus)) {
      callQueries.updateStatus(callId, callStatus);
      broadcast({ type: 'callStatus', callId, status: callStatus });
    }
  }

  res.sendStatus(200);
});

export default router;
