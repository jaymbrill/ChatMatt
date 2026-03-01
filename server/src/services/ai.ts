import Anthropic from '@anthropic-ai/sdk';
import { AudienceRow } from '../database';

const client = new Anthropic();

export interface ConversationState {
  phase: 'greeting' | 'updates' | 'questions' | 'casual' | 'farewell';
  coveredEvents: string[];
  askedQuestions: string[];
  pendingEvents: string[];
  pendingQuestions: string[];
  turnCount: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function initConversationState(lifeEvents: string[], questions: string[]): ConversationState {
  return {
    phase: 'greeting',
    coveredEvents: [],
    askedQuestions: [],
    pendingEvents: [...lifeEvents],
    pendingQuestions: [...questions],
    turnCount: 0,
  };
}

function buildSystemPrompt(audience: AudienceRow, state: ConversationState): string {
  const toneProfile = JSON.parse(audience.tone_profile);
  const callerName = process.env.CALLER_NAME || 'Matt';

  let phaseInstructions = '';
  switch (state.phase) {
    case 'greeting':
      phaseInstructions = `You are just starting the call. Greet them warmly and ask how they're doing. Keep it brief - just 1-2 sentences.`;
      break;
    case 'updates':
      if (state.pendingEvents.length > 0) {
        phaseInstructions = `Share ONE of these life updates naturally in conversation: ${state.pendingEvents.join(', ')}. Weave it in naturally, don't just announce it. 2-3 sentences max.`;
      } else {
        phaseInstructions = `You've shared all your updates. Transition naturally to asking questions or wrapping up.`;
      }
      break;
    case 'questions':
      if (state.pendingQuestions.length > 0) {
        phaseInstructions = `Ask ONE of these questions: "${state.pendingQuestions[0]}". Keep it natural and conversational.`;
      } else {
        phaseInstructions = `You've asked all your questions. React genuinely to their last response, then start wrapping up the call.`;
      }
      break;
    case 'casual':
      phaseInstructions = `Continue the conversation naturally. React to what they said and keep things flowing. 2-3 sentences.`;
      break;
    case 'farewell':
      phaseInstructions = `Wrap up the call warmly. Say goodbye with something like: ${toneProfile.closing.join(' or ')}. Keep it to 1-2 sentences.`;
      break;
  }

  return `You are ${callerName} making a phone call to your ${audience.relationship} (${audience.name}).

Tone and style: Be ${toneProfile.style}

IMPORTANT RULES:
- You are ${callerName} - speak in first person as him
- Keep responses SHORT - max 2-3 sentences per turn (this is a phone call)
- Sound natural and conversational, not scripted
- React genuinely to what they say before moving forward
- Do NOT use asterisks, stage directions, or narration
- Just speak naturally as if you're actually on the phone

Current phase instruction: ${phaseInstructions}

Life events already covered: ${state.coveredEvents.join(', ') || 'none yet'}
Questions already asked: ${state.askedQuestions.join(', ') || 'none yet'}`;
}

export async function generateResponse(
  audience: AudienceRow,
  state: ConversationState,
  history: ConversationTurn[]
): Promise<{ text: string; updatedState: ConversationState }> {
  const systemPrompt = buildSystemPrompt(audience, state);

  const messages = history.map(turn => ({
    role: turn.role as 'user' | 'assistant',
    content: turn.content,
  }));

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const updatedState = advanceConversationState(state, text, history);

  return { text, updatedState };
}

function advanceConversationState(
  state: ConversationState,
  aiResponse: string,
  history: ConversationTurn[]
): ConversationState {
  const newState = { ...state, turnCount: state.turnCount + 1 };
  const lastHumanTurn = [...history].reverse().find(h => h.role === 'user');

  // Detect if farewell was spoken
  const farewellPhrases = ['goodbye', 'bye', 'love you', 'talk soon', 'take care', 'gotta go'];
  if (farewellPhrases.some(p => aiResponse.toLowerCase().includes(p))) {
    newState.phase = 'farewell';
    return newState;
  }

  switch (state.phase) {
    case 'greeting':
      // After greeting and getting a response, move to updates (or questions if no updates)
      if (lastHumanTurn && state.pendingEvents.length > 0) {
        newState.phase = 'updates';
      } else if (lastHumanTurn && state.pendingQuestions.length > 0) {
        newState.phase = 'questions';
      }
      break;

    case 'updates': {
      // Mark first pending event as covered if we're in updates phase
      if (state.pendingEvents.length > 0) {
        newState.coveredEvents = [...state.coveredEvents, state.pendingEvents[0]];
        newState.pendingEvents = state.pendingEvents.slice(1);
      }
      // If all events covered, move to questions (or casual/farewell)
      if (newState.pendingEvents.length === 0 && state.pendingQuestions.length > 0) {
        newState.phase = 'questions';
      } else if (newState.pendingEvents.length === 0 && state.pendingQuestions.length === 0) {
        newState.phase = 'farewell';
      }
      break;
    }

    case 'questions': {
      // Mark first pending question as asked
      if (state.pendingQuestions.length > 0) {
        newState.askedQuestions = [...state.askedQuestions, state.pendingQuestions[0]];
        newState.pendingQuestions = state.pendingQuestions.slice(1);
      }
      // If all questions asked, move to farewell
      if (newState.pendingQuestions.length === 0) {
        newState.phase = 'farewell';
      }
      break;
    }

    case 'casual':
      if (state.turnCount > 2) {
        newState.phase = 'farewell';
      }
      break;
  }

  return newState;
}

export async function generateGreeting(audience: AudienceRow, lifeEvents: string[], questions: string[]): Promise<string> {
  const toneProfile = JSON.parse(audience.tone_profile);
  const callerName = process.env.CALLER_NAME || 'Matt';
  const greeting = toneProfile.greeting[Math.floor(Math.random() * toneProfile.greeting.length)];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: `You are ${callerName} making a phone call to your ${audience.relationship} (${audience.name}). Generate a very brief, warm opening line for the call. Just 1-2 sentences. Start with "${greeting}" or similar. Be natural and warm. No stage directions or asterisks.`,
    messages: [{ role: 'user', content: 'Start the call.' }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : greeting;
}
