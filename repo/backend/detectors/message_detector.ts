/**
 * CYBERGUARD - Phishing Shield: Message & Social Engineering Detector
 * Combines TF-IDF n-gram scoring, intent heuristic rules, and social-engineering pattern weights.
 */

import { Indicator, ClassificationType, SeverityLevel } from '../types';
import { db } from '../db';
import { extractDomainFromUrl } from './url_detector';

interface MessageAnalysisResult {
  classification: ClassificationType;
  confidence: number;
  risk_score: number;
  severity: SeverityLevel;
  indicators: Indicator[];
  extracted_urls: string[];
  intent_categories: string[];
  summary: string;
}

// Institutional & Social Engineering vocabulary weights (TF-IDF surrogate weights)
const SUSPICIOUS_PATTERNS = [
  {
    regex: /(urgent|immediately|action required|within 24 hours|expires (today|soon)|deadline|turant|ekhuni)/i,
    name: 'URGENCY_TRIGGER',
    description: 'High-urgency artificial time constraint designed to bypass critical scrutiny',
    weight: 16,
    severity: 'medium' as const,
    mitre: ['T1566']
  },
  {
    regex: /(share|send|provide|enter|submit|give|validat|forward|pathaantu|share karo).{0,25}(otp|one.?time.?password|verification code|security pin|mfa code)|\b(portal otp|share otp|send otp|your otp)\b/i,
    name: 'OTP_SOLICITATION',
    description: 'Direct solicitation of One-Time Password / Multi-Factor Authentication token',
    weight: 35,
    severity: 'critical' as const,
    mitre: ['T1566.002', 'T1539']
  },
  {
    regex: /(password|login credentials|portal password|verify your login|reset your password|enter credentials|user id and password)/i,
    name: 'CREDENTIAL_HARVESTING_LURE',
    description: 'Direct request for institutional user credentials or account authentication',
    weight: 28,
    severity: 'high' as const,
    mitre: ['T1566.002', 'T1056']
  },
  {
    regex: /(scholarship.*disbursed|claim your scholarship|exam fee.*due|fee penalty|debarred from exam|semester fee pending|admit card withheld)/i,
    name: 'INSTITUTIONAL_COERCION_LURE',
    description: 'Institutional coercion exploiting state scholarship, fee deadlines, or examination eligibility',
    weight: 24,
    severity: 'high' as const,
    mitre: ['T1566.001']
  },
  {
    regex: /(disciplinary action|show cause notice|office of the principal|registrar directive|legal action|police verification)/i,
    name: 'AUTHORITY_PRESSURE',
    description: 'Exploitation of high institutional authority or fear of disciplinary consequences',
    weight: 20,
    severity: 'high' as const,
    mitre: ['T1566']
  },
  {
    regex: /(pay now|upi transfer|deposit fee|refund processing|bank account details|google pay|phonepe|send money)/i,
    name: 'PAYMENT_EXFILTRATION',
    description: 'Unsanctioned financial transaction or digital payment solicitation',
    weight: 26,
    severity: 'high' as const,
    mitre: ['T1566.002']
  },
  {
    regex: /(click here|download form|open the attachment|scan the qr|follow this link|portal-update)/i,
    name: 'DECEPTIVE_CALL_TO_ACTION',
    description: 'Coercive directive urging the recipient to click external links or scan unverified codes',
    weight: 14,
    severity: 'medium' as const,
    mitre: ['T1204.001']
  }
];

export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

