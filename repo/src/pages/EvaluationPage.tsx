import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EvaluationMetrics } from '../types';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvaluation = async () => {
    setLoading(true);
    try {
      const data = await api.getEvaluation();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching evaluation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="text-slate-300 font-medium">Empirical Evaluation</span>
            <span aria-hidden="true">·</span>
            <span>Ground-Truth Test Corpus</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-400 font-mono">Deterministic Sub-2ms</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Benchmark & Heuristic Performance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Comparative analysis of Rules-Only, ML-Only, and Hybrid detection paradigms on multi-vector institutional attack sets.
          </p>
        </div>

        <button
          onClick={fetchEvaluation}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-black hover:bg-slate-200 flex items-center gap-2 transition-all disabled:opacity-50 min-h-[38px] shadow-md ios-pressable shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
          <span>Execute Benchmark Suite</span>
        </button>
      </div>

      {metrics && (
        <>
          {/* Top Metric Cards - iOS Squircle Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">Test Corpus</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {metrics.total_samples}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Multi-modal test samples</div>
            </div>

            <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">Precision</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {(metrics.precision * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">TP / (TP + FP)</div>
            </div>

            <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">Recall</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono tabular-nums">
                {(metrics.recall * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">TP / (TP + FN)</div>
            </div>

            <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">F1 Score</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono tabular-nums">
                {(metrics.f1_score * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Harmonic mean balance</div>
            </div>

            <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">Average Latency</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
                {metrics.avg_latency_ms} <span className="text-xs font-normal text-slate-400 font-sans">ms</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Deterministic execution</div>
            </div>
          </div>

          {/* Architecture Comparison Matrix */}
          <div className="ios-widget p-5 sm:p-7 rounded-[26px] space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Detection Paradigm Comparison: Rules vs ML vs Hybrid
              </h2>
              <span className="text-xs text-slate-400 font-mono">Benchmarked on institutional test sets</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/30 text-slate-400 border-b border-white/[0.08] rounded-xl">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Detection Architecture</th>
                    <th className="py-2.5 px-4 font-medium">Precision</th>
                    <th className="py-2.5 px-4 font-medium">Recall</th>
                    <th className="py-2.5 px-4 font-medium">F1 Score</th>
                    <th className="py-2.5 px-4 font-medium">Latency</th>
                    <th className="py-2.5 px-4 font-medium">Trade-off Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr className="hover:bg-white/[0.04]">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      1. Deterministic Security Rules Only
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {(metrics.modes.rule_only.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                      {(metrics.modes.rule_only.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-400 font-semibold">
                      {(metrics.modes.rule_only.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 tabular-nums">
                      {metrics.modes.rule_only.latency_ms} ms
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                      Zero-latency, transparent, but vulnerable to minor lexical shifts or paraphrasing.
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.04]">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      2. Statistical ML Models Only
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {(metrics.modes.ml_only.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                      {(metrics.modes.ml_only.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-400 font-semibold">
                      {(metrics.modes.ml_only.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 tabular-nums">
                      {metrics.modes.ml_only.latency_ms} ms
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                      Resilient to token alterations, but susceptible to false positives on formal academic circulars.
                    </td>
                  </tr>

                  <tr className="bg-white/[0.05] border-t border-sky-500/20">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>3. CYBERGUARD Hybrid (Rules + ML + Identity Trust)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {(metrics.modes.hybrid.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400 text-sm">
                      {(metrics.modes.hybrid.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-400 text-sm">
                      {(metrics.modes.hybrid.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 tabular-nums">
                      {metrics.modes.hybrid.latency_ms} ms
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 text-[11px] font-sans">
                      Optimal configuration: Verified institutional trust boundaries ground statistical models with zero hallucinations.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic & Engineering Limitations */}
          <div className="ios-widget p-5 sm:p-7 rounded-[26px] space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white tracking-tight uppercase">
                Platform Constraints & Scientific Threat Modeling Limitations
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              CYBERGUARD explicitly documents known boundary conditions in adherence to cybersecurity evaluation standards:
            </p>

            <div className="space-y-2 pt-1">
              {metrics.limitations.map((lim, i) => (
                <div key={i} className="p-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-slate-300 font-sans">
                  <span className="text-amber-400 font-mono font-bold mr-1.5">0{i + 1}.</span> {lim}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
