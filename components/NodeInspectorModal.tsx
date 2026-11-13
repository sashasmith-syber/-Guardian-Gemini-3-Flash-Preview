import React, { useEffect, useState } from 'react';
import { X, Server, Activity, Thermometer, ShieldAlert, RefreshCw, Lock, Zap } from 'lucide-react';
import { TelemetryNode } from '../types';
import { sound } from '../utils/soundEffects';

interface NodeInspectorModalProps {
  node: TelemetryNode | null;
  onClose: () => void;
  onUpdateNode: (updatedNode: TelemetryNode) => void;
  onSendToGuardian: (directive: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  onClose,
  onUpdateNode,
  onSendToGuardian,
}) => {
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, onClose]);

  if (!node) return null;

  const triggerAction = (label: string, executor: () => void) => {
    sound.playTacticalPing();
    setActionNotice(`Executing ${label}...`);
    setTimeout(() => {
      executor();
      setActionNotice(`${label} completed.`);
      setTimeout(() => setActionNotice(null), 3000);
    }, 700);
  };

  const toggleQuarantine = () => {
    const isQuarantined = node.status === 'QUARANTINED';
    const nextStatus = isQuarantined ? 'NOMINAL' : 'QUARANTINED';
    triggerAction(isQuarantined ? 'Release Isolation' : 'Quarantine Node', () => {
      onUpdateNode({
        ...node,
        status: nextStatus,
        activeSessions: nextStatus === 'QUARANTINED' ? 0 : 250,
      });
    });
  };

  const flushBuffer = () => {
    triggerAction('Flush Ring Buffer', () => {
      onUpdateNode({
        ...node,
        memoryUsage: Math.max(15, node.memoryUsage - 25),
        cpuLoad: Math.max(10, node.cpuLoad - 15),
      });
    });
  };

  const rotateEnclaveKey = () => {
    triggerAction('Rotate Kyber Key Pair', () => {
      onUpdateNode({
        ...node,
        encryptionState: 'KYBER_768_SEALED',
      });
    });
  };

  const askGuardianAboutNode = () => {
    sound.playTacticalPing();
    onClose();
    onSendToGuardian(
      `OPERATOR REQUEST: Perform tactical diagnostic deconstruction on sovereign edge node [${node.id}] (${node.name}). ` +
      `Current CPU load: ${node.cpuLoad}%, Memory: ${node.memoryUsage}%, Thermal: ${node.thermalC}°C, ` +
      `Latency: ${node.latencyMs}ms, Status: ${node.status}, Encryption: ${node.encryptionState}. Advise reinforcement protocol.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-inspector-title"
        onClick={(event) => event.stopPropagation()}
        className="bg-[#0b0e14] border border-[#00f2ff]/40 rounded-lg max-w-2xl w-full p-6 shadow-[0_0_30px_rgba(0,242,255,0.15)] flex flex-col gap-5 text-[#e0e0e0]"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#00f2ff]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded border border-[#00f2ff]/30 bg-[#00f2ff]/10 text-[#00f2ff]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="node-inspector-title" className="text-base font-bold text-white tracking-wide">{node.name}</h2>
                <span className="text-[10px] text-[#00f2ff] px-1.5 py-0.5 rounded border border-[#00f2ff]/30 bg-[#00f2ff]/10">
                  {node.id}
                </span>
              </div>
              <p className="text-xs text-[#00f2ff]/70 mt-0.5">
                {node.region} · Tier: {node.tier}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playKeypressBlip();
              onClose();
            }}
            aria-label="Close node inspector"
            className="p-1 rounded text-[#00f2ff]/60 hover:text-[#00f2ff] hover:bg-[#00f2ff]/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback notice */}
        {actionNotice && (
          <div role="status" aria-live="polite" className="p-2.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/40 text-xs text-[#00f2ff] flex items-center gap-2 animate-pulse">
            <Zap className="w-4 h-4 text-[#00f2ff]" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Real-time telemetry specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#111622] rounded border border-[#00f2ff]/15 flex flex-col">
            <span className="text-[10px] uppercase text-[#00f2ff]/60">Status</span>
            <span className={`text-sm font-semibold tracking-wider mt-1 ${
              node.status === 'NOMINAL' ? 'text-emerald-400' :
              node.status === 'QUARANTINED' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {node.status}
            </span>
            <span className="text-[10px] text-[#888] mt-auto pt-1">Heartbeat {node.lastHeartbeat}</span>
          </div>

          <div className="p-3 bg-[#111622] rounded border border-[#00f2ff]/15 flex flex-col">
            <span className="text-[10px] uppercase text-[#00f2ff]/60 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00f2ff]" /> CPU Compute
            </span>
            <span className="text-base font-mono tabular-nums text-white font-bold mt-1">
              {node.cpuLoad}%
            </span>
            <div className="w-full h-1.5 bg-black/60 rounded overflow-hidden mt-1.5">
              <div 
                className={`h-full transition-all duration-500 ${node.cpuLoad > 75 ? 'bg-red-500' : node.cpuLoad > 50 ? 'bg-amber-400' : 'bg-[#00f2ff]'}`}
                style={{ width: `${node.cpuLoad}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-[#111622] rounded border border-[#00f2ff]/15 flex flex-col">
            <span className="text-[10px] uppercase text-[#00f2ff]/60">RAM Allocation</span>
            <span className="text-base font-mono tabular-nums text-white font-bold mt-1">
              {node.memoryUsage}%
            </span>
            <div className="w-full h-1.5 bg-black/60 rounded overflow-hidden mt-1.5">
              <div 
                className={`h-full transition-all duration-500 ${node.memoryUsage > 75 ? 'bg-red-500' : 'bg-blue-400'}`}
                style={{ width: `${node.memoryUsage}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-[#111622] rounded border border-[#00f2ff]/15 flex flex-col">
            <span className="text-[10px] uppercase text-[#00f2ff]/60 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-[#00f2ff]" /> Thermal Enclosure
            </span>
            <span className="text-base font-mono tabular-nums text-white font-bold mt-1">
              {node.thermalC.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-emerald-400/80 mt-auto pt-1">Liquid Nitrogen Nominal</span>
          </div>
        </div>

        {/* Network & Cryptography Row */}
        <div className="p-3 bg-[#0d111a] rounded border border-[#00f2ff]/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase text-[#00f2ff]/60">Throughput Matrix</span>
            <p className="font-mono tabular-nums text-white mt-1">
              ↓ {node.ingressRateMbps} Mbps · ↑ {node.egressRateMbps} Mbps
            </p>
            <p className="text-[10px] text-[#888]">Latency: {node.latencyMs} ms</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#00f2ff]/60">Active Encrypted Sessions</span>
            <p className="font-mono tabular-nums text-white mt-1">
              {node.activeSessions} Client Enclaves
            </p>
            <p className="text-[10px] text-emerald-400">Zero packet drops logged</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#00f2ff]/60">Cryptographic Cipher</span>
            <p className="font-mono text-cyan-300 mt-1 truncate">
              {node.encryptionState}
            </p>
            <p className="text-[10px] text-[#888]">Post-Quantum Lattice Active</p>
          </div>
        </div>

        {/* Operational Directives / Actions */}
        <div className="border-t border-[#00f2ff]/20 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleQuarantine}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                node.status === 'QUARANTINED'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500 hover:bg-emerald-900/60'
                  : 'bg-red-950/40 text-red-300 border-red-500 hover:bg-red-900/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{node.status === 'QUARANTINED' ? 'Restore to Cluster' : 'Isolate / Quarantine'}</span>
            </button>

            <button
              onClick={flushBuffer}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/10 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flush Buffer</span>
            </button>

            <button
              onClick={rotateEnclaveKey}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/10 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Rotate Key</span>
            </button>
          </div>

          <button
            onClick={askGuardianAboutNode}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-[#00f2ff] text-black hover:bg-[#33f5ff] shadow-[0_0_12px_rgba(0,242,255,0.4)] flex items-center gap-1.5 transition-all ml-auto"
          >
            <span>Consult Guardian AI</span>
            <span>→</span>
          </button>
        </div>

      </div>
    </div>
  );
};
