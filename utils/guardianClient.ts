import { SYSTEM_INSTRUCTION } from './guardianPersona';

export type GuardianHistoryTurn = {
  role: 'user' | 'model';
  text: string;
};

export class GuardianApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'GUARDIAN_API_ERROR') {
    super(message);
    this.name = 'GuardianApiError';
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (res.status === 503 || payload?.code === 'NO_API_KEY') {
    throw new GuardianApiError(
      payload?.error || 'Guardian enclave: API key not configured on server.',
      503,
      'NO_API_KEY'
    );
  }

  if (!res.ok) {
    throw new GuardianApiError(
      payload?.error || `Guardian proxy failed (${res.status})`,
      res.status,
      payload?.code || 'PROXY_ERROR'
    );
  }

  return payload as T;
}

export async function generateGuardianReply(opts: {
  text: string;
  imageData?: string;
  history?: GuardianHistoryTurn[];
}): Promise<string> {
  const data = await postJson<{ text: string }>('/api/guardian/generate', {
    text: opts.text,
    imageData: opts.imageData,
    history: opts.history ?? [],
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  return data.text;
}

export async function transcribeGuardianAudio(base64Audio: string, mimeType = 'audio/webm'): Promise<string> {
  const data = await postJson<{ text: string }>('/api/guardian/transcribe', {
    audioBase64: base64Audio,
    mimeType,
  });
  return data.text;
}

export async function synthesizeGuardianSpeech(text: string): Promise<string | null> {
  const data = await postJson<{ audioBase64: string | null }>('/api/guardian/tts', {
    text: text.slice(0, 400),
  });
  return data.audioBase64 ?? null;
}
