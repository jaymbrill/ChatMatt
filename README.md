# ChatMatt — AI-Powered Personal Outbound Calls

Make personalized AI-driven phone calls to your wife, parents, or children — with the right tone for each audience, your real life updates, and questions you want to ask. All conversations are captured as transcripts.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Voice (TTS) | ElevenLabs API |
| Outbound Calls | Twilio |
| Conversation AI | Anthropic Claude (claude-sonnet-4-6) |
| Database | SQLite (better-sqlite3) |
| Real-time | WebSockets (ws) |

---

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567

ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=ErXwobaYiN019PkySvjV   # Antoni (male) — change to your preferred voice

ANTHROPIC_API_KEY=sk-ant-xxxx

PORT=3001
PUBLIC_BASE_URL=https://your-server.ngrok.io   # See note below
CALLER_NAME=Matt
```

### 3. Expose your server (for Twilio webhooks)

Twilio needs to reach your server. In development, use [ngrok](https://ngrok.com):

```bash
ngrok http 3001
```

Copy the `https://abc123.ngrok.io` URL into `PUBLIC_BASE_URL`.

### 4. Run

```bash
# Development (runs both server + client with hot reload)
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

---

## How It Works

### UI Workflow

1. **Select audience** — Wife, Parents, or Children (each has a pre-tuned tone)
2. **Set phone number** — Click "Edit" on any audience card to add their number
3. **Add life updates** — Things you want to share (e.g. "Got a promotion")
4. **Add questions** — Things you want to ask (e.g. "How's school going?")
5. **Start Call** — App calls them via Twilio

### Call Flow

```
UI → POST /api/calls
  → Twilio dials the number
  → Person answers → Twilio hits POST /twiml/answer
    → Claude generates greeting
    → ElevenLabs converts to speech
    → Twilio plays audio + listens for response
  → Person speaks → Twilio hits POST /twiml/gather
    → Speech transcript saved
    → Claude generates contextual response
    → ElevenLabs converts to speech
    → Loop until farewell or hangup
  → Twilio status callback → call marked complete
  → WebSocket pushes transcript updates to UI in real-time
```

### Conversation Phases

| Phase | What Happens |
|-------|-------------|
| `greeting` | Warm hello tailored to audience |
| `updates` | Shares each life event naturally |
| `questions` | Asks each question, follows up on answers |
| `farewell` | Wraps up the call warmly |

### Audience Tones

| Audience | Style |
|----------|-------|
| Wife | Warm, intimate, loving — uses pet names |
| Parents | Respectful, nostalgic, warm — feels like catching up |
| Children | Playful, encouraging, simple language |

---

## ElevenLabs Voice IDs

Some good male voices to try:

| Voice | ID |
|-------|----|
| Antoni (default) | `ErXwobaYiN019PkySvjV` |
| Josh | `TxGEqnHWrfWFTfGW9XjX` |
| Arnold | `VR6AewLTigWG4xSOukaG` |
| Adam | `pNInz6obpgDQGcFmaJgB` |

---

## Project Structure

```
ChatMatt/
├── server/
│   ├── src/
│   │   ├── index.ts          # Express server + HTTP + WebSocket
│   │   ├── database.ts       # SQLite schema + queries
│   │   ├── websocket.ts      # WebSocket broadcast
│   │   ├── routes/
│   │   │   ├── calls.ts      # POST/GET /api/calls
│   │   │   ├── audiences.ts  # GET/PATCH /api/audiences
│   │   │   ├── transcripts.ts# GET /api/transcripts/:callId
│   │   │   └── twiml.ts      # Twilio webhooks (/twiml/answer, /gather, /status)
│   │   └── services/
│   │       ├── ai.ts         # Claude conversation generation
│   │       ├── elevenlabs.ts # Text-to-speech
│   │       └── twilio.ts     # Outbound call initiation
│   └── audio/                # Generated MP3 files (gitignored)
├── client/
│   └── src/
│       ├── App.tsx            # Main app + WebSocket client
│       ├── types.ts           # Shared TypeScript types
│       └── components/
│           ├── AudienceSelector.tsx  # Audience cards + phone edit
│           ├── ContentBuilder.tsx    # Life events + questions builder
│           ├── ActiveCall.tsx        # Live call transcript view
│           └── TranscriptList.tsx    # Past calls + transcript modal
└── .env.example
```
