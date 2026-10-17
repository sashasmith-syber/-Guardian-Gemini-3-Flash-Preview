import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Wifi, 
  Cpu, 
  ShieldCheck, 
  Radio, 
  Search, 
  Play, 
  Pause, 
  RotateCw, 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft,
  SlidersHorizontal
} from 'lucide-react';
import { TelemetryNode, VitalMetrics } from '../types';
import { sound } from '../utils/soundEffects';

interface TelemetryGridProps {
  metrics: VitalMetrics;
  nodes: TelemetryNode[];
  onSelectNode: (node: TelemetryNode) => void;
  streamHistory: { ingress: number; egress: number; time: string }[];
  isStreaming: boolean;
  setIsStreaming: (val: boolean) => void;
  onRefreshTelemetry: () => void;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  metrics,
  nodes,
  onSelectNode,
  streamHistory,
  isStreaming,
  setIsStreaming,
  onRefreshTelemetry,
}) => {
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'load' | 'latency'>('load');

  const activeEnclaveCount = useMemo(
    () => nodes.filter((n) => n.status !== 'QUARANTINED').length,
    [nodes]
  );
  const totalEnclaveCount = nodes.length;

  // Filtered and sorted nodes
  const processedNodes = useMemo(() => {
    return nodes
      .filter((node) => {
        const matchesTier = filterTier === 'ALL' || node.tier === filterTier;
        const matchesSearch =
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTier && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'load') return b.cpuLoad - a.cpuLoad;
        if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
        return a.name.localeCompare(b.name);
      });
  }, [nodes, filterTier, searchQuery, sortBy]);

  // Generate SVG path for stream charts
  const maxIngress = useMemo(() => {
    const max = Math.max(...streamHistory.map((d) => d.ingress), 6.0);
    return max * 1.15;
  }, [streamHistory]);

  const ingressPath = useMemo(() => {
    if (streamHistory.length < 2) return '';
    const width = 600;
    const height = 120;
    const points = streamHistory.map((pt, i) => {
      const x = (i / (streamHistory.length - 1)) * width;
      const y = height - (pt.ingress / maxIngress) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [streamHistory, maxIngress]);

  const egressPath = useMemo(() => {
    if (streamHistory.length < 2) return '';
    const width = 600;
    const height = 120;
    const points = streamHistory.map((pt, i) => {
      const x = (i / (streamHistory.length - 1)) * width;
      const y = height - (pt.egress / maxIngress) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [streamHistory, maxIngress]);

  return (
    <div className="flex flex-col gap-6 text-[#e0e0e0]">
      
      {/* Vital Metrics Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Cluster Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {metrics.clusterHealth.toFixed(1)}%
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">NOMINAL</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">
            {activeEnclaveCount} / {totalEnclaveCount} Enclaves Active
          </span>
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Ingress Stream</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#00f2ff]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {metrics.ingressBandwidthGbps.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#00f2ff] font-mono">GB/s</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">Peak: 5.40 GB/s</span>
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Egress Stream</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {metrics.egressBandwidthGbps.toFixed(2)}
            </span>
            <span className="text-[10px] text-purple-400 font-mono">GB/s</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">Egress Ratio 0.24</span>
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Global Latency</span>
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {metrics.globalLatencyMs.toFixed(1)}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">Across 6 Geo-Zones</span>
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Entropy Jitter</span>
            <Radio className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              ±{metrics.quantumEntropyJitter.toFixed(3)}
            </span>
            <span className="text-[10px] text-blue-400 font-mono">%</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">NIST True-Random OK</span>
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#00f2ff]/70 tracking-wider">Verified State / s</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {metrics.verifiedTransactionsRate.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">ops</span>
          </div>
          <span className="text-[10px] text-[#888] mt-1">Zero Rollbacks</span>
        </div>
      </div>

      {/* Real-time Telemetry Bandwidth Stream Chart */}
      <div className="p-4 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00f2ff]/10 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00f2ff]" />
            <h3 className="text-sm font-bold tracking-wider text-white uppercase">
              Real-Time Bandwidth & Anomaly Ingress Stream
            </h3>
            <span className="text-xs text-[#00f2ff]/60">· Tabular Live Feed</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#00f2ff]" />
                <span className="text-[#00f2ff] tabular-nums">Ingress ({metrics.ingressBandwidthGbps.toFixed(2)} GB/s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-purple-400" />
                <span className="text-purple-400 tabular-nums">Egress ({metrics.egressBandwidthGbps.toFixed(2)} GB/s)</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => {
                  sound.playKeypressBlip();
                  setIsStreaming(!isStreaming);
                }}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                  isStreaming
                    ? 'border-[#00f2ff]/40 text-[#00f2ff] hover:bg-[#00f2ff]/10'
                    : 'border-amber-500/50 text-amber-400 bg-amber-950/20'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Live Stream</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Paused</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  sound.playTacticalPing();
                  onRefreshTelemetry();
                }}
                title="Force Telemetry Poll"
                className="p-1 rounded border border-[#00f2ff]/30 text-[#00f2ff]/70 hover:text-[#00f2ff] hover:bg-[#00f2ff]/10"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Visualizer */}
        <div className="relative w-full h-32 bg-[#06080c] rounded border border-[#00f2ff]/10 overflow-hidden px-2 pt-2">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none opacity-10">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="border-b border-r border-[#00f2ff]" />
            ))}
          </div>

          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 120">
            {/* Egress Line */}
            {egressPath && (
              <path
                d={egressPath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.75"
                strokeDasharray="4 2"
                className="transition-all duration-300"
              />
            )}
            {/* Ingress Line */}
            {ingressPath && (
              <path
                d={ingressPath}
                fill="none"
                stroke="#00f2ff"
                strokeWidth="2"
                className="transition-all duration-300 shadow-[0_0_8px_rgba(0,242,255,0.5)]"
              />
            )}
          </svg>

          {/* Scale labels */}
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#00f2ff]/40 flex gap-3">
            <span>Interval: 1000ms</span>
            <span>Scale: Line-Rate Gbps</span>
          </div>
        </div>
      </div>

      {/* Node Fleet Matrix / Layout Grid */}
      <div className="flex flex-col gap-4">
        {/* Controls and filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0e14] p-3 rounded-md border border-[#00f2ff]/20">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00f2ff]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-white">
              Autonomous Sovereign Nodes ({processedNodes.length} of {nodes.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00f2ff]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes or region..."
                className="bg-[#111622] border border-[#00f2ff]/30 rounded text-xs pl-8 pr-3 py-1 text-white placeholder-[#00f2ff]/30 focus:outline-none focus:border-[#00f2ff] w-48 sm:w-56"
              />
            </div>

            {/* Filter by Tier */}
            <div className="flex items-center gap-1 p-0.5 bg-[#111622] rounded border border-[#00f2ff]/20">
              {['ALL', 'CORE_PRIMARY', 'ENCLAVE_VAULT', 'EDGE_RELAY', 'ORBITAL_UPLINK'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => {
                    sound.playKeypressBlip();
                    setFilterTier(tier);
                  }}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                    filterTier === tier
                      ? 'bg-[#00f2ff] text-black font-semibold'
                      : 'text-[#00f2ff]/60 hover:text-[#00f2ff]'
                  }`}
                >
                  {tier === 'ALL' ? 'All Tiers' : tier.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs text-[#00f2ff]/70 ml-1">
              <SlidersHorizontal className="w-3 h-3" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort telemetry nodes"
                className="bg-[#111622] border border-[#00f2ff]/30 text-xs text-[#00f2ff] rounded px-2 py-1 focus:outline-none"
              >
                <option value="load">Highest Load</option>
                <option value="latency">Lowest Latency</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {processedNodes.map((node) => {
            const isQuarantined = node.status === 'QUARANTINED';
            const isAudited = node.status === 'AUDIT_ACTIVE';

            return (
              <div
                key={node.id}
                onClick={() => {
                  sound.playKeypressBlip();
                  onSelectNode(node);
                }}
                className={`p-3.5 rounded-md border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isQuarantined
                    ? 'bg-red-950/20 border-red-500/50 hover:border-red-400'
                    : isAudited
                    ? 'bg-amber-950/15 border-amber-500/40 hover:border-amber-400'
                    : 'bg-[#0b0e14] border-[#00f2ff]/20 hover:border-[#00f2ff]/70 hover:bg-[#0d121c]'
                }`}
              >
                {/* Top Node Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#00f2ff] transition-colors">
                        {node.name}
                      </h4>
                    </div>
                    <p className="text-[10px] text-[#888] mt-0.5">{node.region}</p>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                      isQuarantined
                        ? 'border-red-500/50 text-red-400 bg-red-950/40'
                        : isAudited
                        ? 'border-amber-500/50 text-amber-300 bg-amber-950/40'
                        : 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                {/* Resource Meters */}
                <div className="my-3 space-y-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-[#888] mb-1">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#00f2ff]/70" /> Compute Load
                      </span>
                      <span className="font-mono tabular-nums text-white">{node.cpuLoad}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#1a2130] rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          node.cpuLoad > 75 ? 'bg-red-500' : node.cpuLoad > 50 ? 'bg-amber-400' : 'bg-[#00f2ff]'
                        }`}
                        style={{ width: `${node.cpuLoad}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#888] mb-1">
                      <span>Memory Heap</span>
                      <span className="font-mono tabular-nums text-white">{node.memoryUsage}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#1a2130] rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all duration-300"
                        style={{ width: `${node.memoryUsage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-2 border-t border-[#00f2ff]/10 flex items-center justify-between text-[10px] text-[#888] font-mono">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-[#00f2ff]/60" />
                    <span className="tabular-nums text-cyan-300">{node.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-white/80 tabular-nums">↓{node.ingressRateMbps}</span>
                    <span className="text-[#666]">/</span>
                    <span className="text-white/80 tabular-nums">↑{node.egressRateMbps}</span>
                  </div>
                  <span className="text-[9px] text-[#00f2ff] opacity-0 group-hover:opacity-100 transition-opacity">
                    Inspect →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
