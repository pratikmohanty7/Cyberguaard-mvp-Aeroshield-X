import React from 'react';
import { SecurityEvent } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { Clock, ShieldAlert, Globe, QrCode, Key, Laptop, Layers } from 'lucide-react';

interface AttackTimelineProps {
  events: SecurityEvent[];
  stages?: string[];
}

export const AttackTimeline: React.FC<AttackTimelineProps> = ({ events, stages }) => {
  const getSourceIcon = (source: SecurityEvent['source']) => {
    switch (source) {
      case 'message_analyzer': return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'url_analyzer': return <Globe className="w-3.5 h-3.5 text-orange-400" />;
      case 'qr_decoder': return <QrCode className="w-3.5 h-3.5 text-sky-400" />;
      case 'identity_guard': return <Key className="w-3.5 h-3.5 text-purple-400" />;
      case 'auth_guard': return <Laptop className="w-3.5 h-3.5 text-rose-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-10 text-xs font-sans text-slate-400 bg-[#0D121F] rounded-xl border border-slate-800">
        No attack timeline events recorded for this correlation dossier.
      </div>
    );
  }

  // Sort chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="font-sans">
      <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-sky-500/60 before:via-slate-800 before:to-slate-800/20">
        {sorted.map((evt, idx) => {
          const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          return (
            <div key={`${evt.event_id}-${idx}`} className="relative group">
              {/* Timeline Node Point */}
              <div className="absolute -left-6 top-3 w-6 h-6 rounded-full bg-[#070913] border-2 border-slate-700 group-hover:border-sky-400 transition-colors shadow-md flex items-center justify-center">
                {getSourceIcon(evt.source)}
              </div>

              <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-4 hover:border-sky-500/40 transition-all shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                      {timeStr}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-bold text-slate-100 capitalize tracking-tight">
                      {evt.classification.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({evt.event_id})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400">
                      Risk: <strong className="text-white font-mono">{evt.risk_score}</strong>
                    </span>
                    <SeverityBadge severity={evt.severity} size="sm" />
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {evt.raw_input_summary}
                </p>

                {evt.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-800">
                    {evt.indicators.map((ind, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#06080F] text-slate-300 border border-slate-800 font-sans flex items-center gap-1"
                        title={ind.description}
                      >
                        <span className="text-rose-400 font-mono font-bold">+{ind.weight}</span>
                        <span>{ind.name.replace(/_/g, ' ')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
