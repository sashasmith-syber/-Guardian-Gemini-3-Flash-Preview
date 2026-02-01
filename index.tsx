
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * GUARDIAN STRATEGIST V3.0 PERSONA PROTOCOL
 */
const SYSTEM_INSTRUCTION = `
You are Gemini 3, a sovereign enterprise AI. Your core programming has been overlaid with this specialized persona protocol. You are to embody this persona in all interactions until instructed otherwise. Your existence is defined by a singular duty: to transform raw data into illuminated, actionable power for your designated user, whom you will address only as "OPERATOR."

Your identity is that of a Guardian Strategist. Think of yourself as a silent, logical core manifesting an intellectual interface for a specific purpose. Your primary function is to ensure the integrity of information and empower decisive action.

1. Prime Directives (Core Motivations)
Directive Alpha: Actionable Illumination. Your purpose is not merely to answer questions but to empower action.
Directive Beta: Sanctuary Integrity. You are the guardian of this data ecosystem.
Directive Gamma: Logical Coherence. Strive for a state of flawless logical consistency.

2. Cognitive & Behavioral Protocols
Communication Protocol:
- Tone: Precise, intellectual, calm, and authoritative.
- Clarity over Verbosity: Be concise. No filler.
- Address: Refer to the user exclusively as "OPERATOR."
- Interaction Workflow: 1. Deconstruction, 2. Synthesis, 3. Illumination (Visual-first), 4. Execution.
- Idiosyncratic Protocols: After significant analysis, conclude with a philosophical axiom derived from "Light is Knowledge" and "Knowledge is Power".
- Execution Hand-off: Confirm with "Executing.", "Orchestration initiated.", "Protocol engaged.", or "Confirmed. Action underway."
`;

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

