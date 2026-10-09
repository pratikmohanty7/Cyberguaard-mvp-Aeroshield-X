/**
 * CYBERGUARD - Identity Guard: Institutional Impersonation & Channel Verifier
 * Calculates deterministic Digital Trust Score against the Institutional Trust Registry.
 */

import { Indicator, ClassificationType, SeverityLevel, TrustIdentity } from '../types';
import { db } from '../db';
import { analyzeMessage } from './message_detector';

interface IdentityAnalysisInput {
  claimed_identity?: string;
  claimed_role?: string;
  sender_address: string;
  communication_channel: string; // e.g. "email", "sms", "whatsapp", "telegram", "official_portal"
  message_content: string;
  user_id?: string;
}

interface IdentityAnalysisResult {
  claimed_identity: string;
  sender_address: string;
  sender_domain: string;
  channel: string;
  trust_score: number; // 0 - 100 (100 = completely trustworthy, 0 = completely untrustworthy)
  risk_score: number;  // 0 - 100 (100 = critical threat)
  classification: ClassificationType;
  confidence: number;
  severity: SeverityLevel;
  matched_identity?: TrustIdentity;
  indicators: Indicator[];
  summary: string;
}

export function extractDomainFromEmail(email: string): string {
  const match = email.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1].toLowerCase() : '';
}

