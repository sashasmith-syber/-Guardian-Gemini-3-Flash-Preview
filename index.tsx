
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'OPERATOR' | 'GUARDIAN';
  content: string;
  timestamp: string;
  imageData?: string;
}

// Helper: Decode base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode PCM Audio Data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LINK_ERROR = 'API interface destabilized. Check network link.';

function csvCell(value: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

async function bubblePost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(LINK_ERROR);
  }
  let payload: { error?: unknown } = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(LINK_ERROR);
  }
  if (!response.ok) {
    const message = typeof payload.error === 'string' && payload.error.trim() ? payload.error : LINK_ERROR;
    throw new Error(message);
  }
  return payload as T;
}

function imagePayload(dataUrl: string | undefined): { mimeType: string; data: string } | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return undefined;
  return { mimeType: match[1], data: match[2] };
}

const controlClass = "inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-[#00f2ff]/40 bg-[#111] px-3 text-xs text-[#00f2ff] hover:bg-[#00f2ff]/10 disabled:cursor-not-allowed disabled:text-[#7eccd0]";

function attachmentFact(recording: boolean, image: boolean): string {
  if (recording && image) return "Image and microphone";
  if (recording) return "Microphone on";
  if (image) return "Image attached";
  return "Clear";
}

function shorten(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean;
}

