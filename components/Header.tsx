import React from 'react';
import { Shield, Volume2, VolumeX, AlertTriangle, Download } from 'lucide-react';
import { sound } from '../utils/soundEffects';

type ConsoleView = 'dashboard' | 'telemetry' | 'status' | 'alerts' | 'guardian';

interface HeaderProps {
  activeView: ConsoleView;
  setActiveView: (view: ConsoleView) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  threatLevel: string;
  onEmergencyLockdown: () => void;
  isLockdownActive: boolean;
  onExportLogs: () => void;
}

const NAV_ITEMS: { id: ConsoleView; label: string }[] = [
  { id: 'dashboard', label: 'Command Matrix' },
  { id: 'telemetry', label: 'Telemetry Grid' },
  { id: 'status', label: 'System Status' },
  { id: 'alerts', label: 'Strategic Alerts' },
  { id: 'guardian', label: 'Guardian Core' },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  isMuted,
  setIsMuted,
  threatLevel,
  onEmergencyLockdown,
  isLockdownActive,
  onExportLogs,
}) => {
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playTacticalPing();
  };

  const selectView = (view: ConsoleView) => {
    sound.playKeypressBlip();
    setActiveView(view);
  };

  const isElevatedThreat = threatLevel === 'DEFCON 1' || threatLevel === 'DEFCON 2' || threatLevel === 'DEFCON 3';

  return (
    <header className="border-b border-[#00f2ff]/20 bg-[#07090e]/95 backdrop-blur-md sticky top-0 z-40 select-none">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark + threat posture */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0 min-w-0">
          <div className="w-8 h-8 rounded border border-[#00f2ff]/40 bg-[#00f2ff]/10 flex items-center justify-center text-[#00f2ff] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-wider text-[#00f2ff] leading-none truncate">
              GUARDIAN STRATEGIST <span className="text-xs text-white/70 font-normal">V3.0</span>
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#00f2ff]/50 tracking-widest uppercase hidden sm:inline">
                Sovereign Enterprise Command
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border tracking-wider ${
                  isElevatedThreat
                    ? 'text-red-300 border-red-500/50 bg-red-950/40'
                    : 'text-[#00f2ff] border-[#00f2ff]/30 bg-[#00f2ff]/10'
                }`}
                title="Active threat posture"
              >
                {threatLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-[#111622] border border-[#00f2ff]/20 rounded-md">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => selectView(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
                activeView === item.id
                  ? 'bg-[#00f2ff] text-black font-semibold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                  : 'text-[#00f2ff]/70 hover:text-[#00f2ff] hover:bg-[#00f2ff]/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary action & controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute tactical audio' : 'Mute tactical audio'}
            title={isMuted ? 'Unmute tactical audio' : 'Mute tactical audio'}
            className="p-1.5 rounded border border-[#00f2ff]/20 text-[#00f2ff]/70 hover:text-[#00f2ff] hover:bg-[#00f2ff]/10 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              sound.playKeypressBlip();
              onExportLogs();
            }}
            title="Export CSV telemetry report"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#00f2ff]/30 text-[#00f2ff] text-xs hover:bg-[#00f2ff]/10 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Logs</span>
          </button>

          <button
            onClick={() => {
              sound.playCriticalAlert();
              onEmergencyLockdown();
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border ${
              isLockdownActive
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : 'bg-[#181119] text-red-400 border-red-500/40 hover:bg-red-950/40 hover:border-red-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLockdownActive ? 'Lockdown Engaged' : 'Emergency Shield'}
            </span>
            <span className="sm:hidden">{isLockdownActive ? 'Lockdown' : 'Shield'}</span>
          </button>
        </div>
      </div>

      {/* Mobile view switcher — reachable under md */}
      <div className="md:hidden px-4 pb-3">
        <label className="sr-only" htmlFor="guardian-mobile-view">
          Console view
        </label>
        <select
          id="guardian-mobile-view"
          value={activeView}
          onChange={(e) => selectView(e.target.value as ConsoleView)}
          aria-label="Switch console view"
          className="w-full bg-[#111622] border border-[#00f2ff]/30 rounded text-xs text-[#00f2ff] px-3 py-2 focus:border-[#00f2ff] font-mono"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};