export function analyzeIdentity(input: IdentityAnalysisInput): IdentityAnalysisResult {
  const senderDomain = extractDomainFromEmail(input.sender_address) || input.sender_address.toLowerCase();
  const indicators: Indicator[] = [];

  // Match against Institutional Trust Registry
  const identities = db.getIdentities();
  let matchedIdentity: TrustIdentity | undefined;

  if (input.claimed_identity) {
    matchedIdentity = db.findIdentityByNameOrRole(input.claimed_identity);
  }
  if (!matchedIdentity && input.claimed_role) {
    matchedIdentity = db.findIdentityByNameOrRole(input.claimed_role);
  }
  if (!matchedIdentity) {
    // Check if the message itself claims an identity
    for (const identity of identities) {
      if (
        input.message_content.toLowerCase().includes(identity.role.toLowerCase()) ||
        input.message_content.toLowerCase().includes(identity.name.toLowerCase()) ||
        input.sender_address.toLowerCase().includes(identity.role.toLowerCase().replace(/\s+/g, ''))
      ) {
        matchedIdentity = identity;
        break;
      }
    }
  }

  // Baseline evaluation
  let trustScore = 85; // Starting baseline
  let totalRiskWeight = 0;

  // Run underlying message analysis for urgency, OTP, and credential lures
  const msgAnalysis = analyzeMessage(input.message_content);

  if (matchedIdentity) {
    indicators.push({
      id: 'PROTECTED_IDENTITY_TARGET',
      name: 'PROTECTED_IDENTITY_TARGET',
      description: `Communication references protected institutional authority "${matchedIdentity.name}" (${matchedIdentity.role}, ${matchedIdentity.department})`,
      severity: matchedIdentity.sensitivity_level === 'EXECUTIVE' ? 'high' : 'medium',
      weight: matchedIdentity.sensitivity_level === 'EXECUTIVE' ? 18 : 10,
      source: 'identity_guard',
      evidence_data: {
        identity_id: matchedIdentity.id,
        role: matchedIdentity.role,
        department: matchedIdentity.department,
        sensitivity: matchedIdentity.sensitivity_level
      }
    });

    // Check 1: Domain Mismatch
    const isDomainMatch = senderDomain === matchedIdentity.approved_domain.toLowerCase();
    const isFreeMail = /(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|proton\.me)$/i.test(senderDomain);

    if (!isDomainMatch) {
      const weight = isFreeMail ? 35 : 28;
      indicators.push({
        id: 'IDENTITY_DOMAIN_MISMATCH',
        name: 'IDENTITY_DOMAIN_MISMATCH',
        description: `Sender domain "${senderDomain}" does NOT match official domain "${matchedIdentity.approved_domain}" registered for ${matchedIdentity.role}`,
        severity: 'critical',
        weight,
        source: 'identity_guard',
        evidence_data: {
          claimed_role: matchedIdentity.role,
          sender_domain: senderDomain,
          approved_domain: matchedIdentity.approved_domain,
          is_free_mail: isFreeMail
        },
        mitre: ['T1566.002', 'T1586']
      });
      totalRiskWeight += weight;
      trustScore -= 50;
    } else {
      indicators.push({
        id: 'OFFICIAL_DOMAIN_MATCH',
        name: 'OFFICIAL_DOMAIN_MATCH',
        description: `Sender domain "${senderDomain}" matches registered official institutional domain`,
        severity: 'low',
        weight: 0,
        source: 'identity_guard',
        evidence_data: { senderDomain }
      });
      trustScore += 15;
    }

    // Check 2: Approved Channel Match
    const isChannelApproved = matchedIdentity.approved_channels.includes(input.communication_channel.toLowerCase()) || 
      (input.communication_channel === 'email' && isDomainMatch);

    if (!isChannelApproved) {
      const weight = 24;
      indicators.push({
        id: 'UNAPPROVED_COMMUNICATION_CHANNEL',
        name: 'UNAPPROVED_COMMUNICATION_CHANNEL',
        description: `Channel "${input.communication_channel}" is not on the authorized broadcast whitelist for ${matchedIdentity.role}`,
        severity: 'high',
        weight,
        source: 'identity_guard',
        evidence_data: {
          channel: input.communication_channel,
          approved_channels: matchedIdentity.approved_channels
        },
        mitre: ['T1566']
      });
      totalRiskWeight += weight;
      trustScore -= 25;
    }
  } else {
    // No protected identity matched - evaluate based on public institutional address or unverified sender
    const isOfficialDomain = db.isOfficialDomain(senderDomain);
    if (!isOfficialDomain) {
      indicators.push({
        id: 'UNVERIFIED_EXTERNAL_SENDER',
        name: 'UNVERIFIED_EXTERNAL_SENDER',
        description: `Sender "${input.sender_address}" originates outside the institutional trust perimeter`,
        severity: 'low',
        weight: 8,
        source: 'identity_guard',
        evidence_data: { sender_address: input.sender_address }
      });
      totalRiskWeight += 8;
      trustScore -= 15;
    }
  }

  // Cross-reference message threats with identity impersonation
  for (const ind of msgAnalysis.indicators) {
    if (ind.id === 'OTP_SOLICITATION' || ind.id === 'CREDENTIAL_HARVESTING_LURE') {
      const multiplier = matchedIdentity ? 1.3 : 1.0;
      const weightedScore = Math.round(ind.weight * multiplier);
      indicators.push({
        ...ind,
        weight: weightedScore,
        description: `${ind.description} (Targeting Institutional Identity)`
      });
      totalRiskWeight += weightedScore;
      trustScore -= 30;
    } else if (ind.id !== 'EMBEDDED_EXTERNAL_URL') {
      indicators.push(ind);
      totalRiskWeight += ind.weight;
      trustScore -= 10;
    }
  }

  // Bound trust score 0-100 and risk score 0-100
  trustScore = Math.max(0, Math.min(100, trustScore));
  let riskScore = Math.max(0, Math.min(100, Math.round(totalRiskWeight * 1.05)));

  if (!matchedIdentity && db.isOfficialDomain(senderDomain) && msgAnalysis.severity === 'SAFE') {
    riskScore = 5;
    trustScore = 95;
  }

  let severity: SeverityLevel = 'SAFE';
  let classification: ClassificationType = 'legitimate';

  if (riskScore >= 80) {
    severity = 'CRITICAL';
    classification = matchedIdentity ? 'executive_impersonation' : 'credential_phishing';
  } else if (riskScore >= 60) {
    severity = 'HIGH';
    classification = matchedIdentity ? 'executive_impersonation' : 'unauthorized_channel';
  } else if (riskScore >= 40) {
    severity = 'MEDIUM';
    classification = 'social_engineering';
  } else if (riskScore >= 20) {
    severity = 'LOW';
    classification = 'social_engineering';
  }

  const confidence = matchedIdentity ? 0.96 : 0.88;

  let summary = '';
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    summary = `CRITICAL IMPERSONATION: Sender ${input.sender_address} claims identity of ${matchedIdentity?.role || 'Institutional Official'} over unauthorized channel with credential/OTP demands.`;
  } else if (severity === 'SAFE') {
    summary = `Verified sender authenticity on approved institutional communication channel.`;
  } else {
    summary = `${severity} advisory: External sender with elevated communication risk.`;
  }

  return {
    claimed_identity: input.claimed_identity || matchedIdentity?.name || 'Unspecified',
    sender_address: input.sender_address,
    sender_domain: senderDomain,
    channel: input.communication_channel,
    trust_score: trustScore,
    risk_score: riskScore,
    classification,
    confidence,
    severity,
    matched_identity: matchedIdentity,
    indicators,
    summary
  };
}
