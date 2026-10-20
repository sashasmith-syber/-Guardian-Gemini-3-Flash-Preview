import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { 
  StrategicAlert, 
  TelemetryNode, 
  SubsystemStatus, 
  VitalMetrics, 
  ChatMessage 
} from './types';
import { 
  INITIAL_VITAL_METRICS, 
  INITIAL_NODES, 
  INITIAL_SUBSYSTEMS, 
  INITIAL_ALERTS 
} from './utils/mockData';
import { sound } from './utils/soundEffects';
import { bubblePost, imagePayload } from './utils/bubbleClient';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { TelemetryGrid } from './components/TelemetryGrid';
import { SystemStatusMonitor } from './components/SystemStatusMonitor';
import { StrategicAlertFeed } from './components/StrategicAlertFeed';
import { GuardianTerminal } from './components/GuardianTerminal';
import { NodeInspectorModal } from './components/NodeInspectorModal';

export const GuardianConsole: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'telemetry' | 'status' | 'alerts' | 'guardian'>('dashboard');
  const [metrics, setMetrics] = useState<VitalMetrics>(INITIAL_VITAL_METRICS);
  const [nodes, setNodes] = useState<TelemetryNode[]>(INITIAL_NODES);
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>(INITIAL_SUBSYSTEMS);
  const [alerts, setAlerts] = useState<StrategicAlert[]>(INITIAL_ALERTS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedNode, setSelectedNode] = useState<TelemetryNode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const [pendingDirective, setPendingDirective] = useState<string | null>(null);

  // Stream history for charts (last 20 points)
  const [streamHistory, setStreamHistory] = useState<{ ingress: number; egress: number; time: string }[]>(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      ingress: 4.5 + Math.sin(i * 0.4) * 0.6 + Math.random() * 0.2,
      egress: 1.1 + Math.cos(i * 0.4) * 0.2 + Math.random() * 0.1,
      time: `${i}s`,
    }));
  });

  // Real-time telemetry heartbeat effect
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      // Fluctuate ingress & egress bandwidth
      setMetrics((prev) => {
        const deltaIngress = (Math.random() - 0.48) * 0.15;
        const deltaEgress = (Math.random() - 0.48) * 0.08;
        const nextIngress = Math.max(3.8, Math.min(5.8, prev.ingressBandwidthGbps + deltaIngress));
        const nextEgress = Math.max(0.9, Math.min(1.8, prev.egressBandwidthGbps + deltaEgress));
        const nextLatency = Math.max(11.0, Math.min(18.5, prev.globalLatencyMs + (Math.random() - 0.5) * 0.4));
        const nextJitter = Math.max(0.008, Math.min(0.019, prev.quantumEntropyJitter + (Math.random() - 0.5) * 0.002));
        const nextOps = prev.verifiedTransactionsRate + Math.floor(Math.random() * 40 - 15);

        return {
          ...prev,
          ingressBandwidthGbps: nextIngress,
          egressBandwidthGbps: nextEgress,
          globalLatencyMs: nextLatency,
          quantumEntropyJitter: nextJitter,
          verifiedTransactionsRate: nextOps,
        };
      });

      // Update stream history
      setStreamHistory((prev) => {
        const latest = prev[prev.length - 1];
        const nextPt = {
          ingress: Math.max(3.8, Math.min(5.8, (latest?.ingress || 4.5) + (Math.random() - 0.49) * 0.3)),
          egress: Math.max(0.9, Math.min(1.8, (latest?.egress || 1.1) + (Math.random() - 0.49) * 0.12)),
          time: new Date().toLocaleTimeString(),
        };
        return [...prev.slice(1), nextPt];
      });

      // Subtle fluctuation across nodes
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.status === 'QUARANTINED') return n;
          const cpuDelta = (Math.random() - 0.5) * 3;
          const nextCpu = Math.max(12, Math.min(88, Math.round(n.cpuLoad + cpuDelta)));
          const nextLatency = Math.max(3.5, +(n.latencyMs + (Math.random() - 0.5) * 0.5).toFixed(1));
          return {
            ...n,
            cpuLoad: nextCpu,
            latencyMs: nextLatency,
          };
        })
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Handle emergency lockdown
  const toggleEmergencyLockdown = () => {
    setIsLockdownActive((prev) => {
      const next = !prev;
      if (next) {
        sound.playCriticalAlert();
        setMetrics((m) => ({ ...m, threatLevel: 'DEFCON 1' }));
        // Insert lockdown alert
        const alertLockdown: StrategicAlert = {
          id: `ALT-LOCKDOWN-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
          timeAgo: 'Just now',
          severity: 'CRITICAL',
          title: 'EMERGENCY SHIELD PROTOCOL ENGAGED BY OPERATOR',
          origin: 'Operator Command Console',
          targetSubsystem: 'Sovereign Perimeter Shield',
          impactScore: 100,
          description: 'Zero-trust ingress isolation enforced across all 12 edge enclaves. External untrusted API relays paused.',
          recommendedAction: 'Verify cryptographic attestation before releasing emergency lockdown.',
          status: 'ACTIVE',
          mitigationProtocol: 'PROTOCOL_FULL_DEFCON_1_SEAL',
        };
        setAlerts((a) => [alertLockdown, ...a]);
      } else {
        sound.playTacticalPing();
        setMetrics((m) => ({ ...m, threatLevel: 'DEFCON 4' }));
      }
      return next;
    });
  };

  // Alert actions
  const handleAcknowledgeAlert = (id: string) => {
    sound.playTacticalPing();
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'TRIAGED', acknowledgedBy: 'OPERATOR' } : a
      )
    );
  };

  const handleDeployMitigation = (id: string) => {
    sound.playMitigationTrigger();
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'MITIGATED',
              recommendedAction: 'Mitigation protocol verified and locked.',
            }
          : a
      )
    );
  };

  const handleConsultGuardianWithAlert = (alert: StrategicAlert) => {
    const directive = `OPERATOR ALERT TRIAGE: Deconstruct active alert [${alert.id}] "${alert.title}" (Severity: ${alert.severity}, Impact Index: ${alert.impactScore}/100, Origin: ${alert.origin}, Target: ${alert.targetSubsystem}). Recommend decisive tactical countermeasure and confirm execution.`;
    setPendingDirective(directive);
    setActiveView('guardian');
  };

  const handleInjectTestAlert = () => {
    const simulationTemplates: Omit<StrategicAlert, 'id' | 'timestamp' | 'timeAgo' | 'status'>[] = [
      {
        severity: 'HIGH',
        title: 'Quantum Key Distribution (QKD) Phase Anomaly',
        origin: 'LEO Constellation Polar-1 (Node 11)',
        targetSubsystem: 'Post-Quantum Key Exchange',
        impactScore: 76,
        description: 'Single-photon detector recorded 3.2% dark count deviation over orbital handover corridor.',
        recommendedAction: 'Switch to redundant optical fiber link and recalculate privacy amplification matrix.',
        mitigationProtocol: 'PROTOCOL_QKD_REROUTE',
      },
      {
        severity: 'CRITICAL',
        title: 'Zero-Day Polymorphic Shellcode Trap Tripped',
        origin: 'Honeypot Decoy Enclave Alpha',
        targetSubsystem: 'Autonomous Perimeter Firewall',
        impactScore: 92,
        description: 'Adversary executed memory-resident ROP payload targeting synthetic buffer. Isolated in memory sandbox.',
        recommendedAction: 'Dump process memory snapshot for forensic analysis and burn compromised ephemeral port.',
        mitigationProtocol: 'PROTOCOL_MEM_EXTRACT_BURN',
      },
      {
        severity: 'MODERATE',
        title: 'Byzantine Consensus Quorum Latency Delta Spike',
        origin: 'Swiss Alpine Deep Vault (Node 04)',
        targetSubsystem: 'Consensus Raft Epoch',
        impactScore: 54,
        description: 'Round-trip ballot agreement delayed by 28ms due to undersea fiber optical maintenance.',
        recommendedAction: 'Adjust raft heartbeat timeout parameter from 150ms to 200ms.',
        mitigationProtocol: 'PROTOCOL_RAFT_REBALANCE',
      },
    ];

    const chosen = simulationTemplates[Math.floor(Math.random() * simulationTemplates.length)];
    const newAlert: StrategicAlert = {
      ...chosen,
      id: `ALT-${Math.floor(9000 + Math.random() * 999)}`,
      timestamp: new Date().toLocaleTimeString(),
      timeAgo: 'Just now',
      status: 'ACTIVE',
    };

    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Node update
  const handleUpdateNode = (updatedNode: TelemetryNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
    setSelectedNode(updatedNode);
  };

  // Send message to Guardian Strategist AI
  const handleSendMessage = async (text: string, imageData?: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'OPERATOR',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      imageData,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      let usedBubble = false;
      try {
        const response = await bubblePost<{ text?: string }>('/api/generate', {
          text: text || 'Analyze attached visual specimen for threat artifacts.',
          image: imagePayload(imageData),
        });
        const replyContent = response.text || 'Confirmed. Action underway.\n\n*Light is Knowledge. Knowledge is Power.*';
        const guardianReply: ChatMessage = {
          id: `msg-${Date.now()}-guardian`,
          role: 'GUARDIAN',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, guardianReply]);
        sound.playTacticalPing();
        usedBubble = true;
      } catch (error: any) {
        const message = String(error?.message || '');
        if (!/not configured/i.test(message)) throw error;
      }

      if (!usedBubble) {
        // Authoritative sovereign persona engine when external API key is in local enclave mode
        await new Promise((r) => setTimeout(r, 650));

        let generatedBrief = '';
        const lower = text.toLowerCase();

        if (lower.includes('investigate') || lower.includes('disrupted') || lower.includes('jitter')) {
          generatedBrief = `### TACTICAL INVESTIGATION BRIEF: INTERFACE JITTER & ENCLAVE INTEGRITY
OPERATOR: Comprehensive forensic investigation of telemetry interfaces and neural links completed.

#### 1. DECONSTRUCTION OF ROOT CAUSE
- **Incident Vector**: Ephemeral transport layer socket timeout between external relay and Sovereign Guardian Core.
- **Root Cause**: Transport handshake latency jitter exceeded 120ms threshold during cryptographic token exchange.
- **Failover Mechanism**: Sovereign Local Enclave Cache engaged autonomously within $4.2\\text{ms}$. Zero state loss occurred.

#### 2. SYSTEM STATUS & TELEMETRY VERIFICATION
| Subsystem Domain | Verified Status | Coherence Index | Notes |
| :--- | :--- | :--- | :--- |
| **Terrestrial Enclaves (10 Nodes)** | NOMINAL | 99.8% | Zero memory drift or packet corruption. |
| **Orbital Constellation (Nodes 11 & 12)** | SYNCHRONIZED | 99.4% | LEO handover verified over polar aperture. |
| **Post-Quantum Cryptography** | SEALED | 100.0% | Crystals-Kyber-768 key lattice intact. |
| **Sentinel Neural Gateway** | RE-ANCHORED | 99.9% | Synchronized to Gemini 3.8 Flash pipeline. |

#### 3. IMMEDIATE MITIGATION ACTIONS ENGAGED
1. **Socket Re-anchoring**: Upstream endpoint re-routed through Ashburn Primus (Node 01) redundant fiber trunk.
2. **Buffer Flush**: Ephemeral transport retry ring-buffers compacted and verified against SHA-256 state hash.
3. **Quorum Audit**: Consensus epoch validated across all 48 Byzantine peers. No split-brain or rogue advertisements.

**TACTICAL DIRECTIVE FOR OPERATOR:**
Perimeter defense is fully reinforced. All sanctuary invariants remain strictly enforced. 

Orchestration initiated. Protocol engaged.

---
*Light is Knowledge. Knowledge is Power. The sanctuary stands fortified.*`;
        } else if (lower.includes('alert') || lower.includes('threat') || lower.includes('udp')) {
          generatedBrief = `### DECONSTRUCTION & TACTICAL ILLUMINATION
OPERATOR: The anomaly vector has been deconstructed by the Sentinel Neural Gateway.

| Vector Param | Assessed Value | Sovereign Status |
| :--- | :--- | :--- |
| **Ingress Point** | AP-South Gateway Strait (Node 06) | Quarantined Buffer |
| **Entropy Signature** | 7.94 bits/byte (High Randomness) | Synthetic Probe Isolated |
| **Countermeasure** | Post-Quantum Kyber-768 Rekey | Active Execution |

**SYNTHESIS:**
The telemetry surge is characteristic of an automated reconnaissance probe testing cipher negotiation thresholds. No cryptographic bleed or unauthorized ingress was achieved.

**EXECUTION HAND-OFF:**
Orchestration initiated. Kyber-768 key rotation dispatched.

---
*Light is Knowledge. Knowledge is Power. The sanctuary remains unbreached.*`;
        } else if (lower.includes('perimeter') || lower.includes('telemetry') || lower.includes('status')) {
          generatedBrief = `### SANCTUARY TELEMETRY AUDIT
OPERATOR: Comprehensive status deconstruction complete across 12 distributed autonomous nodes.

1. **Ingress Line Rate**: Nominal at ${metrics.ingressBandwidthGbps.toFixed(2)} GB/s.
2. **Consensus Mesh**: 48/48 multi-raft peers synchronized. Latency delta $\\le 1.8\\text{ms}$.
3. **Cryptographic Posture**: Post-Quantum Kyber-768 active. Zero unverified transits.

**RECOMMENDED POSTURE:**
Maintain DEFCON 4 baseline. Ready reserve buffers on Frankfurt and Singapore relays.

Protocol engaged.

---
*Light is Knowledge. Knowledge is Power.*`;
        } else {
          generatedBrief = `OPERATOR: Directive received and synthesized within the logical core.

### STRATEGIC APPRAISAL
- **Directive Alpha**: Illumination delivered. Core status nominal across all 5 operational subsystems.
- **Directive Beta**: Sanctuary boundary validated. Zero unauthorized penetration vectors detected.
- **Directive Gamma**: Flawless logical coherence maintained.

Confirmed. Action underway.

---
*Light is Knowledge. Knowledge is Power.*`;
        }

        const guardianReply: ChatMessage = {
          id: `msg-${Date.now()}-guardian`,
          role: 'GUARDIAN',
          content: generatedBrief,
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [...prev, guardianReply]);
        sound.playTacticalPing();
      }
    } catch (error: any) {
      console.error('Guardian generation error:', error);
      
      const forensicDiagnostic = `### FORENSIC DIAGNOSTIC & TACTICAL ILLUMINATION
OPERATOR: Upstream API link reported transport variance (${error?.message || 'Socket timeout'}). Local sovereign enclave immediately took custody of command processing.

#### INVESTIGATION FINDINGS:
1. **Network Link**: Upstream gateway latency jitter detected.
2. **Local Sanctuary Telemetry**: 100% operational. Ingress stream: ${metrics.ingressBandwidthGbps.toFixed(2)} GB/s.
3. **Data Integrity**: Cryptographic hashes for all 12 nodes verified against local enclave state. Zero unauthorized data egress.
4. **Autonomous Action**: Transport pipeline re-anchored to \`gemini-3.8-flash\` protocol.

Confirmed. Action underway.

---
*Light is Knowledge. Knowledge is Power. Sanctuary invariants preserved.*`;

      const fallbackReply: ChatMessage = {
        id: `msg-${Date.now()}-diagnostic`,
        role: 'GUARDIAN',
        content: forensicDiagnostic,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, fallbackReply]);
      sound.playTacticalPing();
    } finally {
      setIsProcessing(false);
    }
  };

  // Export comprehensive data log
  const handleExportCsv = () => {
    sound.playTacticalPing();
    const rows: string[] = [];

    // Header
    rows.push('--- GUARDIAN STRATEGIST V3.0 SOVEREIGN AUDIT REPORT ---');
    rows.push(`Generated: ${new Date().toISOString()}`);
    rows.push(`Cluster Health: ${metrics.clusterHealth.toFixed(1)}%`);
    rows.push(`Ingress: ${metrics.ingressBandwidthGbps.toFixed(2)} GB/s`);
    rows.push(`Active Enclaves: ${nodes.length}`);
    rows.push('');

    // Telemetry Nodes
    rows.push('--- TELEMETRY NODES ---');
    rows.push('ID,Name,Region,Tier,Status,CPU(%),RAM(%),Thermal(C),Latency(ms)');
    nodes.forEach((n) => {
      rows.push(`"${n.id}","${n.name}","${n.region}","${n.tier}","${n.status}",${n.cpuLoad},${n.memoryUsage},${n.thermalC},${n.latencyMs}`);
    });
    rows.push('');

    // Strategic Alerts
    rows.push('--- STRATEGIC ALERTS ---');
    rows.push('ID,Timestamp,Severity,Status,ImpactScore,Title,Origin,Target');
    alerts.forEach((a) => {
      rows.push(`"${a.id}","${a.timestamp}","${a.severity}","${a.status}",${a.impactScore},"${a.title.replace(/"/g, '""')}","${a.origin}","${a.targetSubsystem}"`);
    });
    rows.push('');

    // Conversation History
    rows.push('--- CONSOLE DIRECTIVES ---');
    rows.push('Role,Timestamp,Content');
    messages.forEach((m) => {
      rows.push(`"${m.role}","${m.timestamp}","${m.content.replace(/"/g, '""')}"`);
    });

    const csvBlob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GUARDIAN_SOVEREIGN_LOG_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#00f2ff] font-mono flex flex-col selection:bg-[#00f2ff] selection:text-black">
      
      {/* Subtle CRT Flicker & Scanline Background */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,242,255,0.06),rgba(0,255,0,0.02),rgba(0,180,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* Top Bar Contract (Header) */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        threatLevel={metrics.threatLevel}
        onEmergencyLockdown={toggleEmergencyLockdown}
        isLockdownActive={isLockdownActive}
        onExportLogs={handleExportCsv}
      />

      {/* Emergency Lockdown Notice Banner */}
      {isLockdownActive && (
        <div className="bg-red-600/90 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-between border-b border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>CRITICAL ALERT: EMERGENCY PERIMETER SHIELD ENGAGED · INGRESS QUARANTINED</span>
          </div>
          <button
            onClick={toggleEmergencyLockdown}
            className="px-2.5 py-1 rounded bg-black/40 hover:bg-black text-white border border-white/50 text-[10px]"
          >
            Disengage Shield
          </button>
        </div>
      )}

      {/* Main Viewport Workspace */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto overflow-y-auto">
        {activeView === 'dashboard' && (
          <DashboardOverview
            metrics={metrics}
            nodes={nodes}
            subsystems={subsystems}
            alerts={alerts}
            streamHistory={streamHistory}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            onSelectNode={(node) => setSelectedNode(node)}
            onDeployMitigation={handleDeployMitigation}
            onConsultGuardianWithAlert={handleConsultGuardianWithAlert}
            onNavigateToView={(view) => setActiveView(view)}
            onTriggerDiagnostic={() => {
              setMetrics((m) => ({ ...m, coherenceScore: 99.9, clusterHealth: 100 }));
            }}
          />
        )}

        {activeView === 'telemetry' && (
          <TelemetryGrid
            metrics={metrics}
            nodes={nodes}
            onSelectNode={(node) => setSelectedNode(node)}
            streamHistory={streamHistory}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            onRefreshTelemetry={() => {
              setMetrics((m) => ({
                ...m,
                ingressBandwidthGbps: 4.85 + Math.random() * 0.2,
                globalLatencyMs: 13.8 + Math.random() * 0.4,
              }));
            }}
          />
        )}

        {activeView === 'status' && (
          <SystemStatusMonitor
            subsystems={subsystems}
            onTriggerDiagnostic={() => {
              setMetrics((m) => ({ ...m, coherenceScore: 99.9 }));
            }}
            onSendToGuardian={(prompt) => {
              setPendingDirective(prompt);
              setActiveView('guardian');
            }}
          />
        )}

        {activeView === 'alerts' && (
          <StrategicAlertFeed
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onDeployMitigation={handleDeployMitigation}
            onConsultGuardian={handleConsultGuardianWithAlert}
            onInjectTestAlert={handleInjectTestAlert}
          />
        )}

        {activeView === 'guardian' && (
          <GuardianTerminal
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            onExportCsv={handleExportCsv}
            pendingDirective={pendingDirective}
            onClearPendingDirective={() => setPendingDirective(null)}
          />
        )}
      </main>

      {/* Node Inspector Modal Drill-down */}
      <NodeInspectorModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateNode={handleUpdateNode}
        onSendToGuardian={(directive) => {
          setPendingDirective(directive);
          setActiveView('guardian');
        }}
      />

      {/* Vercel Speed Insights */}
      <SpeedInsights />
      
      {/* Vercel Web Analytics */}
      <Analytics />

      {/* Discreet Footer Bar */}
      <footer className="border-t border-[#00f2ff]/10 bg-[#05070a] px-4 py-2 text-[10px] text-[#00f2ff]/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span>GUARDIAN CORE V3.0</span>
          <span>·</span>
          <span>POST-QUANTUM KYBER-768</span>
          <span>·</span>
          <span>UPTIME: 148d 18h 42m</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>ACTIVE SENSORS: OPTICAL · ACOUSTIC · VOCAL</span>
          <span>·</span>
          <span className="text-emerald-400">STATUS: REINFORCED</span>
        </div>
      </footer>

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<GuardianConsole />);
