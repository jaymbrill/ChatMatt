import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { getDb } from './database';
import { initWebSocket } from './websocket';
import callsRouter from './routes/calls';
import transcriptsRouter from './routes/transcripts';
import audiencesRouter from './routes/audiences';
import twimlRouter from './routes/twiml';

const app = express();
const server = http.createServer(app);

// Initialize DB on startup
getDb();

// Initialize WebSocket
initWebSocket(server);

const isProd = process.env.NODE_ENV === 'production';

// Middleware
if (!isProd) {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve generated audio files publicly (Twilio needs to fetch them)
const AUDIO_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'audio')
  : path.join(__dirname, '..', 'audio');

if (!require('fs').existsSync(AUDIO_DIR)) {
  require('fs').mkdirSync(AUDIO_DIR, { recursive: true });
}

app.use('/audio', express.static(AUDIO_DIR));

// API routes
app.use('/api/calls', callsRouter);
app.use('/api/transcripts', transcriptsRouter);
app.use('/api/audiences', audiencesRouter);

// Twilio TwiML webhook routes
app.use('/twiml', twimlRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// In production, serve the React client build
if (isProd) {
  const clientBuild = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`ChatMatt server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});
