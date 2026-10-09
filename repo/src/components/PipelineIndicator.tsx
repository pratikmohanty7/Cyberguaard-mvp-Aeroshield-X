import React from 'react';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface PipelineIndicatorProps {
  currentStage?: number;
  compact?: boolean;
}

export const PipelineIndicator: React.FC<PipelineIndicatorProps> = ({ currentStage = 6, compact = false }) => {
  const stages = [
    { num: '01', label: 'Detection', done: currentStage >= 1 },
    { num: '02', label: 'Classification', done: currentStage >= 2 },
    { num: '03', label: 'Risk Assessment', done: currentStage >= 3 },
    { num: '04', label: 'Explanation', done: currentStage >= 4 },
    { num: '05', label: 'Alert', done: currentStage >= 5 },
    { num: '06', label: 'Recommended Response', isFinal: true, active: currentStage >= 6 }
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
        <span className="text-emerald-400 font-medium">✓ Detection</span>
        <span className="text-slate-600">/</span>
        <span className="text-emerald-400 font-medium">✓ Classification</span>
        <span className="text-slate-600">/</span>
        <span className="text-emerald-400 font-medium">✓ Risk Assessment</span>
        <span className="text-slate-600">/</span>
        <span className="text-emerald-400 font-medium">✓ Explanation</span>
        <span className="text-slate-600">/</span>
        <span className="text-emerald-400 font-medium">✓ Alert</span>
        <span className="text-slate-600">/</span>
        <span className="text-cyan-400 font-bold">→ Recommended Response</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0F1D]/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 font-sans shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-xs font-bold text-slate-100 tracking-wide">
            Institutional Cyber Defence Pipeline Verification
          </span>
        </div>
        <span className="text-[11px] text-cyan-400 font-mono font-bold bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
          6/6 GATES PASSED
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {stages.map(st => (
          <div
            key={st.label}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
              st.isFinal
                ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300 shadow-sm'
                : st.done
                ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                : 'bg-slate-950/40 border-slate-900 text-slate-600'
            }`}
          >
            {st.isFinal ? (
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            ) : st.done ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <span className="text-[10px] text-slate-500 font-semibold">{st.num}</span>
            )}
            <span className="truncate font-medium">{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
