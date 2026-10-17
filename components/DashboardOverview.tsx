import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Wifi, 
  ArrowRight, 
  Flame, 
  Radio, 
  Zap, 
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { VitalMetrics, TelemetryNode, SubsystemStatus, StrategicAlert } from '../types';
import { sound } from '../utils/soundEffects';

interface DashboardOverviewProps {
  metrics: VitalMetrics;
  nodes: TelemetryNode[];
  subsystems: SubsystemStatus[];
  alerts: StrategicAlert[];
  streamHistory: { ingress: number; egress: number; time: string }[];
  isStreaming: boolean;
  setIsStreaming: (val: boolean) => void;
  onSelectNode: (node: TelemetryNode) => void;
  onDeployMitigation: (alertId: string) => void;
  onConsultGuardianWithAlert: (alert: StrategicAlert) => void;
  onNavigateToView: (view: 'telemetry' | 'status' | 'alerts' | 'guardian') => void;
  onTriggerDiagnostic: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  nodes,
  subsystems,
  alerts,
  streamHistory,
  isStreaming,
  setIsStreaming,
  onSelectNode,
  onDeployMitigation,
  onConsultGuardianWithAlert,
  onNavigateToView,
  onTriggerDiagnostic,
}) => {
  // Take top active alerts for the compact feed
  const activeAlerts = alerts
    .filter((a) => a.status === 'ACTIVE')
    .slice(0, 3);

  const criticalUnmitigated = alerts.filter(
    (a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE'
  ).length;

  // Take top 6 nodes for the compact dashboard overview grid
  const keyNodes = nodes.slice(0, 6);

  // Max value for SVG
  const maxIngress = Math.max(...streamHistory.map((d) => d.ingress), 6.0) * 1.15;
  const chartWidth = 500;
  const chartHeight = 80;

  const ingressPath = streamHistory.length > 1
    ? 'M ' +
      streamHistory
        .map((pt, i) => {
          const x = (i / (streamHistory.length - 1)) * chartWidth;
          const y = chartHeight - (pt.ingress / maxIngress) * chartHeight;
          return `${x},${y}`;
        })
        .join(' L ')
    : '';

  const egressPath = streamHistory.length > 1
    ? 'M ' +
      streamHistory
        .map((pt, i) => {
          const x = (i / (streamHistory.length - 1)) * chartWidth;
          const y = chartHeight - (pt.egress / maxIngress) * chartHeight;
          return `${x},${y}`;
        })
        .join(' L ')
    : '';

  return (
    <div className="flex flex-col gap-6 text-[#e0e0e0]">
      
      {/* Real-Time Strategic Readiness KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Threat Posture</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-[#00f2ff] border border-[#00f2ff]/30">
              {metrics.threatLevel}
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">GUARDED</div>
          <span className="text-[10px] text-emerald-400 mt-1">Sanctuary Invariants Intact</span>
        </div>

        <div className="p-3 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Cluster Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
            {metrics.clusterHealth.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#888] mt-1">{nodes.length} Enclaves Online</span>
        </div>

        <div className="p-3 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Ingress Bandwidth</span>
            <Activity className="w-3.5 h-3.5 text-[#00f2ff]" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
            {metrics.ingressBandwidthGbps.toFixed(2)} <span className="text-xs font-normal text-[#00f2ff]">GB/s</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">Global Line Rate</span>
        </div>

        <div className="p-3 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Neural Coherence</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
            {metrics.coherenceScore.toFixed(1)}%
          </div>
          <span className="text-[10px] text-purple-300 mt-1">Gemini 3 Flash/Pro Sync</span>
        </div>

        <div className="p-3 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Active Alerts</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-400">
            {alerts.filter((a) => a.status === 'ACTIVE').length} Directives
          </div>
          <span className="text-[10px] text-[#888] mt-1">
            {criticalUnmitigated} Critical Breach{criticalUnmitigated === 1 ? '' : 'es'} Unmitigated
          </span>
        </div>
      </div>

      {/* Main Command Grids: 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Real-Time Telemetry & System Status */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Section 1: Live Telemetry Bandwidth Grid */}
          <div className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#00f2ff]/10 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00f2ff]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-Time Telemetry Stream
                </h3>
                <span className="text-[10px] text-[#00f2ff]/60">· 1s Pulse</span>
              </div>
              <button
                onClick={() => {
                  sound.playKeypressBlip();
                  onNavigateToView('telemetry');
                }}
                className="text-xs text-[#00f2ff] hover:underline flex items-center gap-1"
              >
                <span>Full Telemetry Grid</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Compact Sparkline Container */}
            <div className="relative w-full h-24 bg-[#06080c] rounded border border-[#00f2ff]/10 overflow-hidden px-2 pt-1">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 80">
                {egressPath && (
                  <path
                    d={egressPath}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}
                {ingressPath && (
                  <path
                    d={ingressPath}
                    fill="none"
                    stroke="#00f2ff"
                    strokeWidth="2"
                    className="shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                  />
                )}
              </svg>
              <div className="absolute top-1 left-2 text-[9px] font-mono text-[#00f2ff]/60 flex gap-4">
                <span>↓ Ingress: {metrics.ingressBandwidthGbps.toFixed(2)} GB/s</span>
                <span className="text-purple-300">↑ Egress: {metrics.egressBandwidthGbps.toFixed(2)} GB/s</span>
                <span className="text-[#888]">Latency: {metrics.globalLatencyMs.toFixed(1)} ms</span>
              </div>
            </div>

            {/* Key Edge Node Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {keyNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => {
                    sound.playKeypressBlip();
                    onSelectNode(node);
                  }}
                  className="p-2.5 rounded bg-[#111622] border border-[#00f2ff]/15 hover:border-[#00f2ff]/60 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white group-hover:text-[#00f2ff] truncate">
                      {node.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      {node.latencyMs}ms
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#888]">
                    <span>CPU: <span className="text-white font-mono">{node.cpuLoad}%</span></span>
                    <span>RAM: <span className="text-white font-mono">{node.memoryUsage}%</span></span>
                  </div>

                  <div className="w-full h-1 bg-black/60 rounded overflow-hidden mt-1.5">
                    <div
                      className={`h-full ${node.cpuLoad > 70 ? 'bg-amber-400' : 'bg-[#00f2ff]'}`}
                      style={{ width: `${node.cpuLoad}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Subsystem Status Monitoring Matrix */}
          <div className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#00f2ff]/10 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  System Status & Hardware Integrity
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playKeypressBlip();
                  onNavigateToView('status');
                }}
                className="text-xs text-[#00f2ff] hover:underline flex items-center gap-1"
              >
                <span>Full Diagnostics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subsystems.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded bg-[#0d121c] border border-[#00f2ff]/15 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{sub.name}</h4>
                      <p className="text-[10px] text-[#888] truncate max-w-[200px]">
                        {sub.activeModelOrSpec}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {sub.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#888]">Integrity Index:</span>
                    <span className="text-white font-bold tabular-nums">{sub.healthScore.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1 bg-black/60 rounded overflow-hidden mt-1">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${sub.healthScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (4-5 cols): Strategic Alert Feeds & Directives */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          {/* Strategic Alert Feed Panel */}
          <div className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#00f2ff]/10 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Strategic Alert Feeds
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playKeypressBlip();
                  onNavigateToView('alerts');
                }}
                className="text-xs text-[#00f2ff] hover:underline flex items-center gap-1"
              >
                <span>View All ({alerts.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {activeAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#888] bg-[#07090e] rounded">
                  No active threat directives requiring Operator intervention.
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded border flex flex-col gap-2 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-[#15090b] border-red-500/40'
                        : 'bg-[#140f09] border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            alert.severity === 'CRITICAL'
                              ? 'text-red-400 bg-red-950/40 border border-red-500/40'
                              : 'text-amber-400 bg-amber-950/40 border border-amber-500/40'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-[#00f2ff]">{alert.id}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#888]">{alert.timeAgo}</span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{alert.title}</h4>
                    <p className="text-[11px] text-[#b0b0b0] line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="pt-2 border-t border-[#00f2ff]/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onDeployMitigation(alert.id)}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                      >
                        Deploy Shield
                      </button>

                      <button
                        onClick={() => {
                          sound.playTacticalPing();
                          onConsultGuardianWithAlert(alert);
                        }}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#00f2ff] text-black hover:bg-[#33f5ff] flex items-center gap-1 transition-all"
                      >
                        <span>Consult AI</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guardian Core Card */}
          <div className="p-4 bg-[#07090e] border border-[#00f2ff]/30 rounded-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00f2ff]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Guardian Strategist Console
                </h4>
              </div>
              <span className="text-[9px] text-[#00f2ff] font-mono">PERSONA_V3</span>
            </div>

            <p className="text-xs text-[#aaa] mt-2 leading-relaxed">
              Gemini 3 sovereign intelligence standing by for Operator tactical inquiry, deconstruction, and visual audit.
            </p>

            <div className="mt-4 pt-3 border-t border-[#00f2ff]/20 flex items-center justify-between">
              <span className="text-[10px] text-[#00f2ff]/70 font-mono">
                Directives Alpha · Beta · Gamma
              </span>
              <button
                onClick={() => {
                  sound.playTacticalPing();
                  onNavigateToView('guardian');
                }}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#111622] hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 text-[#00f2ff] flex items-center gap-1.5 transition-colors"
              >
                <span>Launch Core Terminal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
