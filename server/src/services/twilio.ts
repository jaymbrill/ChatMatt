import twilio from 'twilio';

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) throw new Error('Twilio credentials not configured');
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export async function initiateCall(toNumber: string, callId: string): Promise<string> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM_NUMBER;
  const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  if (!from) throw new Error('TWILIO_FROM_NUMBER not set');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL not set');

  const call = await client.calls.create({
    to: toNumber,
    from,
    url: `${baseUrl}/twiml/answer?callId=${callId}`,
    statusCallback: `${baseUrl}/twiml/status?callId=${callId}`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['completed', 'failed', 'no-answer', 'busy'],
  });

  return call.sid;
}
