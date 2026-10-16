import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Key, 
  Network, 
  Sparkles, 
  Mic, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  RotateCw,
  Terminal,
  FileCheck
} from 'lucide-react';
import { SubsystemStatus } from '../types';
import { sound } from '../utils/soundEffects';

interface SystemStatusMonitorProps {
  subsystems: SubsystemStatus[];
  onTriggerDiagnostic: () => void;
  onSendToGuardian: (prompt: string) => void;
}

export const SystemStatusMonitor: React.FC<SystemStatusMonitorProps> = ({
  subsystems,
  onTriggerDiagnostic,
  onSendToGuardian,
}) => {
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [activeAttestation, setActiveAttestation] = useState<string>('VERIFIED_KYBER_768_ED25519');

  const runFullDiagnostic = () => {
    sound.playTacticalPing();
    setIsRunningDiagnostic(true);
    setDiagnosticLogs([
      'Initiating Byzantine Quorum attestation across 12 node enclaves...',
    ]);

    setTimeout(() => {
      setDiagnosticLogs((prev) => [
        ...prev,
        'Checking Sentinel Neural weights against cryptographic master hash: 0x9f8e... MATCHED (100%)',
      ]);
      sound.playKeypressBlip();
    }, 600);

    setTimeout(() => {
      setDiagnosticLogs((prev) => [
        ...prev,
        'Verifying Quantum Entropy bitstream via NIST SP 800-90B: 0 divergence.',
      ]);
      sound.playKeypressBlip();
    }, 1200);

    setTimeout(() => {
      setDiagnosticLogs((prev) => [
        ...prev,
        'Probing Post-Quantum Key Distribution (QKD) fiber pairs: 1,240,000 keys/sec active.',
      ]);
      sound.playTacticalPing();
    }, 1800);

    setTimeout(() => {
      setDiagnosticLogs((prev) => [
        ...prev,
        'DIAGNOSTIC SWEEP COMPLETE: All 5 primary subsystems within sovereign parameters.',
      ]);
      setIsRunningDiagnostic(false);
      onTriggerDiagnostic();
    }, 2400);
  };

  const getSubsystemIcon = (category: SubsystemStatus['category']) => {
    switch (category) {
      case 'NEURAL_CORE':
        return <Cpu className="w-5 h-5 text-[#00f2ff]" />;
      case 'CRYPTOGRAPHY':
        return <Key className="w-5 h-5 text-purple-400" />;
      case 'CONSENSUS_MESH':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'QUANTUM_ENTROPY':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'SENSOR_ARRAYS':
        return <Mic className="w-5 h-5 text-amber-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[#00f2ff]" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 text-[#e0e0e0]">
      
      {/* System Integrity Overview Banner */}
      <div className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Subsystem Status & Cryptographic Enclave Monitoring
            </h2>
          </div>
          <p className="text-xs text-[#00f2ff]/70 mt-1">
            Continuous real-time verification of neural pipelines, cryptographic keys, and consensus quorum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runFullDiagnostic}
            disabled={isRunningDiagnostic}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 border transition-all ${
              isRunningDiagnostic
                ? 'bg-[#00f2ff]/20 border-[#00f2ff] text-[#00f2ff] animate-pulse cursor-wait'
                : 'bg-[#111622] hover:bg-[#00f2ff]/10 border-[#00f2ff]/40 text-[#00f2ff]'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
            <span>{isRunningDiagnostic ? 'Running Diagnostic Sweep...' : 'Run Diagnostic Sweep'}</span>
          </button>

          <button
            onClick={() => {
              sound.playTacticalPing();
              onSendToGuardian(
                'OPERATOR REQUEST: Provide a comprehensive architectural health evaluation across all 5 sovereign subsystems. Verify compliance with Directive Alpha (Actionable Illumination) and Directive Beta (Sanctuary Integrity).'
              );
            }}
            className="px-4 py-2 rounded text-xs font-semibold bg-[#00f2ff] text-black hover:bg-[#33f5ff] shadow-[0_0_12px_rgba(0,242,255,0.4)] transition-all"
          >
            Ask Guardian Audit
          </button>
        </div>
      </div>

      {/* Subsystem Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subsystems.map((sub) => {
          const isHealthy = sub.healthScore >= 99;
          return (
            <div
              key={sub.id}
              className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between hover:border-[#00f2ff]/50 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#111622] border border-[#00f2ff]/20">
                      {getSubsystemIcon(sub.category)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide">{sub.name}</h3>
                      <span className="text-[10px] text-[#00f2ff]/60 uppercase">{sub.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    {isHealthy ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className={isHealthy ? 'text-emerald-400' : 'text-amber-400'}>
                      {sub.status}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="my-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[10px] uppercase text-[#888]">Health Score</span>
                    <span className="font-mono tabular-nums text-white font-bold">
                      {sub.healthScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111622] rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${sub.healthScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#aaa]">
                  <p className="flex justify-between">
                    <span className="text-[#666]">Spec:</span>
                    <span className="text-white/90 font-mono text-right truncate ml-2 max-w-[220px]">
                      {sub.activeModelOrSpec}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#666]">Throughput:</span>
                    <span className="text-cyan-300 font-mono">{sub.throughputRate}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#666]">Last Inspected:</span>
                    <span className="text-[#888] font-mono">{sub.lastInspection}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#00f2ff]/10 text-[10px] text-[#888] italic">
                "{sub.details}"
              </div>
            </div>
          );
        })}

        {/* Security Attestation Hardware Card */}
        <div className="p-4 bg-[#0d121d] border border-purple-500/30 rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  Hardware Remote Attestation
                </h3>
              </div>
              <span className="text-[10px] text-purple-400 font-mono">ROOT_OF_TRUST</span>
            </div>

            <p className="text-xs text-[#aaa] mt-2">
              Cryptographic evidence that all enclave nodes run untampered sovereign firmware.
            </p>

            <div className="mt-3 p-2.5 rounded bg-black/40 border border-purple-500/20 font-mono text-[10px] text-purple-300 space-y-1">
              <div>PCR_0: 0x8a1b2c3d4e5f6071...</div>
              <div>ENCLAVE_PUBKEY: {activeAttestation}</div>
              <div>ATTESTATION_EPOCH: #9201 (Valid)</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Zero Integrity Violations
            </span>
            <button
              onClick={() => {
                sound.playTacticalPing();
                setActiveAttestation(`VERIFIED_KYBER_${Math.floor(1000 + Math.random() * 9000)}`);
              }}
              className="text-[10px] text-purple-300 hover:text-white underline"
            >
              Re-attest Enclaves
            </button>
          </div>
        </div>
      </div>

      {/* Live Diagnostic Terminal Feed */}
      {diagnosticLogs.length > 0 && (
        <div className="p-4 bg-[#06080c] border border-[#00f2ff]/30 rounded-md flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#00f2ff]/20 pb-2">
            <div className="flex items-center gap-2 text-[#00f2ff]">
              <Terminal className="w-4 h-4" />
              <span className="font-bold tracking-wider uppercase">Live Diagnostic Execution Feed</span>
            </div>
            <button
              onClick={() => setDiagnosticLogs([])}
              className="text-[10px] text-[#00f2ff]/50 hover:text-[#00f2ff]"
            >
              Clear Feed
            </button>
          </div>
          <div className="space-y-1.5 py-1 text-[#00f2ff]/90">
            {diagnosticLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-[#00f2ff]/40">[{index + 1}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
