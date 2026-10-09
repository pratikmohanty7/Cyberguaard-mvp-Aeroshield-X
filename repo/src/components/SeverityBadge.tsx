import React from 'react';
import { SeverityLevel } from '../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
  size = 'md'
}) => {
  const config = {
    CRITICAL: {
      text: 'text-red-400',
      dot: 'bg-red-500',
      label: 'Critical'
    },
    HIGH: {
      text: 'text-orange-400',
      dot: 'bg-orange-500',
      label: 'High'
    },
    MEDIUM: {
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      label: 'Medium'
    },
    LOW: {
      text: 'text-sky-400',
      dot: 'bg-sky-400',
      label: 'Low'
    },
    SAFE: {
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      label: 'Safe'
    }
  }[severity] || {
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    label: severity
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-medium whitespace-nowrap ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      } ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