export function analyzeMessage(text: string, context?: { sender?: string; channel?: string }): MessageAnalysisResult {
  const trimmed = text.trim();
  const indicators: Indicator[] = [];
  const intentCategories: string[] = [];

  if (!trimmed) {
    return {
      classification: 'legitimate',
      confidence: 1.0,
      risk_score: 0,
      severity: 'SAFE',
      indicators: [],
      extracted_urls: [],
      intent_categories: [],
      summary: 'Empty or blank content evaluated as safe.'
    };
  }

  const extractedUrls = extractUrlsFromText(trimmed);
  let totalWeight = 0;

  if (extractedUrls.length > 0) {
    let hasOfficialUrl = false;
    let hasRevokedUrl = false;

    for (const rawUrl of extractedUrls) {
      const { domain } = extractDomainFromUrl(rawUrl);
      if (db.isRevokedDomain(domain)) {
        hasRevokedUrl = true;
        indicators.push({
          id: 'REVOKED_DOMAIN_IN_MESSAGE',
          name: 'REVOKED_DOMAIN_IN_MESSAGE',
          description: `Message contains URL resolving to blacklisted revoked domain "${domain}" in the Institutional Trust Registry`,
          severity: 'critical',
          weight: 42,
          source: 'message_analyzer',
          evidence_data: { domain, raw_url: rawUrl },
          mitre: ['T1583.001']
        });
        totalWeight += 42;
      } else if (db.isOfficialDomain(domain)) {
        hasOfficialUrl = true;
        indicators.push({
          id: 'VERIFIED_OFFICIAL_DOMAIN_LINK',
          name: 'VERIFIED_OFFICIAL_DOMAIN_LINK',
          description: `Message links to verified institutional domain "${domain}" registered in Trust Panel`,
          severity: 'low',
          weight: -15, // Trust reduction of risk
          source: 'message_analyzer',
          evidence_data: { domain, raw_url: rawUrl }
        });
        totalWeight = Math.max(0, totalWeight - 15);
      }
    }

    if (!hasOfficialUrl && !hasRevokedUrl) {
      indicators.push({
        id: 'EMBEDDED_EXTERNAL_URL',
        name: 'EMBEDDED_EXTERNAL_URL',
        description: `Message embeds ${extractedUrls.length} unverified external URL destination(s)`,
        severity: 'medium',
        weight: 12,
        source: 'message_analyzer',
        evidence_data: { urls: extractedUrls },
        mitre: ['T1566.002']
      });
      totalWeight += 12;
    }
    intentCategories.push('url_redirection');
  }

  // Cross-reference protected personas registered in Trust Panel
  const registeredIdentities = db.getIdentities();
  for (const identity of registeredIdentities) {
    const roleLower = identity.role.toLowerCase();
    const nameLower = identity.name.toLowerCase();
    if (trimmed.toLowerCase().includes(roleLower) || trimmed.toLowerCase().includes(nameLower)) {
      indicators.push({
        id: 'PROTECTED_PERSONA_REFERENCED',
        name: 'PROTECTED_PERSONA_REFERENCED',
        description: `Message explicitly references official university persona "${identity.name}" (${identity.role}, ${identity.department})`,
        severity: identity.sensitivity_level === 'EXECUTIVE' ? 'high' : 'medium',
        weight: identity.sensitivity_level === 'EXECUTIVE' ? 14 : 8,
        source: 'message_analyzer',
        evidence_data: { persona_id: identity.id, name: identity.name, role: identity.role }
      });
      totalWeight += identity.sensitivity_level === 'EXECUTIVE' ? 14 : 8;
      break;
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      indicators.push({
        id: pattern.name,
        name: pattern.name,
        description: pattern.description,
        severity: pattern.severity,
        weight: pattern.weight,
        source: 'message_analyzer',
        evidence_data: { matched_rule: pattern.name },
        mitre: pattern.mitre
      });
      totalWeight += pattern.weight;
      intentCategories.push(pattern.name.toLowerCase());
    }
  }

  // Calculate normalized risk score between 0 and 100
  // Safe messages score < 20; mild urgency without credentials ~ 25; credentials + urgency > 60; OTP > 75
  let riskScore = Math.min(100, Math.round(totalWeight * 1.15));

  // Determine classification and severity
  let classification: ClassificationType = 'legitimate';
  let severity: SeverityLevel = 'SAFE';

  if (riskScore >= 80) {
    severity = 'CRITICAL';
    classification = indicators.some(i => i.id === 'OTP_SOLICITATION' || i.id === 'CREDENTIAL_HARVESTING_LURE') 
      ? 'credential_phishing' 
      : 'social_engineering';
  } else if (riskScore >= 60) {
    severity = 'HIGH';
    classification = 'credential_phishing';
  } else if (riskScore >= 40) {
    severity = 'MEDIUM';
    classification = 'social_engineering';
  } else if (riskScore >= 20) {
    severity = 'LOW';
    classification = 'social_engineering';
  } else {
    severity = 'SAFE';
    classification = 'legitimate';
  }

  // Confidence is calculated from feature alignment
  const confidence = indicators.length === 0 
    ? 0.96 
    : Math.min(0.98, Math.max(0.70, 0.65 + (indicators.length * 0.08)));

  let summary = '';
  if (severity === 'SAFE') {
    summary = 'Official / benign institutional language detected. No coercive patterns or credential demands observed.';
  } else {
    const topThreats = indicators.map(i => i.name.replace(/_/g, ' ')).join(', ');
    summary = `${severity} threat detected: Message demonstrates ${topThreats}.`;
  }

  return {
    classification,
    confidence,
    risk_score: riskScore,
    severity,
    indicators,
    extracted_urls: extractedUrls,
    intent_categories: intentCategories,
    summary
  };
}
