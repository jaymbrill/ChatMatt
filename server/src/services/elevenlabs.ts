import axios from 'axios';
import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export async function textToSpeech(text: string, filename: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV';

  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const filePath = path.join(AUDIO_DIR, `${filename}.mp3`);

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
    }
  );

  fs.writeFileSync(filePath, response.data);
  return `${filename}.mp3`;
}

export function getAudioFilePath(filename: string): string {
  return path.join(AUDIO_DIR, filename);
}

export function cleanupAudioFile(filename: string): void {
  const filePath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
