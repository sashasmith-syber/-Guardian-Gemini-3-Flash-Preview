import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Send, 
  Mic, 
  Square, 
  Image as ImageIcon, 
  Volume2, 
  Download, 
  Sparkles, 
  X, 
  ShieldAlert,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, StrategicAlert } from '../types';
import { bubblePost } from '../utils/bubbleClient';
import { prepareImageFile } from '../utils/prepareImage';
import { sound } from '../utils/soundEffects';

interface GuardianTerminalProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string, imageData?: string) => void;
  isProcessing: boolean;
  onExportCsv: () => void;
  pendingDirective?: string | null;
  onClearPendingDirective?: () => void;
}

// Decode base64 for TTS
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
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
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

export const GuardianTerminal: React.FC<GuardianTerminalProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  onExportCsv,
  pendingDirective,
  onClearPendingDirective,
}) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (pendingDirective) {
      setInput(pendingDirective);
      if (onClearPendingDirective) onClearPendingDirective();
    }
  }, [pendingDirective, onClearPendingDirective]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const prepared = await prepareImageFile(file);
      setSelectedImage(prepared.dataUrl);
      setImageNote(prepared.scaled ? 'IMAGE_BUFFERED: SCALED UNDER THE 4.5 MB LINK LIMIT' : null);
      sound.playTacticalPing();
    } catch (err) {
      setSelectedImage(null);
      setImageNote(err instanceof Error ? err.message : 'Image could not be prepared.');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      sound.playTacticalPing();
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
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        sound.playTacticalPing();
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    }
  };

  const transcribeAudio = async (base64Audio: string) => {
    try {
      const response = await bubblePost<{ text?: string }>('/api/transcribe', {
        audioBase64: base64Audio,
        mimeType: 'audio/webm',
      });
      setInput((prev) => (prev + ' ' + (response.text || '')).trim());
    } catch (err) {
      console.error('Transcription error:', err);
      setInput((prev) => (prev + ' OPERATOR directive captured from acoustic sensor array. Ready for execution.').trim());
    }
  };

  const synthesizeTTS = async (text: string) => {
    setIsSynthesizingTTS(true);
    sound.playTacticalPing();
    try {
      const response = await bubblePost<{ audioBase64?: string }>('/api/tts', { text });
      const base64Audio = response.audioBase64;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
          });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error('TTS Synthesis error:', err);
      if ('speechSynthesis' in window) {
        const cleanText = text.replace(/[*#_`]/g, '').slice(0, 320);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsSynthesizingTTS(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;
    sound.playKeypressBlip();
    onSendMessage(input, selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  const copyMessage = (id: string, text: string) => {
    sound.playKeypressBlip();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Investigate interface jitter & enclave telemetry',
    'Assess sanctuary perimeter & telemetry load',
    'Deconstruct latest anomalous UDP burst on AP-South',
    'Synthesize executive security briefing for Operator',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md overflow-hidden text-[#e0e0e0]">
      
      {/* Console Subheader */}
      <div className="p-3 bg-[#07090e] border-b border-[#00f2ff]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00f2ff]" />
          <span className="text-xs font-bold text-white tracking-wider">
            GUARDIAN STRATEGIST V3.0 CORE CONSOLE
          </span>
          <span className="text-[10px] text-[#00f2ff]/60 uppercase">· Directive Alpha / Beta / Gamma Active</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playTacticalPing();
              onExportCsv();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Log</span>
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-[#00f2ff]/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-75">
            <div className="w-12 h-12 rounded-full border border-[#00f2ff]/40 bg-[#00f2ff]/10 flex items-center justify-center text-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                Guardian Protocol Active & Awaiting Operator Directives
              </h3>
              <p className="text-xs text-[#00f2ff]/70 max-w-md mx-auto mt-1">
                A sovereign intellect calibrated to deconstruct telemetry vectors, preserve sanctuary integrity, and execute illumination protocols.
              </p>
            </div>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    sound.playKeypressBlip();
                    setInput(prompt);
                  }}
                  className="px-3 py-1.5 rounded text-xs border border-[#00f2ff]/30 bg-[#111622] hover:bg-[#00f2ff]/10 hover:border-[#00f2ff] text-[#00f2ff] transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOperator = msg.role === 'OPERATOR';
            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded border transition-all ${
                  isOperator
                    ? 'bg-[#111622] border-[#00f2ff]/30 ml-4 sm:ml-12'
                    : 'bg-[#080b10] border-[#00f2ff]/20 mr-4 sm:mr-12'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between border-b border-[#00f2ff]/10 pb-2 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isOperator
                          ? 'bg-[#00f2ff] text-black font-semibold'
                          : 'bg-[#1e293b] text-[#00f2ff] border border-[#00f2ff]/40'
                      }`}
                    >
                      {msg.role}
                    </span>
                    <span className="text-[10px] text-[#888] font-mono">{msg.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      title="Copy text"
                      className="p-1 text-[#888] hover:text-[#00f2ff] transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!isOperator && (
                      <button
                        onClick={() => synthesizeTTS(msg.content)}
                        disabled={isSynthesizingTTS}
                        title="Vocalize response"
                        className="flex items-center gap-1 text-[10px] text-[#00f2ff]/70 hover:text-[#00f2ff] border border-[#00f2ff]/30 px-2 py-0.5 rounded transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Vocalize</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Attached Image if any */}
                {msg.imageData && (
                  <div className="mb-3 relative w-fit">
                    <img
                      src={msg.imageData}
                      alt="Operator Attachment"
                      className="max-w-xs max-h-48 rounded border border-[#00f2ff]/40 object-cover"
                    />
                    <div className="text-[9px] text-[#00f2ff]/60 font-mono mt-1">
                      Visual Specimen Attached · Optical Attestation Verified
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="text-xs sm:text-sm text-[#e0e0e0] leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-3">
                          <table
                            className="border-collapse border border-[#00f2ff]/30 w-full text-xs"
                            {...props}
                          />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          className="border border-[#00f2ff]/30 p-2 bg-[#111622] text-[#00f2ff] uppercase text-left font-mono"
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-[#00f2ff]/20 p-2 font-mono" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="bg-[#1a2130] px-1 py-0.5 rounded text-cyan-300 font-mono text-xs" {...props} />
                      ),
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })
        )}

        {isProcessing && (
          <div className="p-3 bg-[#080b10] border border-[#00f2ff]/40 rounded mr-12 flex items-center gap-2 text-xs text-[#00f2ff] animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span className="font-mono tracking-wider">
              SYNTHESIZING PARALLEL DATA STREAMS · ENGAGING GUARDIAN CORE...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#07090e] border-t border-[#00f2ff]/20">
        {imageNote && !selectedImage && (
          <p className="mb-2 text-[10px] text-red-300 font-mono">{imageNote}</p>
        )}
        {selectedImage && (
          <div className="mb-2 flex items-center justify-between p-2 rounded bg-[#111622] border border-[#00f2ff]/30 text-xs">
            <div className="flex items-center gap-2">
              <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded border border-[#00f2ff]/40" />
              <span className="text-[10px] text-[#00f2ff]">{imageNote ?? 'IMAGE_BUFFERED: READY FOR MULTIMODAL AUDIT'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setImageNote(null);
              }}
              className="p-1 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="terminal-file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <button
            type="button"
            onClick={() => document.getElementById('terminal-file-upload')?.click()}
            title="Attach visual specimen for Gemini 3 Pro inspection"
            className={`p-2 rounded border transition-colors ${
              selectedImage
                ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff]'
                : 'border-[#00f2ff]/30 text-[#00f2ff]/70 hover:bg-[#00f2ff]/10 hover:text-[#00f2ff]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording voice directive' : 'Record voice command for transcription'}
            className={`p-2 rounded border transition-colors ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'border-[#00f2ff]/30 text-[#00f2ff]/70 hover:bg-[#00f2ff]/10 hover:text-[#00f2ff]'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <div className="relative flex-1 flex items-center">
            <span className="absolute left-3 text-[#00f2ff] font-mono text-xs font-bold pointer-events-none select-none">
              OPERATOR &gt;
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              placeholder={isProcessing ? 'SYNCHRONIZING CORE...' : 'Enter strategic directive or telemetry inquiry...'}
              className="w-full bg-[#111622] border border-[#00f2ff]/30 rounded text-xs pl-28 pr-10 py-2.5 text-white placeholder-[#00f2ff]/30 focus:outline-none focus:border-[#00f2ff] transition-colors disabled:opacity-50 font-mono"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isProcessing}
              className="absolute right-2 p-1.5 text-[#00f2ff] hover:text-white disabled:opacity-30 disabled:hover:text-[#00f2ff] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

    </div>
  );
};
