import React, { useState } from 'react';
import { Indicator } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { ChevronDown, ChevronRight, Database, Terminal, Shield } from 'lucide-react';

interface EvidenceTableProps {
  indicators: Indicator[];
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({ indicators }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!indicators || indicators.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-sans text-slate-400 bg-[#0D121F] rounded-xl border border-slate-800">
        No active anomalous indicators recorded for this dossier.
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {indicators.map((ind, idx) => {
          const uniqueKey = `${ind.id}-${idx}`;
          const isExpanded = expandedId === uniqueKey;
          return (
            <div
              key={uniqueKey}
              className="bg-[#0D121F] border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm transition-all"
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : uniqueKey)}
                className="flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-sky-400">{ind.id}</span>
                    <SeverityBadge severity={ind.severity.toUpperCase() as any} size="sm" />
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-snug">
                    {ind.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="capitalize">{ind.source.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span className="text-rose-400 font-mono font-bold">+{ind.weight} Risk Weight</span>
                  </div>
                </div>
                <div className="p-1 rounded-lg bg-[#06080F] border border-slate-800 text-slate-400 shrink-0">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-sky-400" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs animate-in fade-in-50">
                  {ind.mitre && ind.mitre.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-semibold">MITRE ATT&CK:</span>
                      <div className="flex flex-wrap gap-1">
                        {ind.mitre.map(m => (
                          <span key={m} className="text-sky-300 font-mono font-bold text-[10px] bg-sky-950/80 border border-sky-500/40 px-2 py-0.5 rounded-md">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ind.evidence_data && Object.keys(ind.evidence_data).length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span>Technical Telemetry Payload:</span>
                      </div>
                      <pre className="p-3 bg-[#06080F] border border-slate-800 rounded-lg text-[11px] text-slate-300 overflow-x-auto font-mono leading-relaxed max-h-56">
                        {JSON.stringify(ind.evidence_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden bg-[#0D121F] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#06080F] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Indicator ID & Heuristic</th>
                <th className="py-3 px-4 font-semibold">Detection Layer</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold text-right">Contribution</th>
                <th className="py-3 px-4 font-semibold text-center">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {indicators.map((ind, idx) => {
                const uniqueKey = `${ind.id}-${idx}`;
                const isExpanded = expandedId === uniqueKey;
                return (
                  <React.Fragment key={uniqueKey}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : uniqueKey)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span className="text-sky-400 font-mono">{ind.id}</span>
                        </div>
                        <div className="text-xs text-slate-300 font-sans mt-0.5 line-clamp-1">
                          {ind.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize text-xs">
                        {ind.source.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={ind.severity.toUpperCase() as any} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-rose-400">
                        +{ind.weight}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 mx-auto text-sky-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mx-auto hover:text-slate-200" />
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[#06080F] border-b border-slate-800">
                        <td colSpan={5} className="py-4 px-5">
                          <div className="space-y-3">
                            <div>
                              <span className="text-slate-400 text-xs font-semibold">Evidence Specification: </span>
                              <span className="text-slate-200 text-xs font-sans">{ind.description}</span>
                            </div>

                            {ind.mitre && ind.mitre.length > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-400 font-semibold">MITRE ATT&CK Matrix:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {ind.mitre.map(m => (
                                    <span key={m} className="text-sky-300 font-mono font-bold bg-sky-950/80 border border-sky-500/40 px-2.5 py-0.5 rounded-md text-[11px]">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ind.evidence_data && Object.keys(ind.evidence_data).length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                                  <Database className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Normalized Technical Telemetry Payload:</span>
                                </div>
                                <pre className="p-3.5 bg-[#0A0E18] border border-slate-800 rounded-xl text-[11px] text-slate-300 overflow-x-auto font-mono leading-relaxed shadow-inner">
                                  {JSON.stringify(ind.evidence_data, null, 2)}
                                </pre>
                              </div>
                            )}
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
      </div>
    </div>
  );
};
