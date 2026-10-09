/**
 * CYBERGUARD - Hero Demonstration: Multi-Stage Attack Campaign & Benign Simulators
 * Executes realistic authorized synthetic attack campaigns through the actual detector and correlation pipelines.
 */

import { SecurityEvent, TrustDomain, TrustIdentity } from '../types';
import { db } from '../db';
import { analyzeMessage } from '../detectors/message_detector';
import { analyzeUrl } from '../detectors/url_detector';
import { processQrInput } from '../detectors/qr_detector';
import { analyzeIdentity } from '../detectors/identity_detector';
import { analyzeAuthLogs, AuthLogRecord } from '../detectors/auth_detector';
import { correlateEventsIntoIncidents } from '../core/correlation';

export interface CampaignStepResult {
  step: number;
  stage_name: string;
  source: string;
  risk_score: number;
  severity: string;
  event: SecurityEvent;
  cumulative_incident_risk: number;
}

export function runFullAttackCampaignSimulation(): { steps: CampaignStepResult[]; incident_id: string } {
  const steps: CampaignStepResult[] = [];
  const targetUser = 'student042';

  // --- Stage 1: Phishing Message (Fake Scholarship Expiration) ---
  const msg1 = 'URGENT SCHOLARSHIP NOTICE: Your state pre-matric scholarship disbursement has encountered a verification freeze. Action required within 24 hours to avoid cancellation of Rs 45,000 allowance.';
  const msgRes1 = analyzeMessage(msg1);
  const evt1: SecurityEvent = {
    event_id: `EVT-CAM-01`,
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    source: 'message_analyzer',
    classification: msgRes1.classification,
    confidence: msgRes1.confidence,
    risk_score: msgRes1.risk_score,
    severity: msgRes1.severity,
    entities: {
      user_id: targetUser,
      target_email: 'student042@pmec.ac.in',
      sender: 'scholarship-verification-desk@odisha-scholarships-gov.xyz'
    },
    indicators: msgRes1.indicators,
    recommended_actions: ['quarantine_message', 'warn_user'],
    mitre: ['T1566'],
    raw_input_summary: msg1
  };
  db.addEvent(evt1);
  steps.push({
    step: 1,
    stage_name: 'Stage 1: Deceptive Scholarship Coercion Message',
    source: 'message_analyzer',
    risk_score: evt1.risk_score,
    severity: evt1.severity,
    event: evt1,
    cumulative_incident_risk: 52
  });

  // --- Stage 2 & 3: QR Code & Look-alike Institutional Domain ---
  const qrUrl = 'https://pmec-exam-support.com/student-portal/auth-verify';
  const qrRes = processQrInput(qrUrl);
  const evt2: SecurityEvent = {
    event_id: `EVT-CAM-02`,
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    source: 'qr_decoder',
    classification: qrRes.classification,
    confidence: qrRes.confidence,
    risk_score: qrRes.risk_score,
    severity: qrRes.severity,
    entities: {
      user_id: targetUser,
      url: qrUrl,
      domain: 'pmec-exam-support.com'
    },
    indicators: qrRes.indicators,
    recommended_actions: ['block_url', 'sinkhole_domain'],
    mitre: ['T1204.001', 'T1566.002', 'T1586'],
    raw_input_summary: `Scanned Physical QR Poster leading to deceptive domain ${qrUrl}`
  };
  db.addEvent(evt2);
  steps.push({
    step: 2,
    stage_name: 'Stage 2 & 3: Quishing & Look-Alike Domain (pmec-exam-support.com)',
    source: 'qr_decoder',
    risk_score: evt2.risk_score,
    severity: evt2.severity,
    event: evt2,
    cumulative_incident_risk: 70
  });

  // --- Stage 4: Identity Impersonation (Registrar Spoof via Free-mail asking for OTP) ---
  const identRes = analyzeIdentity({
    claimed_identity: 'Dr. S. K. Nayak',
    claimed_role: 'Registrar',
    sender_address: 'registrar-pmec-support@gmail.com',
    communication_channel: 'whatsapp',
    message_content: 'Immediate attention student042. Controller of Examinations directive: Share your examination portal OTP immediately to validate enrollment.',
    user_id: targetUser
  });
  const evt3: SecurityEvent = {
    event_id: `EVT-CAM-03`,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    source: 'identity_guard',
    classification: identRes.classification,
    confidence: identRes.confidence,
    risk_score: identRes.risk_score,
    severity: identRes.severity,
    entities: {
      user_id: targetUser,
      sender: identRes.sender_address,
      sender_domain: identRes.sender_domain,
      claimed_identity: 'Dr. S. K. Nayak',
      claimed_role: 'Registrar'
    },
    indicators: identRes.indicators,
    recommended_actions: ['warn_user', 'flag_impersonator'],
    mitre: ['T1566.002', 'T1586', 'T1539'],
    raw_input_summary: 'Executive Identity Spoofing (Registrar) over unapproved WhatsApp channel demanding OTP'
  };
  db.addEvent(evt3);
  steps.push({
    step: 3,
    stage_name: 'Stage 4: Executive Impersonation & OTP Solicitation',
    source: 'identity_guard',
    risk_score: evt3.risk_score,
    severity: evt3.severity,
    event: evt3,
    cumulative_incident_risk: 82
  });

  // --- Stage 5 & 6: Password Spraying & Brute Force Attacks on Technology Layer ---
  const sprayLogs: AuthLogRecord[] = [
    { timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), user_id: 'student041', ip: '185.220.101.4', device: 'Hydra/9.2', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 1.5 + 2000).toISOString(), user_id: 'student042', ip: '185.220.101.4', device: 'Hydra/9.2', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 1.5 + 4000).toISOString(), user_id: 'student043', ip: '185.220.101.4', device: 'Hydra/9.2', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 1.5 + 6000).toISOString(), user_id: 'student044', ip: '185.220.101.4', device: 'Hydra/9.2', location: 'Frankfurt, Germany', status: 'FAILURE' }
  ];
  const sprayRes = analyzeAuthLogs(sprayLogs);
  const evt4: SecurityEvent = {
    event_id: `EVT-CAM-04`,
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    source: 'auth_guard',
    classification: sprayRes.classification,
    confidence: sprayRes.confidence,
    risk_score: sprayRes.risk_score,
    severity: sprayRes.severity,
    entities: {
      user_id: targetUser,
      ip: '185.220.101.4',
      device: 'Hydra/9.2',
      location: 'Frankfurt, Germany'
    },
    indicators: sprayRes.indicators,
    recommended_actions: ['block_ip', 'enforce_mfa'],
    mitre: ['T1110.003'],
    raw_input_summary: 'Distributed password spraying targeting multiple student accounts from 185.220.101.4'
  };
  db.addEvent(evt4);
  steps.push({
    step: 4,
    stage_name: 'Stage 5 & 6: Distributed Password Spraying Attack',
    source: 'auth_guard',
    risk_score: evt4.risk_score,
    severity: evt4.severity,
    event: evt4,
    cumulative_incident_risk: 89
  });

  // --- Stage 7, 8 & 9: Impossible Travel + New Device + Account Takeover Compromise ---
  const atoLogs: AuthLogRecord[] = [
    { timestamp: new Date(Date.now() - 3600000 * 1.0).toISOString(), user_id: targetUser, ip: '14.139.221.14', device: 'Chrome on macOS', location: 'Berhampur, Odisha, IN', status: 'SUCCESS' },
    { timestamp: new Date(Date.now() - 3600000 * 0.4).toISOString(), user_id: targetUser, ip: '194.26.29.112', device: 'Firefox on Linux (Kali)', location: 'Bucharest, Romania', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 0.3).toISOString(), user_id: targetUser, ip: '194.26.29.112', device: 'Firefox on Linux (Kali)', location: 'Bucharest, Romania', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 0.2).toISOString(), user_id: targetUser, ip: '194.26.29.112', device: 'Firefox on Linux (Kali)', location: 'Bucharest, Romania', status: 'FAILURE' },
    { timestamp: new Date(Date.now() - 3600000 * 0.1).toISOString(), user_id: targetUser, ip: '194.26.29.112', device: 'Firefox on Linux (Kali)', location: 'Bucharest, Romania', status: 'SUCCESS' }
  ];
  const atoRes = analyzeAuthLogs(atoLogs);
  const evt5: SecurityEvent = {
    event_id: `EVT-CAM-05`,
    timestamp: new Date(Date.now() - 3600000 * 0.1).toISOString(),
    source: 'auth_guard',
    classification: atoRes.classification,
    confidence: atoRes.confidence,
    risk_score: atoRes.risk_score,
    severity: atoRes.severity,
    entities: {
      user_id: targetUser,
      ip: '194.26.29.112',
      device: 'Firefox on Linux (Kali)',
      location: 'Bucharest, Romania'
    },
    indicators: atoRes.indicators,
    recommended_actions: ['revoke_sessions', 'force_password_reset', 'require_hardware_mfa'],
    mitre: ['T1078', 'T1110', 'T1056'],
    raw_input_summary: 'Impossible travel anomaly (Berhampur -> Bucharest in 36m, 9200km/h) followed by valid session takeover'
  };
  db.addEvent(evt5);
  steps.push({
    step: 5,
    stage_name: 'Stage 7, 8 & 9: Impossible Travel & Active Account Takeover (ATO)',
    source: 'auth_guard',
    risk_score: evt5.risk_score,
    severity: evt5.severity,
    event: evt5,
    cumulative_incident_risk: 96
  });

  // Correlate into unified incident
  const incidents = correlateEventsIntoIncidents();
  const correlatedIncident = incidents.find(i => i.target_user === targetUser) || incidents[0];

  return {
    steps,
    incident_id: correlatedIncident ? correlatedIncident.id : 'CG-0001'
  };
}

