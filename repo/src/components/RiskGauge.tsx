import React from 'react';
import { SeverityLevel } from '../types';

interface RiskGaugeProps {
  score: number;
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  severity,
  size = 'md',
  showDetails = true
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG parameters
  const radius = size === 'lg' ? 48 : size === 'sm' ? 24 : 36;
  const stroke = size === 'lg' ? 6 : size === 'sm' ? 3.5 : 4.5;
  const circumference = 2 * Math.PI * radius;
  const progress = (clampedScore / 100) * circumference;

  const colorMap: Record<SeverityLevel, { stroke: string; glow: string }> = {
    CRITICAL: { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.25)' },
    HIGH: { stroke: '#F97316', glow: 'rgba(249, 115, 22, 0.25)' },
    MEDIUM: { stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.25)' },
    LOW: { stroke: '#0EA5E9', glow: 'rgba(14, 165, 233, 0.25)' },
    SAFE: { stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.25)' }
  };

  const activeColors = colorMap[severity] || { stroke: '#94A3B8', glow: 'transparent' };

  const policyLabels: Record<SeverityLevel, string> = {
    SAFE: '0–20 SAFE · Perimeter Nominal',
    LOW: '21–40 LOW · Observability Telemetry',
    MEDIUM: '41–60 MEDIUM · Verification Challenge',
    HIGH: '61–80 HIGH · Priority Isolation',
    CRITICAL: '81–100 CRITICAL · Active Compromise'
  };

  return (
    <div className="flex flex-col items-center justify-center select-none font-mono">
      <div className="relative inline-flex items-center justify-center">
        <svg
          className="transform -rotate-90 drop-shadow-sm"
          width={(radius + stroke + 4) * 2}
          height={(radius + stroke + 4) * 2}
        >
          {/* Subtle Ambient Glow */}
          <circle
            cx={radius + stroke + 4}
            cy={radius + stroke + 4}
            r={radius}
            fill="none"
            stroke={activeColors.glow}
            strokeWidth={stroke * 2.5}
            opacity="0.6"
          />

          {/* Background Track */}
          <circle
            cx={radius + stroke + 4}
            cy={radius + stroke + 4}
            r={radius}
            fill="none"
            stroke="#172033"
            strokeWidth={stroke}
          />

          {/* Active Calibrated Arc */}
          <circle
            cx={radius + stroke + 4}
            cy={radius + stroke + 4}
            r={radius}
            fill="none"
            stroke={activeColors.stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`font-mono font-bold tracking-tight text-white tabular-nums ${
              size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl'
            }`}
          >
            {clampedScore}
          </span>
          <span
            className={`font-mono text-slate-400 tracking-wider uppercase ${
              size === 'lg' ? 'text-[10px]' : size === 'sm' ? 'text-[8px]' : 'text-[9px]'
            }`}
          >
            / 100
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <div className="text-[11px] font-medium text-slate-300 tracking-tight">
            {policyLabels[severity]}
          </div>
        </div>
      )}
    </div>
  );
};
