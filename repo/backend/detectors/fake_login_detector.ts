/**
 * CYBERGUARD - Fake Institutional Login Page & Credential Harvesting Detector
 * Analyzes HTML snapshots, form actions, input fields, and claimed institutional identities against observed domains.
 */

import { Indicator, ClassificationType, SeverityLevel } from '../types';
import { db } from '../db';
import { extractDomainFromUrl } from './url_detector';

interface FakeLoginAnalysisInput {
  claimed_brand?: string;
  observed_url: string;
  html_snippet?: string;
  has_login_form?: boolean;
  fields_present?: string[];
  form_action_target?: string;
}

interface FakeLoginAnalysisResult {
  classification: ClassificationType;
  confidence: number;
  risk_score: number;
  severity: SeverityLevel;
  indicators: Indicator[];
  summary: string;
  findings: {
    is_spoofed_domain: boolean;
    credentials_solicited: string[];
    suspicious_action_url: boolean;
  };
}

export function analyzeFakeLogin(input: FakeLoginAnalysisInput): FakeLoginAnalysisResult {
  const { domain } = extractDomainFromUrl(input.observed_url);
  const isRevoked = db.isRevokedDomain(domain);
  const isOfficial = db.isOfficialDomain(domain);
  const indicators: Indicator[] = [];

  const rawHtml = (input.html_snippet || '').toLowerCase();
  const fields = input.fields_present || [];

  // Parse HTML if fields not explicitly provided
  const hasPasswordField = fields.includes('password') || rawHtml.includes('type="password"') || rawHtml.includes('name="password"') || /pin|pass/i.test(rawHtml);
  const hasOtpField = fields.includes('otp') || /otp|one.?time.?password|token|verification.?code/i.test(rawHtml);
  const hasRegistrationField = fields.includes('roll_no') || /roll.?no|reg.?no|student.?id|bput.?reg/i.test(rawHtml);
  const hasLoginForm = input.has_login_form ?? (rawHtml.includes('<form') || hasPasswordField);

  const claimedBrand = input.claimed_brand || 'PMEC / BPUT Academic Portal';
  const credentialsSolicited: string[] = [];
  if (hasPasswordField) credentialsSolicited.push('Password');
  if (hasOtpField) credentialsSolicited.push('One-Time Password (OTP)');
  if (hasRegistrationField) credentialsSolicited.push('Student Registration / Roll Number');

  let totalWeight = 0;

  if (isRevoked) {
    return {
      classification: 'credential_harvesting',
      confidence: 0.99,
      risk_score: 99,
      severity: 'CRITICAL',
      indicators: [
        {
          id: 'REVOKED_HOSTILE_LOGIN_PAGE',
          name: 'REVOKED_HOSTILE_LOGIN_PAGE',
          description: `Login page hosted on explicitly REVOKED/blacklisted domain: ${domain}`,
          severity: 'critical',
          weight: 48,
          source: 'fake_login_detector',
          evidence_data: { domain, isRevoked: true },
          mitre: ['T1583.001', 'T1056.003']
        }
      ],
      summary: `CRITICAL CREDENTIAL TRAP: "${domain}" is registered as REVOKED in the institutional trust panel. All entered student credentials would be exfiltrated.`,
      findings: {
        is_spoofed_domain: true,
        credentials_solicited: credentialsSolicited,
        suspicious_action_url: true
      }
    };
  }

  if (isOfficial) {
    return {
      classification: 'legitimate',
      confidence: 0.98,
      risk_score: 8,
      severity: 'SAFE',
      indicators: [
        {
          id: 'VERIFIED_OFFICIAL_LOGIN_PORTAL',
          name: 'VERIFIED_OFFICIAL_LOGIN_PORTAL',
          description: `Login portal hosted on verified official domain: ${domain}`,
          severity: 'low',
          weight: 0,
          source: 'fake_login_detector',
          evidence_data: { domain, isOfficial: true }
        }
      ],
      summary: `Legitimate institutional authentication portal hosted on authorized domain ${domain}.`,
      findings: {
        is_spoofed_domain: false,
        credentials_solicited: credentialsSolicited,
        suspicious_action_url: false
      }
    };
  }

  // Domain is NOT official, but page claims institutional identity or presents login form
  if (!isOfficial) {
    indicators.push({
      id: 'UNAUTHORIZED_LOGIN_HOST',
      name: 'UNAUTHORIZED_LOGIN_HOST',
      description: `Domain "${domain}" is not an authorized institutional domain for "${claimedBrand}"`,
      severity: 'critical',
      weight: 35,
      source: 'fake_login_detector',
      evidence_data: { domain, claimedBrand },
      mitre: ['T1566.002', 'T1586']
    });
    totalWeight += 35;
  }

  if (hasLoginForm) {
    indicators.push({
      id: 'CREDENTIAL_FORM_EXPOSURE',
      name: 'CREDENTIAL_FORM_EXPOSURE',
      description: 'Active authentication submission form rendered on non-institutional origin',
      severity: 'high',
      weight: 25,
      source: 'fake_login_detector',
      evidence_data: { hasLoginForm, credentialsSolicited },
      mitre: ['T1056.001']
    });
    totalWeight += 25;
  }

  if (hasOtpField) {
    indicators.push({
      id: 'MFA_BYPASS_HARVESTING',
      name: 'MFA_BYPASS_HARVESTING',
      description: 'Secondary MFA / OTP input token field detected on deceptive landing interface',
      severity: 'critical',
      weight: 30,
      source: 'fake_login_detector',
      evidence_data: { hasOtpField },
      mitre: ['T1539', 'T1110']
    });
    totalWeight += 30;
  }

  // Check form submission action URL
  let suspiciousActionUrl = false;
  if (input.form_action_target) {
    const actionDomain = extractDomainFromUrl(input.form_action_target).domain;
    if (actionDomain && actionDomain !== domain && !db.isOfficialDomain(actionDomain)) {
      suspiciousActionUrl = true;
      indicators.push({
        id: 'CROSS_DOMAIN_CREDENTIAL_EXFIL',
        name: 'CROSS_DOMAIN_CREDENTIAL_EXFIL',
        description: `Form action points to external exfiltration endpoint: ${input.form_action_target}`,
        severity: 'critical',
        weight: 30,
        source: 'fake_login_detector',
        evidence_data: { form_action_target: input.form_action_target },
        mitre: ['T1041']
      });
      totalWeight += 30;
    }
  }

  const riskScore = Math.min(100, Math.round(totalWeight * 1.05));
  let severity: SeverityLevel = 'SAFE';
  if (riskScore >= 80) severity = 'CRITICAL';
  else if (riskScore >= 60) severity = 'HIGH';
  else if (riskScore >= 40) severity = 'MEDIUM';
  else if (riskScore >= 20) severity = 'LOW';

  return {
    classification: 'credential_harvesting',
    confidence: 0.95,
    risk_score: riskScore,
    severity,
    indicators,
    summary: `${severity} Credential Harvesting Portal Detected: Page falsely claims ${claimedBrand} identity while operating from unapproved origin ${domain}.`,
    findings: {
      is_spoofed_domain: !isOfficial,
      credentials_solicited: credentialsSolicited,
      suspicious_action_url: suspiciousActionUrl
    }
  };
}
