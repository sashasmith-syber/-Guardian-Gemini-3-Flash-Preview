import { GoogleGenAI, Modality } from '@google/genai';
import type { BubbleOp, BubbleResult } from './bubble.ts';
import { SYSTEM_INSTRUCTION } from './persona.ts';

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-3-pro-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export async function invokeGemini(apiKey: string, op: BubbleOp): Promise<BubbleResult> {
  const ai = new GoogleGenAI({ apiKey });

  if (op.kind === 'tts') {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `Say with strategic authority: ${op.text.slice(0, 500)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      throw Object.assign(new Error('Audio response was empty.'), { status: 502 });
    }
    return { audioBase64 };
  }

  if (op.kind === 'transcribe') {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          parts: [
            { inlineData: { data: op.audioBase64, mimeType: op.mimeType } },
            { text: 'Transcribe this audio strictly. If it is a command, summarize the intent.' },
          ],
        },
      ],
    });
    return { text: response.text ?? '' };
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: op.text || 'Analyze attached data.' },
  ];
  if (op.image) {
    parts.push({ inlineData: { data: op.image.data, mimeType: op.image.mimeType } });
  }
  const response = await ai.models.generateContent({
    model: op.image ? IMAGE_MODEL : TEXT_MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });
  return { text: response.text ?? '' };
}