const GuardianConsole: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [bubbleReady, setBubbleReady] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState("None yet");
  const [liveMessage, setLiveMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, isProcessing]);

  const refreshBubble = async () => {
    try {
      const response = await fetch("/api/health");
      const body = await response.json() as { ready?: boolean };
      setBubbleReady(Boolean(body.ready));
    } catch {
      setBubbleReady(false);
    }
  };

  useEffect(() => {
    void refreshBubble();
  }, []);

  const noteResult = (value: string, announce: string) => {
    setLastResult(shorten(value));
    setLiveMessage(announce);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            await transcribeAudio(base64Audio);
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied:", err);
        noteResult("Microphone blocked", "Failure. Microphone blocked.");
      }
    }
  };

  const transcribeAudio = async (base64Audio: string) => {
    setIsProcessing(true);
    try {
      const response = await bubblePost<{ text?: string }>('/api/transcribe', {
        audioBase64: base64Audio,
        mimeType: 'audio/webm',
      });
      setInput(prev => (prev + " " + (response.text || "")).trim());
      noteResult("Transcript added", "Transcript added to the command.");
    } catch (err) {
      console.error("Transcription error:", err);
      const detail = err instanceof Error && err.message.trim() ? err.message : LINK_ERROR;
      noteResult(detail, `Failure. ${detail}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const synthesizeTTS = async (text: string) => {
    try {
      const response = await bubblePost<{ audioBase64?: string }>('/api/tts', { text });
      const base64Audio = response.audioBase64;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        noteResult("Playing reply", "Playing reply.");
      }
    } catch (err) {
      console.error("TTS Synthesis error:", err);
      const detail = err instanceof Error && err.message.trim() ? err.message : LINK_ERROR;
      noteResult(detail, `Failure. ${detail}`);
    }
  };

  const exportDataLog = () => {
    if (messages.length === 0) return;
    setIsExporting(true);
    
    // Header row
    const headers = ['Role', 'Timestamp', 'Content'];
    const rows = messages.map(msg => [msg.role, msg.timestamp, msg.content].map(csvCell).join(','));
    const csvString = [headers.map(csvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `GUARDIAN_LOG_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;

    const userMessage: Message = {
      role: 'OPERATOR',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      imageData: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    if (fileRef.current) fileRef.current.value = "";
    setIsProcessing(true);
    setLiveMessage("Sending.");

    try {
      const response = await bubblePost<{ text?: string }>('/api/generate', {
        text: userMessage.content || "Analyze attached data.",
        image: imagePayload(userMessage.imageData),
      });

      const guardianMessage: Message = {
        role: 'GUARDIAN',
        content: response.text || "SYSTEM ERROR: Logical breach detected.",
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, guardianMessage]);
      noteResult("Reply received", guardianMessage.content);
    } catch (error) {
      console.error("Critical Failure:", error);
      const detail = error instanceof Error && error.message.trim() ? error.message : LINK_ERROR;
      setMessages(prev => [...prev, {
        role: 'GUARDIAN',
        content: `CRITICAL FAILURE: ${detail}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      noteResult(detail, `Failure. ${detail}`);
    } finally {
      setIsProcessing(false);
      void refreshBubble();
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openImagePicker = () => fileRef.current?.click();

  const bubbleFact = bubbleReady === null ? "Checking" : bubbleReady ? "Ready" : "Not ready";
  const canSend = (input.trim().length > 0 || Boolean(selectedImage)) && !isProcessing;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#0a0a0a] p-4 font-mono text-[#00f2ff]">
      <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-[0.03]" />
      <div className="sr-only" role="status" aria-live="polite">{liveMessage}</div>

      <header className="relative z-10 shrink-0 border-b border-[#00f2ff]/30 pb-3">
        <h1 className="text-xl font-bold tracking-wide">GUARDIAN STRATEGIST V3.0</h1>
        <p className="mt-1 text-xs">Sanctuary operational environment</p>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="System status">
          <button
            type="button"
            onClick={exportDataLog}
            disabled={messages.length === 0 || isExporting}
            aria-busy={isExporting}
            className={controlClass}
          >
            {isExporting ? "Exporting" : "Export log"}
          </button>
          <p className="inline-flex min-h-11 items-center gap-2 rounded border border-[#00f2ff]/30 px-3 text-xs">
            <span className="text-[#b7ecec]">Bubble</span>
            <span className="font-bold">{bubbleFact}</span>
          </p>
          <p className="inline-flex min-h-11 items-center gap-2 rounded border border-[#00f2ff]/30 px-3 text-xs">
            <span className="text-[#b7ecec]">Attachment</span>
            <span className="font-bold">{attachmentFact(isRecording, Boolean(selectedImage))}</span>
          </p>
          <p className="inline-flex min-h-11 items-center gap-2 rounded border border-[#00f2ff]/30 px-3 text-xs">
            <span className="text-[#b7ecec]">Last result</span>
            <span className="font-bold">{lastResult}</span>
          </p>
        </div>
      </header>

      <main aria-busy={isProcessing} className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col rounded border border-[#00f2ff]/10 bg-[#0d0d0d]">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm">Guardian protocol active. Attach an image or record, then send a command.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className={controlClass} onClick={openImagePicker}>Attach image</button>
                <button type="button" className={controlClass} onClick={toggleRecording} aria-pressed={isRecording}>
                  {isRecording ? "Stop recording" : "Record"}
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1 py-0.5 text-xs ${msg.role === 'OPERATOR' ? 'bg-[#00f2ff] text-black' : 'border border-[#00f2ff]/30 bg-[#222] text-[#00f2ff]'}`}>
                    {msg.role}
                  </span>
                  <span className="text-xs text-[#b7ecec]">{msg.timestamp}</span>
                </div>
                {msg.role === 'GUARDIAN' && (
                  <button type="button" onClick={() => synthesizeTTS(msg.content)} className={controlClass}>
                    Play
                  </button>
                )}
              </div>
              <div className={`border-l pl-4 text-sm leading-relaxed text-[#e0e0e0] ${msg.role === 'OPERATOR' ? 'border-[#00f2ff]/20' : 'border-[#00f2ff]/60'}`}>
                {msg.imageData && (
                  <img src={msg.imageData} className="mb-3 max-w-[200px] rounded border border-[#00f2ff]/30" alt="Attached image" />
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({node, ...props}) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse border border-[#00f2ff]/30 text-xs" {...props} /></div>,
                    th: ({node, ...props}) => <th className="border border-[#00f2ff]/30 bg-[#111] p-2 text-left text-[#00f2ff] uppercase" {...props} />,
                    td: ({node, ...props}) => <td className="border border-[#00f2ff]/30 p-2" {...props} />,
                    code: ({node, ...props}) => <code className="rounded bg-[#1a1a1a] p-1 text-[#9fd4d8]" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isProcessing && <p className="text-xs">Sending</p>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleCommand} className="border-t border-[#00f2ff]/20 bg-[#0a0a0a] p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            tabIndex={-1}
            onChange={handleImageUpload}
          />
          {selectedImage && (
            <div className="mb-3 flex items-center gap-3">
              <img src={selectedImage} alt="Attached image" className="h-12 w-12 rounded border border-[#00f2ff]/30 object-cover" />
              <button type="button" onClick={clearImage} className={controlClass}>Discard</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={controlClass} onClick={openImagePicker}>Attach image</button>
            <button type="button" className={controlClass} onClick={toggleRecording} aria-pressed={isRecording}>
              {isRecording ? "Stop recording" : "Record"}
            </button>
            <div className="flex min-h-11 min-w-[12rem] flex-1 items-center rounded border border-[#00f2ff]/40 bg-[#111]">
              <label htmlFor="command" className="shrink-0 pl-3 text-xs font-bold">Command</label>
              <input
                id="command"
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                placeholder="Enter command"
                className="min-h-11 w-full bg-transparent px-3 text-sm placeholder:text-[#9fd4d8] disabled:opacity-100"
              />
            </div>
            <button type="submit" className={controlClass} disabled={!canSend}>Send</button>
          </div>
        </form>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<GuardianConsole />);
