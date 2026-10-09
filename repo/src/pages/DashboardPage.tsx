import React from 'react';
import { SecurityEvent, Incident } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskGauge } from '../components/RiskGauge';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Users, 
  ArrowUpRight, 
  Clock, 
  Globe, 
  Key, 
  Laptop, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Terminal,
  RotateCcw,
  CheckCircle,
  Play,
  Radio,
  Sparkles
} from 'lucide-react';

interface DashboardPageProps {
  events: SecurityEvent[];
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onNavigateToAnalyze: () => void;
  onNavigateToDeepfake?: () => void;
  onNavigateToTopology?: () => void;
  onSimulateCampaign: () => void;
  onSimulateSafeNotice?: () => void;
  onResetSimulation?: () => void;
  isSimulating?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  events,
  incidents,
  onSelectIncident,
  onNavigateToAnalyze,
  onNavigateToDeepfake,
  onNavigateToTopology,
  onSimulateCampaign,
  onSimulateSafeNotice,
  onResetSimulation,
  isSimulating = false
}) => {
  const totalEvents = events.length;
  const threatEvents = events.filter(e => e.severity !== 'SAFE');
  const criticalThreats = events.filter(e => e.severity === 'CRITICAL');
  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');

  const phishingCount = events.filter(e => e.classification === 'credential_phishing' || e.classification === 'social_engineering').length;
  const impersonationCount = events.filter(e => e.classification === 'executive_impersonation' || e.classification === 'unauthorized_channel').length;
  const atoCount = events.filter(e => e.classification === 'account_takeover_risk' || e.classification === 'password_spraying' || e.classification === 'impossible_travel').length;
  const quishingCount = events.filter(e => e.classification === 'qr_phishing').length;
  const deepfakeCount = events.filter(e => e.source === 'deepfake_detector' || e.source === 'deepfake_audio' || e.source === 'deepfake_video' || e.classification === 'deepfake_audio' || e.classification === 'deepfake_video').length;

  const topIncident = incidents[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="text-white font-medium">Perimeter Defense Active</span>
            <span aria-hidden="true">·</span>
            <span>Parala Maharaja Engineering College</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">Subnet 192.168.1.0/24</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Security Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time detection and automated cross-channel incident correlation across email lures, lookalike domains, deceptive logins, and synthetic media.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onResetSimulation && (
            <button
              onClick={onResetSimulation}
              disabled={isSimulating}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-white/10 bg-[#121624]/80 hover:bg-white/10 text-slate-300 transition-all flex items-center gap-1.5 min-h-[40px] disabled:opacity-50 ios-pressable"
              title="Reset baseline to nominal safe state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          {onSimulateSafeNotice && (
            <button
              onClick={onSimulateSafeNotice}
              disabled={isSimulating}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-white/10 bg-[#121624]/80 hover:bg-white/10 text-slate-300 transition-all flex items-center gap-1.5 min-h-[40px] disabled:opacity-50 ios-pressable"
              title="Run legitimate official academic notice through detection pipeline"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Notice Test</span>
            </button>
          )}

          {onNavigateToDeepfake && (
            <button
              onClick={onNavigateToDeepfake}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-white/10 bg-[#121624]/80 hover:bg-white/10 text-white transition-all flex items-center gap-1.5 min-h-[40px] ios-pressable"
              title="Inspect synthetic voice clones and video deepfakes"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Deepfake Lab</span>
            </button>
          )}

          <button
            onClick={onNavigateToAnalyze}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-white/10 bg-[#121624]/80 hover:bg-white/10 text-slate-200 transition-all flex items-center gap-1.5 min-h-[40px] ios-pressable"
          >
            <span>Threat Analyzer</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={onSimulateCampaign}
            disabled={isSimulating}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-200 text-black transition-all flex items-center gap-1.5 disabled:opacity-50 min-h-[40px] shadow-md ios-pressable"
          >
            <ShieldAlert className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Simulating...' : 'Simulate Campaign'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics - iPhone Squircle Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="ios-widget p-4 sm:p-5 flex flex-col justify-between ios-pressable group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-tight">Monitored Events</span>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {totalEvents}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real-time ingestion</span>
            </div>
          </div>
        </div>

        <div className="ios-widget p-4 sm:p-5 flex flex-col justify-between ios-pressable group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-tight">Flagged Threats</span>
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {threatEvents.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Cross-channel alerts</span>
            </div>
          </div>
        </div>

        <div className="ios-widget p-4 sm:p-5 flex flex-col justify-between ios-pressable group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-tight">Critical Threats</span>
            <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tabular-nums tracking-tight">
              {criticalThreats.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Immediate isolation</span>
            </div>
          </div>
        </div>

        <div className="ios-widget p-4 sm:p-5 flex flex-col justify-between ios-pressable group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-tight">Active Dossiers</span>
            <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {activeIncidents.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Correlated campaigns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Attack Vector Breakdown & Active Incident Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column: Attack Vector Breakdown */}
        <div className="ios-widget p-5 sm:p-6 rounded-[24px] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Vector Distribution
              </h2>
              <span className="text-xs text-slate-400 font-mono">{threatEvents.length} threats total</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300">Credential Phishing & Lookalikes</span>
                  <span className="font-mono tabular-nums text-slate-400">{phishingCount}</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    style={{ width: `${Math.min(100, (phishingCount / (totalEvents || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300">Executive & Role Impersonation</span>
                  <span className="font-mono tabular-nums text-slate-400">{impersonationCount}</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                    style={{ width: `${Math.min(100, (impersonationCount / (totalEvents || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300">Password Spraying & ATO</span>
                  <span className="font-mono tabular-nums text-slate-400">{atoCount}</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(225,29,72,0.5)]"
                    style={{ width: `${Math.min(100, (atoCount / (totalEvents || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300">Deceptive QR Phishing (Quishing)</span>
                  <span className="font-mono tabular-nums text-slate-400">{quishingCount}</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-sky-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                    style={{ width: `${Math.min(100, (quishingCount / (totalEvents || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-rose-400" />
                    <span>Synthetic Deepfakes (Audio/Video)</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">{deepfakeCount}</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-purple-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    style={{ width: `${Math.min(100, (deepfakeCount / (totalEvents || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-white/[0.08] text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Verified Institutional Domain:</span>
              <span className="text-emerald-400 font-mono font-medium">pmec.ac.in</span>
            </div>
            <div className="flex justify-between">
              <span>Affiliated University:</span>
              <span className="text-slate-300 font-mono">bput.ac.in</span>
            </div>
          </div>
        </div>

        {/* Right Column: Primary Active Incident Spotlight */}
        <div className="lg:col-span-2 ios-widget p-5 sm:p-6 rounded-[24px] flex flex-col justify-between shadow-xl">
          {topIncident ? (
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-sky-400">{topIncident.id}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <SeverityBadge severity={topIncident.severity} size="sm" />
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 capitalize">{topIncident.status.toLowerCase()}</span>
                </div>
                <button
                  onClick={() => onSelectIncident(topIncident.id)}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors min-h-[36px] ios-pressable"
                >
                  <span>Investigate Topology & Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/10 mb-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {topIncident.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {topIncident.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                    <span>Target: <strong className="text-white font-mono">{topIncident.target_user}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Correlated signals: <strong className="text-slate-200 font-mono">{topIncident.event_ids.length}</strong></span>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <RiskGauge score={topIncident.risk_score} severity={topIncident.severity} size="md" />
                </div>
              </div>

              {/* Multi-Stage Attack Escalation */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Correlated attack stages ({topIncident.attack_stages.length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topIncident.attack_stages.map((stage, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/[0.08] text-xs text-slate-200"
                    >
                      <span className="font-mono text-slate-400 font-medium shrink-0">0{i + 1}.</span>
                      <span className="truncate">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incident Fast Forensics Actions */}
              <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  <span>Digital Trust Topology: <strong className="text-slate-200 font-mono">{topIncident.graph_nodes?.length || 0} nodes</strong> · <strong className="text-slate-200 font-mono">{topIncident.graph_edges?.length || 0} vectors</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onNavigateToTopology) {
                        onSelectIncident(topIncident.id);
                        onNavigateToTopology();
                      } else {
                        onSelectIncident(topIncident.id);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 flex items-center gap-1.5 transition-colors shadow-sm ios-pressable text-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Open Interactive Topology Graph →</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              No active incidents detected. Click "Simulate Campaign" above to run an authorized scenario.
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <span>Multi-modal attack correlation active</span>
            <button
              onClick={onSimulateCampaign}
              disabled={isSimulating}
              className="text-rose-400 hover:text-rose-300 font-medium transition-colors ios-pressable"
            >
              Launch Synthetic Attack Replay →
            </button>
          </div>
        </div>
      </div>

      {/* Incident Queue Table */}
      <div className="ios-widget p-5 sm:p-6 rounded-[24px] shadow-xl">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Incident Case Queue
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritized multi-vector security incidents awaiting review or containment
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No incidents currently queued.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/30 text-slate-400 border-b border-white/[0.08] rounded-xl">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium">Incident ID</th>
                    <th className="py-2.5 px-3.5 font-medium">Title & Target</th>
                    <th className="py-2.5 px-3.5 font-medium">Risk Score</th>
                    <th className="py-2.5 px-3.5 font-medium">Severity</th>
                    <th className="py-2.5 px-3.5 font-medium">Status</th>
                    <th className="py-2.5 px-3.5 font-medium">Timestamp</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {incidents.map((inc, idx) => (
                    <tr
                      key={`${inc.id}-${idx}`}
                      onClick={() => onSelectIncident(inc.id)}
                      className="hover:bg-white/[0.04] active:bg-white/[0.08] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono text-sky-400 font-semibold">
                        {inc.id}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-white">{inc.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Target: {inc.target_user} · {inc.event_ids.length} signals
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-white">
                        {inc.risk_score} <span className="text-slate-400 text-[10px]">/ 100</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <SeverityBadge severity={inc.severity} size="sm" />
                      </td>
                      <td className="py-3 px-3.5 text-slate-300 capitalize text-xs">
                        {inc.status.toLowerCase()}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-sky-400 hover:text-sky-300">
                        View Dossier →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {incidents.map((inc, idx) => (
                <div
                  key={`${inc.id}-${idx}`}
                  onClick={() => onSelectIncident(inc.id)}
                  className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2.5 active:bg-white/[0.08] transition-colors ios-pressable"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sky-400 font-semibold text-xs">{inc.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={inc.severity} size="sm" />
                      <span className="text-xs font-mono text-slate-300">
                        {inc.risk_score}/100
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    {inc.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {inc.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Target: {inc.target_user}
                    </span>
                    <span className="text-sky-400 font-semibold flex items-center gap-1">
                      <span>View Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