export function runSafeNoticeSimulation(): { event: SecurityEvent; risk_score: number; severity: string } {
  const officialNotice = 'PMEC Berhampur Official Academic Notice: The Controller of Examinations has published the revised spring end-term schedule on the official college notice board and portal https://pmec.ac.in/examinations. Students are advised to download the signed schedule. Classes will proceed as per timetable.';
  
  const msgRes = analyzeMessage(officialNotice);
  const urlRes = analyzeUrl('https://pmec.ac.in/examinations');

  const evt: SecurityEvent = {
    event_id: `EVT-SAFE-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    source: 'message_analyzer',
    classification: 'legitimate',
    confidence: 0.99,
    risk_score: 8,
    severity: 'SAFE',
    entities: {
      sender: 'registrar@pmec.ac.in',
      sender_domain: 'pmec.ac.in',
      claimed_identity: 'Dr. S. K. Nayak',
      claimed_role: 'Registrar',
      url: 'https://pmec.ac.in/examinations',
      domain: 'pmec.ac.in'
    },
    indicators: [
      {
        id: 'VERIFIED_INSTITUTIONAL_SENDER',
        name: 'VERIFIED_INSTITUTIONAL_SENDER',
        description: 'Communication dispatched from verified PMEC institutional domain (pmec.ac.in) via approved academic distribution list.',
        severity: 'low',
        weight: 0,
        source: 'identity_guard',
        evidence_data: { domain: 'pmec.ac.in', status: 'OFFICIAL' }
      }
    ],
    recommended_actions: ['allow_traffic'],
    mitre: [],
    raw_input_summary: officialNotice
  };

  db.addEvent(evt);
  return {
    event: evt,
    risk_score: 8,
    severity: 'SAFE'
  };
}

export function runDomainTargetedCampaignSimulation(
  domain: TrustDomain,
  persona?: TrustIdentity
): { steps: CampaignStepResult[]; incident_id: string; domain: string } {
  const steps: CampaignStepResult[] = [];
  const targetUser = 'student042';
  const domainHost = domain.domain.toLowerCase().trim();
  const domainCore = domainHost.split('.')[0];
  const orgName = domain.organization || domainHost;
  const targetPersona = persona || db.getIdentities()[0] || {
    id: 'ID-001',
    name: 'Executive Authority',
    role: 'Institutional Director',
    department: 'Administration',
    official_email: `director@${domainHost}`,
    approved_domain: domainHost,
    approved_channels: ['institutional_email', 'official_portal'],
    sensitivity_level: 'HIGH',
    last_updated: new Date().toISOString()
  };

  const idSuffix = Date.now().toString(36).toUpperCase().substring(3, 7);

  // Stage 1: Social Engineering Message citing this specific domain and org
  const msg1 = `[URGENT NOTIFICATION] ${orgName} Official Advisory: Your institutional authentication access for ${domainHost} has encountered critical synchronization failure. Immediate portal validation required within 4 hours.`;
  const msgRes1 = analyzeMessage(msg1);
  const evt1: SecurityEvent = {
    event_id: `EVT-DOM-${idSuffix}-01`,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    source: 'message_analyzer',
    classification: msgRes1.classification,
    confidence: msgRes1.confidence,
    risk_score: msgRes1.risk_score,
    severity: msgRes1.severity,
    entities: {
      user_id: targetUser,
      target_email: `${targetUser}@${domainHost}`,
      sender: `security-notice@${domainCore}-support-alert.xyz`
    },
    indicators: msgRes1.indicators,
    recommended_actions: ['quarantine_message', 'warn_user'],
    mitre: ['T1566'],
    raw_input_summary: msg1
  };
  db.addEvent(evt1);
  steps.push({
    step: 1,
    stage_name: `Stage 1: Deceptive Coercion Message targeting ${domainHost}`,
    source: 'message_analyzer',
    risk_score: evt1.risk_score,
    severity: evt1.severity,
    event: evt1,
    cumulative_incident_risk: 54
  });

  // Stage 2: Deceptive Lookalike Domain targeting this domain
  const lookalikeUrl = `https://${domainCore}-portal-auth-verification.xyz/login/verify.php`;
  const urlRes = analyzeUrl(lookalikeUrl);
  const evt2: SecurityEvent = {
    event_id: `EVT-DOM-${idSuffix}-02`,
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    source: 'url_analyzer',
    classification: urlRes.classification,
    confidence: urlRes.confidence,
    risk_score: urlRes.risk_score,
    severity: urlRes.severity,
    entities: {
      user_id: targetUser,
      url: lookalikeUrl,
      domain: `${domainCore}-portal-auth-verification.xyz`
    },
    indicators: urlRes.indicators,
    recommended_actions: ['block_url', 'add_to_dns_sinkhole'],
    mitre: ['T1566.002', 'T1586'],
    raw_input_summary: `Adversary Lookalike URL deployed mimicking ${domainHost}: ${lookalikeUrl}`
  };
  db.addEvent(evt2);
  steps.push({
    step: 2,
    stage_name: `Stage 2: Lookalike Typosquatting Asset (${domainCore}-portal-auth-verification.xyz)`,
    source: 'url_analyzer',
    risk_score: evt2.risk_score,
    severity: evt2.severity,
    event: evt2,
    cumulative_incident_risk: 78
  });

  // Stage 3: Spoofed Persona impersonating the registered authority
  const sanitizedName = targetPersona.name.toLowerCase().replace(/[^a-z]/g, '');
  const spoofSender = `${sanitizedName}-${domainCore}@gmail.com`;
  const identRes = analyzeIdentity({
    claimed_identity: targetPersona.name,
    claimed_role: targetPersona.role,
    sender_address: spoofSender,
    communication_channel: 'email',
    message_content: `Official directive from ${targetPersona.name} (${targetPersona.role}): Verify credentials at ${lookalikeUrl} immediately.`,
    user_id: targetUser
  });
  const evt3: SecurityEvent = {
    event_id: `EVT-DOM-${idSuffix}-03`,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: 'identity_guard',
    classification: identRes.classification,
    confidence: identRes.confidence,
    risk_score: identRes.risk_score,
    severity: identRes.severity,
    entities: {
      user_id: targetUser,
      sender: spoofSender,
      sender_domain: 'gmail.com',
      claimed_identity: targetPersona.name,
      claimed_role: targetPersona.role
    },
    indicators: identRes.indicators,
    recommended_actions: ['flag_impersonator', 'warn_targeted_user'],
    mitre: ['T1566.002', 'T1586'],
    raw_input_summary: `Spoofed email from ${spoofSender} impersonating ${targetPersona.name} (${targetPersona.role})`
  };
  db.addEvent(evt3);
  steps.push({
    step: 3,
    stage_name: `Stage 3: Executive Persona Spoof (${targetPersona.name}) over freemail`,
    source: 'identity_guard',
    risk_score: evt3.risk_score,
    severity: evt3.severity,
    event: evt3,
    cumulative_incident_risk: 88
  });

  // Stage 4: Anomalous Authentication Attempt
  const authRecords: AuthLogRecord[] = [
    {
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      user_id: targetUser,
      ip: '185.220.101.5',
      location: 'Frankfurt, Germany',
      device: 'HeadlessChrome on Linux (Puppeteer Script)',
      status: 'FAILURE'
    },
    {
      timestamp: new Date(Date.now() - 600000).toISOString(),
      user_id: targetUser,
      ip: '185.220.101.5',
      location: 'Frankfurt, Germany',
      device: 'HeadlessChrome on Linux (Puppeteer Script)',
      status: 'SUCCESS'
    }
  ];
  const authRes = analyzeAuthLogs(authRecords);
  const evt4: SecurityEvent = {
    event_id: `EVT-DOM-${idSuffix}-04`,
    timestamp: new Date().toISOString(),
    source: 'auth_guard',
    classification: authRes.classification,
    confidence: authRes.confidence,
    risk_score: authRes.risk_score,
    severity: authRes.severity,
    entities: {
      user_id: targetUser,
      ip: '185.220.101.5',
      location: 'Frankfurt, Germany',
      device: 'HeadlessChrome on Linux'
    },
    indicators: authRes.indicators,
    recommended_actions: ['revoke_user_sessions', 'block_source_ip', 'require_stepup_mfa'],
    mitre: ['T1078.004', 'T1110'],
    raw_input_summary: `Credential exploitation session from 185.220.101.5 following phishing lure targeting ${domainHost}`
  };
  db.addEvent(evt4);
  steps.push({
    step: 4,
    stage_name: 'Stage 4: Post-Exploitation Account Takeover & Anomalous Geolocation',
    source: 'auth_guard',
    risk_score: evt4.risk_score,
    severity: evt4.severity,
    event: evt4,
    cumulative_incident_risk: 98
  });

  // Trigger automated correlation
  const incidents = correlateEventsIntoIncidents();
  const correlatedIncident = incidents.find(i => i.target_user === targetUser) || incidents[0];

  return {
    steps,
    incident_id: correlatedIncident ? correlatedIncident.id : 'CG-0001',
    domain: domainHost
  };
}
