import React, { useState } from 'react';
import { SecurityEvent } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { Search, ChevronDown, ChevronRight, Layers, Filter, Terminal, ShieldAlert } from 'lucide-react';

interface EventsPageProps {
  events: SecurityEvent[];
}

export const EventsPage: React.FC<EventsPageProps> = ({ events }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = events.filter(e => {
    if (filterSeverity !== 'ALL' && e.severity !== filterSeverity) return false;
    if (filterSource !== 'ALL' && e.source !== filterSource) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.event_id.toLowerCase().includes(q) ||
        e.classification.toLowerCase().includes(q) ||
        (e.entities.user_id && e.entities.user_id.toLowerCase().includes(q)) ||
        e.raw_input_summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="text-slate-300 font-medium">SOC Audit Log</span>
            <span aria-hidden="true">·</span>
            <span>Raw Ingestion Ledger</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-sky-400">{filtered.length} events</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Security Event Ingestion & Raw Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Immutable cross-layer telemetry logs from message heuristics, lexical URL analyzers, visual QR decoders, and authentication models.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar - iOS Frosted Glass Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ios-glass p-3 rounded-2xl shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white min-h-[36px] ios-pressable font-medium"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="SAFE">Safe</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-white min-h-[36px] ios-pressable font-medium"
          >
            <option value="ALL">All Detection Sources</option>
            <option value="message_analyzer">Message Analyzer</option>
            <option value="url_analyzer">URL Analyzer</option>
            <option value="qr_decoder">QR Decoder</option>
            <option value="identity_guard">Identity Guard</option>
            <option value="auth_guard">Auth Guard (Login)</option>
            <option value="fake_login_detector">Fake Login Detector</option>
            <option value="deepfake_audio">Deepfake Audio</option>
            <option value="deepfake_video">Deepfake Video</option>
            <option value="deepfake_detector">Deepfake Detector</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search event ID, payload..."
            className="ios-search-input w-full md:w-64 min-h-[36px]"
          />
        </div>
      </div>

      {/* Events: Dual-View (Table for Desktop, Cards for Mobile) */}
      <div className="ios-widget rounded-[26px] overflow-hidden shadow-2xl">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            No events match the selected filtering criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/30 text-slate-400 border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium">Event ID</th>
                    <th className="py-2.5 px-3.5 font-medium">Timestamp</th>
                    <th className="py-2.5 px-3.5 font-medium">Source</th>
                    <th className="py-2.5 px-3.5 font-medium">Classification</th>
                    <th className="py-2.5 px-3.5 font-medium">Target</th>
                    <th className="py-2.5 px-3.5 font-medium">Severity</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Risk</th>
                    <th className="py-2.5 px-3.5 font-medium text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map((evt, idx) => {
                    const isExpanded = expandedId === evt.event_id;
                    return (
                      <React.Fragment key={`${evt.event_id}-${idx}`}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : evt.event_id)}
                          className="hover:bg-white/[0.04] active:bg-white/[0.08] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3.5 font-bold text-sky-400 font-mono">
                            {evt.event_id}
                          </td>
                          <td className="py-3 px-3.5 text-slate-400 font-mono tabular-nums">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3 px-3.5 text-slate-300 capitalize font-mono text-[11px]">
                            {evt.source.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-200 capitalize">
                            {evt.classification.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-3.5 text-slate-300 font-mono">
                            {evt.entities.user_id || 'System'}
                          </td>
                          <td className="py-3 px-3.5">
                            <SeverityBadge severity={evt.severity} size="sm" />
                          </td>
                          <td className="py-3 px-3.5 font-bold text-right font-mono tabular-nums text-white">
                            {evt.risk_score}
                          </td>
                          <td className="py-3 px-3.5 text-center text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4 mx-auto text-sky-400" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#06080F] border-b border-slate-800">
                            <td colSpan={8} className="p-5 space-y-4">
                              <div>
                                <span className="text-slate-400 font-semibold text-xs font-mono">Raw Observed Payload:</span>
                                <div className="text-slate-200 mt-1.5 p-3.5 bg-[#0A0E18] border border-slate-800 rounded-lg text-xs leading-relaxed font-mono">
                                  {evt.raw_input_summary}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-400 font-semibold font-mono">Normalized Entities:</span>
                                  <pre className="p-3 bg-[#0A0E18] border border-slate-800 rounded-lg text-[11px] text-slate-300 mt-1 overflow-x-auto font-mono">
                                    {JSON.stringify(evt.entities, null, 2)}
                                  </pre>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-semibold font-mono">Contributing Indicators ({evt.indicators.length}):</span>
                                  <div className="mt-1 space-y-1.5 max-h-48 overflow-y-auto">
                                    {evt.indicators.map((ind, i) => (
                                      <div key={i} className="p-2.5 bg-[#0A0E18] border border-slate-800 rounded-lg flex justify-between gap-2">
                                        <span className="text-slate-300">{ind.name}: {ind.description}</span>
                                        <span className="text-rose-400 font-bold font-mono shrink-0">+{ind.weight}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {filtered.map((evt, idx) => {
                const isExpanded = expandedId === evt.event_id;
                return (
                  <div key={`${evt.event_id}-${idx}`} className="p-4 space-y-2.5 ios-pressable">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : evt.event_id)}
                      className="cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sky-400 text-xs">{evt.event_id}</span>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={evt.severity} size="sm" />
                          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                            {evt.risk_score}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-white capitalize">{evt.classification.replace(/_/g, ' ')}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Source: <strong className="text-slate-200 font-mono text-[11px]">{evt.source}</strong></span>
                        <span className="text-sky-400 inline-flex items-center gap-1 font-semibold text-[11px]">
                          {isExpanded ? 'Hide Raw' : 'Inspect Raw'} {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-white/[0.08] space-y-3 animate-in fade-in">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Raw Payload:</div>
                          <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 font-mono mt-1 leading-relaxed">
                            {evt.raw_input_summary}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Indicators ({evt.indicators.length}):</div>
                          <div className="space-y-1.5 mt-1">
                            {evt.indicators.map((ind, i) => (
                              <div key={i} className="p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs flex justify-between gap-2">
                                <span className="text-slate-300 text-[11px]">{ind.name}</span>
                                <span className="text-rose-400 font-bold font-mono">+{ind.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