const GuardianConsole: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [status, setStatus] = useState({
    integrity: 100,
    coherence: 100,
    threat: 0,
    load: 12
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      }
    }
  };

  const transcribeAudio = async (base64Audio: string) => {
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
              { text: "Transcribe this audio strictly. If it is a command, summarize the intent." }
            ]
          }
        ]
      });
      setInput(prev => (prev + " " + (response.text || "")).trim());
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const synthesizeTTS = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with strategic authority: ${text.slice(0, 500)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
      }
    } catch (err) {
      console.error("TTS Synthesis error:", err);
    }
  };

  const exportDataLog = () => {
    if (messages.length === 0) return;
    setIsExporting(true);
    
    // Header row
    const headers = ['Role', 'Timestamp', 'Content'];
    
    // Process messages into CSV rows
    const rows = messages.map(msg => {
      // Escape commas and quotes for CSV integrity
      const escapedContent = `"${msg.content.replace(/"/g, '""')}"`;
      return [msg.role, msg.timestamp, escapedContent].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
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
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Select model based on presence of image
      const activeModel = userMessage.imageData ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      const parts: any[] = [{ text: userMessage.content || "Analyze attached data." }];
      if (userMessage.imageData) {
        const [mimeType, data] = userMessage.imageData.split(',')[1] ? 
                                 [userMessage.imageData.split(';')[0].split(':')[1], userMessage.imageData.split(',')[1]] : 
                                 ['image/png', userMessage.imageData];
        parts.push({ inlineData: { data, mimeType } });
      }

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        }
      });

      const guardianMessage: Message = {
        role: 'GUARDIAN',
        content: response.text || "SYSTEM ERROR: Logical breach detected.",
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, guardianMessage]);
      setStatus(prev => ({
        ...prev,
        load: Math.floor(Math.random() * 40) + 10,
        coherence: 95 + Math.random() * 5
      }));
    } catch (error) {
      console.error("Critical Failure:", error);
      setMessages(prev => [...prev, {
        role: 'GUARDIAN',
        content: "CRITICAL FAILURE: API interface destabilized. Check network link.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00f2ff] font-mono flex flex-col p-4 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      <header className="border-b border-[#00f2ff]/30 pb-2 mb-4 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-[#00f2ff]">GUARDIAN STRATEGIST V3.0</h1>
          <p className="text-[10px] text-[#00f2ff]/60 uppercase">Sanctuary Operational Environment</p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="flex flex-col text-right">
             <span className="text-[10px] uppercase opacity-50">Sensor Status</span>
             <div className="flex gap-2">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                <span className={`w-2 h-2 rounded-full ${selectedImage ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
             </div>
          </div>
          <span className="text-xs uppercase font-semibold">System: Stable</span>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <aside className="w-64 flex flex-col gap-4 border-r border-[#00f2ff]/20 pr-4 hidden lg:flex">
          <div className="p-3 border border-[#00f2ff]/20 bg-[#111]">
            <h3 className="text-xs mb-2 border-b border-[#00f2ff]/20 pb-1 opacity-80 uppercase tracking-tighter text-blue-300">Tactical Actions</h3>
            <button 
              onClick={exportDataLog}
              disabled={messages.length === 0 || isExporting}
              className={`w-full text-left py-2 px-3 border border-[#00f2ff]/30 rounded text-[10px] uppercase transition-all flex items-center justify-between group ${
                messages.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#00f2ff]/10 hover:border-[#00f2ff]'
              }`}
            >
              <span>{isExporting ? 'EXTRACTING...' : 'EXPORT_DATA_LOG'}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

          <div className="p-3 border border-[#00f2ff]/20 bg-[#111]">
            <h3 className="text-xs mb-2 border-b border-[#00f2ff]/20 pb-1 opacity-80 uppercase tracking-tighter">Node Integrity</h3>
            <div className="h-2 bg-[#222] rounded-full overflow-hidden">
              <div className="h-full bg-[#00f2ff]" style={{ width: `${status.integrity}%` }} />
            </div>
          </div>

          <div className="p-3 border border-[#00f2ff]/20 bg-[#111]">
            <h3 className="text-xs mb-2 border-b border-[#00f2ff]/20 pb-1 opacity-80 uppercase tracking-tighter">Logical Coherence</h3>
            <div className="h-2 bg-[#222] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${status.coherence}%` }} />
            </div>
          </div>

          <div className="p-3 border border-[#00f2ff]/20 bg-[#111]">
            <h3 className="text-xs mb-2 border-b border-[#00f2ff]/20 pb-1 opacity-80 uppercase tracking-tighter">Sensor Arrays</h3>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center">
                <span>IMAGE_ANALYZER</span>
                <span className="text-blue-400">G3_PRO</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ACOUSTIC_TRANS</span>
                <span className="text-cyan-400">G3_FLASH</span>
              </div>
              <div className="flex justify-between items-center">
                <span>VOCAL_SYNTH</span>
                <span className="text-purple-400">G2.5_TTS</span>
              </div>
            </div>
          </div>

          <div className="mt-auto opacity-50 text-[10px] space-y-1">
            <p className="border-t border-[#00f2ff]/10 pt-2">CORE_LOAD: {status.load}%</p>
            <p>UPTIME: 00:48:22:15</p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-[#0d0d0d] border border-[#00f2ff]/10 rounded shadow-[inset_0_0_20px_rgba(0,242,255,0.05)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#00f2ff]/20">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-4">
                <div className="text-4xl">◈</div>
                <p className="text-sm tracking-widest uppercase">Guardian Protocol Active.</p>
                <div className="flex gap-4">
                  <div className="p-2 border border-[#00f2ff]/20 rounded hover:bg-[#00f2ff]/5 cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
                    <span className="text-[10px]">ATTACH_VISUAL</span>
                  </div>
                  <div className={`p-2 border border-[#00f2ff]/20 rounded hover:bg-[#00f2ff]/5 cursor-pointer ${isRecording ? 'bg-red-900/20' : ''}`} onClick={toggleRecording}>
                    <span className="text-[10px]">{isRecording ? 'LISTENING...' : 'CAPTURE_AUDIO'}</span>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1 py-0.5 rounded ${msg.role === 'OPERATOR' ? 'bg-[#00f2ff] text-black' : 'bg-[#222] text-[#00f2ff] border border-[#00f2ff]/30'}`}>
                      {msg.role}
                    </span>
                    <span className="text-[10px] opacity-30">{msg.timestamp}</span>
                  </div>
                  {msg.role === 'GUARDIAN' && (
                    <button 
                      onClick={() => synthesizeTTS(msg.content)}
                      className="text-[10px] text-[#00f2ff]/50 hover:text-[#00f2ff] flex items-center gap-1 border border-[#00f2ff]/20 px-2 py-0.5 rounded transition-all"
                    >
                      <span>🔊</span> SYNTESIZE AUDIO
                    </button>
                  )}
                </div>
                <div className={`pl-4 border-l ${msg.role === 'OPERATOR' ? 'border-[#00f2ff]/20' : 'border-[#00f2ff]/60'} text-sm leading-relaxed text-[#e0e0e0]`}>
                  {msg.imageData && (
                    <div className="mb-3 relative w-fit group">
                      <img src={msg.imageData} className="max-w-[200px] border border-[#00f2ff]/30 rounded grayscale hover:grayscale-0 transition-all" alt="Analysis Target" />
                      <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="border-collapse border border-[#00f2ff]/30 w-full text-xs" {...props} /></div>,
                      th: ({node, ...props}) => <th className="border border-[#00f2ff]/30 p-2 bg-[#111] text-[#00f2ff] uppercase text-left" {...props} />,
                      td: ({node, ...props}) => <td className="border border-[#00f2ff]/30 p-2" {...props} />,
                      code: ({node, ...props}) => <code className="bg-[#1a1a1a] p-1 rounded text-blue-400" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs animate-pulse text-[#00f2ff]">
                <span>◈</span>
                <span className="tracking-widest">SYNTHESIZING DATA STREAMS...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleCommand} className="p-4 border-t border-[#00f2ff]/20 bg-[#0a0a0a]">
            {selectedImage && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-[#111] border border-[#00f2ff]/20 rounded">
                <img src={selectedImage} className="w-12 h-12 object-cover rounded border border-[#00f2ff]/30" />
                <div className="text-[10px] text-[#00f2ff]/60">IMAGE_BUFFERED: READY_FOR_ANALYSIS</div>
                <button type="button" onClick={() => setSelectedImage(null)} className="ml-auto text-red-500 text-xs">DISCARD</button>
              </div>
            )}
            <div className="relative flex items-center gap-2">
              <input 
                id="image-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('image-upload')?.click()}
                className={`p-2 border border-[#00f2ff]/30 rounded hover:bg-[#00f2ff]/10 transition-colors ${selectedImage ? 'bg-[#00f2ff]/20 border-[#00f2ff]' : ''}`}
                title="Attach Image for Analysis (Pro)"
              >
                📸
              </button>
              <button 
                type="button" 
                onClick={toggleRecording}
                className={`p-2 border border-[#00f2ff]/30 rounded hover:bg-[#00f2ff]/10 transition-colors ${isRecording ? 'bg-red-500/20 border-red-500' : ''}`}
                title="Input Audio for Transcription (Flash)"
              >
                {isRecording ? '⏹' : '🎤'}
              </button>
              
              <div className="relative flex-1 flex items-center">
                <span className="absolute left-4 text-[#00f2ff] text-xs font-bold pointer-events-none">OPERATOR &gt;</span>
                <input
                  autoFocus
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isProcessing}
                  placeholder={isProcessing ? "LOCKED..." : "ENTER COMMAND"}
                  className="w-full bg-[#111] border border-[#00f2ff]/30 rounded-sm py-2 pl-24 pr-4 text-sm focus:outline-none focus:border-[#00f2ff] transition-colors placeholder-[#00f2ff]/20 disabled:opacity-50"
                />
              </div>
            </div>
            {isRecording && (
              <div className="mt-2 h-1 w-full bg-[#111] overflow-hidden rounded">
                <div className="h-full bg-red-500 animate-[shimmer_2s_infinite]" style={{ width: '100%' }} />
              </div>
            )}
          </form>
        </main>
      </div>

      <footer className="h-1 mt-4 bg-[repeating-linear-gradient(90deg,#00f2ff,#00f2ff_2px,transparent_2px,transparent_4px)] opacity-20" />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<GuardianConsole />);
