/**
 * CYBERGUARD - Evidence Engine
 * Normalizes indicators into verifiable, traceable evidence records with deterministic weights.
 */

import { Indicator, EventSource } from '../types';

export interface EvidenceRecord {
  evidence_id: string;
  indicator_id: string;
  title: string;
  source: EventSource;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  description: string;
  supporting_data: Record<string, any>;
  mitre_techniques: string[];
  collected_at: string;
}

export function createEvidenceRecord(indicator: Indicator, sequenceNumber: number): EvidenceRecord {
  return {
    evidence_id: `EVD-${String(sequenceNumber).padStart(4, '0')}`,
    indicator_id: indicator.id,
    title: indicator.name.replace(/_/g, ' '),
    source: indicator.source,
    severity: indicator.severity,
    weight: indicator.weight,
    description: indicator.description,
    supporting_data: indicator.evidence_data || {},
    mitre_techniques: indicator.mitre || [],
    collected_at: new Date().toISOString()
  };
}

export function compileEvidenceCollection(indicators: Indicator[]): EvidenceRecord[] {
  return indicators.map((ind, idx) => createEvidenceRecord(ind, idx + 1));
}
