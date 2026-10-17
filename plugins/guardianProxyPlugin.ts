import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION, MAX_IMAGE_DATA_URL_CHARS } from '../utils/guardianPersona';

type JsonRecord = Record<string, unknown>;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      // Cap body size (~6MB) to avoid abuse
      if (chunks.reduce((n, c) => n + c.length, 0) > 6_000_000) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: JsonRecord) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function getApiKey(mode: string): string {
  const env = loadEnv(mode, process.cwd(), '');
  const key = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'undefined' || key.length < 8) return '';
  return key;
}

function getModels(mode: string) {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    chat: env.GEMINI_CHAT_MODEL || process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    transcribe:
      env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-2.5-flash',
    tts: env.GEMINI_TTS_MODEL || process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
  };
}

function parseDataUrl(imageData: string): { mimeType: string; data: string } | null {
  if (!imageData || imageData.length > MAX_IMAGE_DATA_URL_CHARS) return null;
  const [header, base64Data] = imageData.split(',');
  if (!base64Data) return null;
  const mimeType = header?.includes(':')
    ? header.split(';')[0].split(':')[1] || 'image/png'
    : 'image/png';
  if (!mimeType.startsWith('image/')) return null;
  return { mimeType, data: base64Data };
}

async function handleGenerate(
  ai: GoogleGenAI,
  models: ReturnType<typeof getModels>,
  body: any
) {
  const text = typeof body.text === 'string' ? body.text : '';
  const systemInstruction =
    typeof body.systemInstruction === 'string' && body.systemInstruction.trim()
      ? body.systemInstruction
      : SYSTEM_INSTRUCTION;

  const parts: Array<Record<string, unknown>> = [
    { text: text || 'Analyze attached visual specimen for threat artifacts.' },
  ];

  if (typeof body.imageData === 'string' && body.imageData) {
    const parsed = parseDataUrl(body.imageData);
    if (!parsed) {
      return { status: 400, body: { error: 'Invalid or oversized image payload.', code: 'BAD_IMAGE' } };
    }
    parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
  }

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  for (const turn of history) {
    if (!turn || (turn.role !== 'user' && turn.role !== 'model')) continue;
    if (typeof turn.text !== 'string' || !turn.text.trim()) continue;
    contents.push({ role: turn.role, parts: [{ text: turn.text.slice(0, 8000) }] });
  }
  contents.push({ role: 'user', parts });

  const response = await ai.models.generateContent({
    model: models.chat,
    contents,
    config: {
      systemInstruction,
      temperature: 0.2,
    },
  });

  return {
    status: 200,
    body: {
      text:
        response.text ||
        'Confirmed. Action underway.\n\n*Light is Knowledge. Knowledge is Power.*',
    },
  };
}

async function handleTranscribe(
  ai: GoogleGenAI,
  models: ReturnType<typeof getModels>,
  body: any
) {
  const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
  if (!audioBase64 || audioBase64.length > 5_000_000) {
    return { status: 400, body: { error: 'Missing or oversized audio payload.', code: 'BAD_AUDIO' } };
  }
  const mimeType =
    typeof body.mimeType === 'string' && body.mimeType.startsWith('audio/')
      ? body.mimeType
      : 'audio/webm';

  const response = await ai.models.generateContent({
    model: models.transcribe,
    contents: [
      {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          {
            text: 'Transcribe this audio strictly. If it is a strategic command, extract the actionable directive for the Guardian.',
          },
        ],
      },
    ],
  });

  return { status: 200, body: { text: response.text || '' } };
}

async function handleTts(ai: GoogleGenAI, models: ReturnType<typeof getModels>, body: any) {
  const text = typeof body.text === 'string' ? body.text.slice(0, 400) : '';
  if (!text.trim()) {
    return { status: 400, body: { error: 'Missing TTS text.', code: 'BAD_TTS' } };
  }

  const response = await ai.models.generateContent({
    model: models.tts,
    contents: text,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const audioBase64 =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;

  return { status: 200, body: { audioBase64 } };
}

function attachGuardianMiddleware(server: ViteDevServer | PreviewServer, mode: string) {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0] || '';
    if (!url.startsWith('/api/guardian/')) return next();

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed', code: 'METHOD' });
      return;
    }

    const apiKey = getApiKey(mode);
    if (!apiKey) {
      sendJson(res, 503, {
        error: 'GEMINI_API_KEY not configured on server. Local enclave fallback active.',
        code: 'NO_API_KEY',
      });
      return;
    }

    let body: any = {};
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (err: any) {
      sendJson(res, 400, {
        error: err?.message || 'Invalid JSON body',
        code: 'BAD_JSON',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const models = getModels(mode);
      let result: { status: number; body: JsonRecord };

      if (url === '/api/guardian/generate') {
        result = await handleGenerate(ai, models, body);
      } else if (url === '/api/guardian/transcribe') {
        result = await handleTranscribe(ai, models, body);
      } else if (url === '/api/guardian/tts') {
        result = await handleTts(ai, models, body);
      } else {
        sendJson(res, 404, { error: 'Unknown guardian endpoint', code: 'NOT_FOUND' });
        return;
      }

      sendJson(res, result.status, result.body);
    } catch (err: any) {
      console.error('[guardian-proxy]', err?.message || err);
      sendJson(res, 502, {
        error: err?.message || 'Upstream Gemini request failed',
        code: 'UPSTREAM_ERROR',
      });
    }
  });
}

/** Keeps GEMINI_API_KEY on the Vite server only — never injects it into the client bundle. */
export function guardianProxyPlugin(mode: string): Plugin {
  return {
    name: 'guardian-gemini-proxy',
    configureServer(server) {
      attachGuardianMiddleware(server, mode);
    },
    configurePreviewServer(server) {
      attachGuardianMiddleware(server, mode);
    },
  };
}
