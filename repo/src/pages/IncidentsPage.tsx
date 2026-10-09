import React, { useState } from 'react';
import { Incident } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { ShieldAlert, ChevronRight, Filter, Search, ArrowUpRight } from 'lucide-react';

interface IncidentsPageProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onSimulateCampaign: () => void;
  isSimulating?: boolean;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  incidents,
  onSelectIncident,
  onSimulateCampaign,
  isSimulating = false
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = incidents.filter(inc => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.target_user.toLowerCase().includes(q) ||
        inc.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="text-slate-300 font-medium">Incident Dossiers</span>
            <span aria-hidden="true">·</span>
            <span>Prioritized Containment Queue</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-sky-400">{filtered.length} active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Security Incident Queue & Case Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-vector security campaigns correlated across student lures, institutional identity impersonation, and authentication anomalies.
          </p>
        </div>

        <button
          onClick={onSimulateCampaign}
          disabled={isSimulating}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-[#08090D] hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[40px] shrink-0 shadow-sm active:scale-95"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isSimulating ? 'Simulating...' : 'Simulate Campaign'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ios-glass p-3 rounded-2xl shadow-md">
        {/* Status Segment Filters */}
        <div className="ios-segmented-track p-1 overflow-x-auto no-scrollbar">
          {['ALL', 'NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] transition-all ios-pressable ${
                statusFilter === st
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Incidents' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search incident ID, target..."
            className="ios-search-input w-full sm:w-64 min-h-[36px]"
          />
        </div>
      </div>

      {/* Incident Dossier Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 ios-glass rounded-3xl text-slate-400 text-xs">
          No incident dossiers match the active filtering criteria.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((inc, idx) => (
            <div
              key={`${inc.id}-${idx}`}
              onClick={() => onSelectIncident(inc.id)}
              className="ios-widget p-5 sm:p-6 rounded-[24px] cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg group ios-pressable"
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-sky-400 font-bold">{inc.id}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <SeverityBadge severity={inc.severity} size="sm" />
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-semibold capitalize">
                    {inc.status.toLowerCase()}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">
                    Target: <strong className="text-slate-200 font-mono">{inc.target_user}</strong>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  {inc.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {inc.summary}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                  <span>Signals: <strong className="text-slate-200 font-mono">{inc.event_ids.length}</strong></span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>Attack stages: <strong className="text-slate-200 font-mono">{inc.attack_stages.length}</strong></span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>MITRE: <strong className="text-sky-400 font-mono">{inc.mitre.slice(0, 3).join(', ')}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                <div className="text-right font-mono">
                  <div className="text-base font-extrabold text-white tabular-nums">
                    {inc.risk_score} <span className="text-[10px] text-slate-400">/ 100</span>
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
                    Risk Index
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/10 text-slate-300 group-hover:text-white group-hover:bg-white/20 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
