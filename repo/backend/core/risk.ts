/**
 * CYBERGUARD - Calibrated Risk Engine
 * Deterministic scoring across policy bands:
 * 0–20 SAFE | 21–40 LOW | 41–60 MEDIUM | 61–80 HIGH | 81–100 CRITICAL
 */

import { Indicator, SeverityLevel } from '../types';

export interface RiskEvaluationContext {
  is_executive_target?: boolean;
  is_protected_identity?: boolean;
  has_credential_intent?: boolean;
  has_otp_intent?: boolean;
  has_impossible_travel?: boolean;
  has_password_spraying?: boolean;
  has_lookalike_domain?: boolean;
  correlated_events_count?: number;
}

export interface RiskEngineResult {
  score: number; // 0 - 100
  severity: SeverityLevel;
  confidence: number;
  policy_band: string;
  breakdown: {
    base_indicator_score: number;
    contextual_escalation: number;
    cross_channel_escalation: number;
  };
  explanation: string;
}

export function computeCalibratedRisk(
  indicators: Indicator[],
  context: RiskEvaluationContext = {}
): RiskEngineResult {
  if (indicators.length === 0) {
    return {
      score: 5,
      severity: 'SAFE',
      confidence: 0.98,
      policy_band: '0-20 SAFE (Institutional Perimeter Nominal)',
      breakdown: {
        base_indicator_score: 5,
        contextual_escalation: 0,
        cross_channel_escalation: 0
      },
      explanation: 'No anomalous signals or malicious heuristics detected.'
    };
  }

  // Calculate base weighted score
  const sumWeights = indicators.reduce((acc, curr) => acc + (curr.weight || 0), 0);
  let baseScore = Math.min(85, Math.round(sumWeights * 0.9));

  let contextualEscalation = 0;
  if (context.is_executive_target) contextualEscalation += 15;
  else if (context.is_protected_identity) contextualEscalation += 10;

  if (context.has_otp_intent) contextualEscalation += 12;
  if (context.has_lookalike_domain) contextualEscalation += 10;
  if (context.has_impossible_travel) contextualEscalation += 14;

  let crossChannelEscalation = 0;
  if ((context.correlated_events_count || 0) > 1) {
    // Attack Campaign Escalation
    crossChannelEscalation = Math.min(25, (context.correlated_events_count! - 1) * 7);
  }

  const finalScore = Math.max(0, Math.min(100, baseScore + contextualEscalation + crossChannelEscalation));

  let severity: SeverityLevel = 'SAFE';
  let policyBand = '0–20 SAFE';

  if (finalScore >= 81) {
    severity = 'CRITICAL';
    policyBand = '81–100 CRITICAL (Immediate Automated Containment & Isolation)';
  } else if (finalScore >= 61) {
    severity = 'HIGH';
    policyBand = '61–80 HIGH (Priority Investigation & Access Restriction)';
  } else if (finalScore >= 41) {
    severity = 'MEDIUM';
    policyBand = '41–60 MEDIUM (User Warning & Verification Challenge)';
  } else if (finalScore >= 21) {
    severity = 'LOW';
    policyBand = '21–40 LOW (Passive Telemetry Logging)';
  } else {
    severity = 'SAFE';
    policyBand = '0–20 SAFE (Nominal Operations)';
  }

  const confidence = Math.min(0.99, Math.max(0.70, 0.65 + (indicators.length * 0.06)));

  const explanation = `${severity} risk (${finalScore}/100) triggered by ${indicators.length} active indicator(s)` +
    (contextualEscalation > 0 ? ` with +${contextualEscalation} contextual sensitivity escalation` : '') +
    (crossChannelEscalation > 0 ? ` and +${crossChannelEscalation} cross-channel attack correlation escalation.` : '.');

  return {
    score: finalScore,
    severity,
    confidence,
    policy_band: policyBand,
    breakdown: {
      base_indicator_score: baseScore,
      contextual_escalation: contextualEscalation,
      cross_channel_escalation: crossChannelEscalation
    },
    explanation
  };
}
