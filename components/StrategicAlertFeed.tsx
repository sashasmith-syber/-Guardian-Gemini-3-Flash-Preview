import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Search, 
  ArrowRight,
  Flame,
  PlusCircle,
} from 'lucide-react';
import { StrategicAlert, AlertSeverity } from '../types';
import { sound } from '../utils/soundEffects';

interface StrategicAlertFeedProps {
  alerts: StrategicAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onDeployMitigation: (id: string) => void;
  onConsultGuardian: (alert: StrategicAlert) => void;
  onInjectTestAlert: () => void;
}

export const StrategicAlertFeed: React.FC<StrategicAlertFeedProps> = ({
  alerts,
  onAcknowledgeAlert,
  onDeployMitigation,
  onConsultGuardian,
  onInjectTestAlert,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMitigatingId, setActiveMitigatingId] = useState<string | null>(null);
  const mitigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mitigateTimerRef.current) clearTimeout(mitigateTimerRef.current);
    };
  }, []);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
      const matchStatus = statusFilter === 'ALL' || alert.status === statusFilter;
      const matchSearch =
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.targetSubsystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSeverity && matchStatus && matchSearch;
    });
  }, [alerts, severityFilter, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      critical: alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length,
      high: alerts.filter((a) => a.severity === 'HIGH' && a.status === 'ACTIVE').length,
      moderate: alerts.filter((a) => a.severity === 'MODERATE' && a.status === 'ACTIVE').length,
      totalActive: alerts.filter((a) => a.status === 'ACTIVE').length,
    };
  }, [alerts]);

  const handleMitigate = (alertId: string) => {
    sound.playMitigationTrigger();
    setActiveMitigatingId(alertId);
    if (mitigateTimerRef.current) clearTimeout(mitigateTimerRef.current);
    mitigateTimerRef.current = setTimeout(() => {
      onDeployMitigation(alertId);
      setActiveMitigatingId(null);
      mitigateTimerRef.current = null;
    }, 900);
  };

  const getSeverityBadgeClass = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/40 border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
      case 'HIGH':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/60';
      case 'MODERATE':
        return 'text-yellow-300 bg-yellow-950/30 border-yellow-500/40';
      case 'INFO':
        return 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/30';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-[#e0e0e0]">
      
      {/* Alert Matrix Header Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-[#888]">Active Threat Directives</span>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
              {counts.totalActive}
            </div>
          </div>
          <ShieldAlert className="w-6 h-6 text-[#00f2ff]" />
        </div>

        <div className="p-3.5 bg-[#140b0e] border border-red-500/30 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-red-400/80">Critical Breaches</span>
            <div className="text-xl font-bold font-mono tabular-nums text-red-400 mt-1">
              {counts.critical}
            </div>
          </div>
          <Flame className="w-6 h-6 text-red-500" />
        </div>

        <div className="p-3.5 bg-[#14100b] border border-amber-500/30 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-amber-400/80">High Priority Vectors</span>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
              {counts.high}
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        <div className="p-3.5 bg-[#0b0e14] border border-[#00f2ff]/20 rounded-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-[#00f2ff]/70">Mitigated Incidents</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
              {alerts.filter((a) => a.status === 'MITIGATED').length}
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Control Bar: Filters, Search, Simulation Injection */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0e14] p-3 rounded-md border border-[#00f2ff]/20">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00f2ff]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat alerts..."
              className="bg-[#111622] border border-[#00f2ff]/30 rounded text-xs pl-8 pr-3 py-1 text-white placeholder-[#00f2ff]/30 focus:outline-none focus:border-[#00f2ff] w-48 sm:w-64"
            />
          </div>

          {/* Severity Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[#111622] rounded border border-[#00f2ff]/20">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  sound.playKeypressBlip();
                  setSeverityFilter(sev);
                }}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-[#00f2ff] text-black font-semibold'
                    : 'text-[#00f2ff]/60 hover:text-[#00f2ff]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[#111622] rounded border border-[#00f2ff]/20">
            {['ALL', 'ACTIVE', 'TRIAGED', 'MITIGATED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  sound.playKeypressBlip();
                  setStatusFilter(st);
                }}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#00f2ff] text-black font-semibold'
                    : 'text-[#00f2ff]/60 hover:text-[#00f2ff]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Injector */}
        <button
          onClick={() => {
            sound.playCriticalAlert();
            onInjectTestAlert();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border border-purple-500/40 text-purple-300 bg-purple-950/20 hover:bg-purple-900/40 hover:border-purple-400 transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Inject Threat Simulation</span>
        </button>
      </div>

      {/* Alert Feed List */}
      <div className="flex flex-col gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-[#0b0e14] border border-[#00f2ff]/10 rounded-md text-[#888]">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-400/50 mb-2" />
            <p className="text-sm font-semibold text-white">Perimeter Clear</p>
            <p className="text-xs text-[#888] mt-1">No alerts match the active filter criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isMitigating = activeMitigatingId === alert.id;
            const isMitigated = alert.status === 'MITIGATED';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-md border transition-all flex flex-col gap-3 ${
                  isMitigated
                    ? 'bg-[#080b10] border-[#00f2ff]/10 opacity-75'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-[#12080a] border-red-500/40 hover:border-red-400'
                    : alert.severity === 'HIGH'
                    ? 'bg-[#120e08] border-amber-500/40 hover:border-amber-400'
                    : 'bg-[#0b0e14] border-[#00f2ff]/20 hover:border-[#00f2ff]/50'
                }`}
              >
                {/* Alert Item Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${getSeverityBadgeClass(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono text-[#00f2ff]">{alert.id}</span>
                    <span className="text-xs text-[#666]">·</span>
                    <span className="text-xs text-[#888] font-mono">{alert.timestamp} ({alert.timeAgo})</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[10px] text-[#888]">Impact Index:</span>
                    <span
                      className={`font-bold tabular-nums ${
                        alert.impactScore > 80
                          ? 'text-red-400'
                          : alert.impactScore > 50
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {alert.impactScore} / 100
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase border ${
                        isMitigated
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                          : 'border-[#00f2ff]/30 text-[#00f2ff] bg-[#00f2ff]/10'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-sm font-bold text-white tracking-wide">{alert.title}</h4>
                  <p className="text-xs text-[#b8b8b8] mt-1 leading-relaxed">{alert.description}</p>
                </div>

                {/* Origin & Recommended Protocol */}
                <div className="p-2.5 bg-[#07090e] rounded border border-[#00f2ff]/10 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-[#888] space-x-2">
                    <span>Origin: <span className="text-white font-mono">{alert.origin}</span></span>
                    <span>·</span>
                    <span>Target: <span className="text-white font-mono">{alert.targetSubsystem}</span></span>
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono">
                    Protocol: {alert.mitigationProtocol || 'STANDARD_TRIAGE'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[#00f2ff]/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#00f2ff]/70 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rec: {alert.recommendedAction}</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {!isMitigated && (
                      <button
                        onClick={() => handleMitigate(alert.id)}
                        disabled={isMitigating}
                        className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                          isMitigating
                            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 animate-pulse'
                            : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500 text-emerald-300'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isMitigating ? 'Engaging Countermeasure...' : 'Deploy Mitigation'}</span>
                      </button>
                    )}

                    {alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          sound.playTacticalPing();
                          onAcknowledgeAlert(alert.id);
                        }}
                        className="px-3 py-1.5 rounded text-xs border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/10 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    <button
                      onClick={() => {
                        sound.playTacticalPing();
                        onConsultGuardian(alert);
                      }}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-[#00f2ff] text-black hover:bg-[#33f5ff] shadow-[0_0_10px_rgba(0,242,255,0.3)] flex items-center gap-1 transition-all"
                    >
                      <span>Consult Guardian AI</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
