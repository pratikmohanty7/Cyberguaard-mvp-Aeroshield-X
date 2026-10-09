/**
 * CYBERGUARD - Automated End-to-End & Unit Test Suite
 * Tests:
 * 1. URL Feature Extraction & Look-alike Domain Detection
 * 2. Risk Engine Scoring & Policy Bands
 * 3. Identity Guard & Channel Mismatch
 * 4. Password Spraying Detection (Distinct-account targeting from single IP)
 * 5. Impossible Travel Geodesic Speed Calculation
 * 6. Evidence Collection & Normalization
 * 7. Incident Correlation & Campaign Risk Escalation
 * 8. Response Playbooks, Human Authorization Gate & Audit Logging
 * 9. End-to-End Pipeline: Phishing -> Risk -> Incident -> Correlation -> Response
 */

import { analyzeMessage } from '../detectors/message_detector';
import { analyzeUrl, extractDomainFromUrl } from '../detectors/url_detector';
import { processQrInput } from '../detectors/qr_detector';
import { analyzeIdentity } from '../detectors/identity_detector';
import { analyzeAuthLogs, AuthLogRecord } from '../detectors/auth_detector';
import { computeCalibratedRisk } from '../core/risk';
import { compileEvidenceCollection } from '../core/evidence';
import { correlateEventsIntoIncidents } from '../core/correlation';
import { executeResponseAction } from '../core/response';
import { db } from '../db';
import { SecurityEvent } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('CYBERGUARD AUTOMATED SECURITY SUITE & ACCEPTANCE TEST');
  console.log('====================================================\n');

  // Test 1: URL & Look-alike Domain Detection
  console.log('1. Testing URL & Look-Alike Domain Engine...');
  const lookalikeRes = analyzeUrl('https://pmec-exam-support.com/auth');
  assert(lookalikeRes.indicators.some(i => i.id === 'DOMAIN_LOOKALIKE'), 'Detects look-alike domain against protected registry');
  assert(lookalikeRes.severity === 'CRITICAL' || lookalikeRes.severity === 'HIGH', 'Classifies look-alike domain as High/Critical severity');
  
  const officialRes = analyzeUrl('https://pmec.ac.in/academic-notices');
  assert(officialRes.is_official === true, 'Recognizes official institutional domain');
  assert(officialRes.severity === 'SAFE', 'Scores official institutional URL as SAFE (risk <= 20)');

  // Test 2: Message & Social Engineering Analysis
  console.log('\n2. Testing Message & Urgency / OTP Extraction...');
  const phishMsg = 'URGENT: Disciplinary action pending. Share your portal OTP immediately within 24 hours.';
  const phishRes = analyzeMessage(phishMsg);
  assert(phishRes.indicators.some(i => i.id === 'OTP_SOLICITATION'), 'Detects OTP solicitation');
  assert(phishRes.indicators.some(i => i.id === 'URGENCY_TRIGGER'), 'Detects artificial urgency lure');
  assert(phishRes.risk_score >= 60, 'Elevates risk score for credential & OTP demands');

  const safeMsg = 'PMEC Academic Section Notice: 6th semester mid-term exams begin on Monday.';
  const safeRes = analyzeMessage(safeMsg);
  assert(safeRes.severity === 'SAFE', 'Benign institutional notice evaluated as SAFE');

  // Test 3: QR Pipeline
  console.log('\n3. Testing QR Normalization Pipeline...');
  const qrRes = processQrInput('https://pmec-exam-support.com/qr/verify');
  assert(qrRes.is_valid_qr === true, 'Validates QR payload string');
  assert(qrRes.extracted_url === 'https://pmec-exam-support.com/qr/verify', 'Extracts and normalizes target URL from QR payload');
  assert(qrRes.indicators.some(i => i.id === 'QR_OBFUSCATED_VECTOR'), 'Attaches QR obfuscation vector indicator');
  assert(qrRes.indicators.some(i => i.id === 'DOMAIN_LOOKALIKE'), 'Pipes extracted URL into identical URL Look-Alike detector');

  // Test 4: Identity Guard
  console.log('\n4. Testing Institutional Identity Guard & Channel Whitelist...');
  const identRes = analyzeIdentity({
    claimed_identity: 'Dr. S. K. Nayak',
    claimed_role: 'Registrar',
    sender_address: 'registrar-pmec@gmail.com',
    communication_channel: 'whatsapp',
    message_content: 'Send your OTP immediately to confirm enrollment.',
    user_id: 'student042'
  });
  assert(identRes.indicators.some(i => i.id === 'IDENTITY_DOMAIN_MISMATCH'), 'Identifies sender domain mismatch vs approved domain');
  assert(identRes.indicators.some(i => i.id === 'UNAPPROVED_COMMUNICATION_CHANNEL'), 'Flags unauthorized WhatsApp channel for Registrar role');
  assert(identRes.severity === 'CRITICAL', 'Classifies executive impersonation with OTP demand as CRITICAL');

  // Test 5: Authentication & Password Spraying
  console.log('\n5. Testing Login Guard (Password Spraying & Impossible Travel)...');
  const sprayLogs: AuthLogRecord[] = [
    { timestamp: '2026-03-05T10:00:00Z', user_id: 'user1', ip: '198.51.100.22', device: 'Hydra', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: '2026-03-05T10:00:02Z', user_id: 'user2', ip: '198.51.100.22', device: 'Hydra', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: '2026-03-05T10:00:04Z', user_id: 'user3', ip: '198.51.100.22', device: 'Hydra', location: 'Frankfurt, Germany', status: 'FAILURE' },
    { timestamp: '2026-03-05T10:00:06Z', user_id: 'user4', ip: '198.51.100.22', device: 'Hydra', location: 'Frankfurt, Germany', status: 'FAILURE' }
  ];
  const authRes = analyzeAuthLogs(sprayLogs);
  assert(Boolean(authRes.anomalies.password_spraying), 'Detects single IP targeting multiple distinct accounts as PASSWORD_SPRAYING');
  assert(authRes.indicators.some(i => i.id === 'PASSWORD_SPRAYING_ATTACK'), 'Generates PASSWORD_SPRAYING_ATTACK indicator');

  const travelLogs: AuthLogRecord[] = [
    { timestamp: '2026-03-05T10:00:00Z', user_id: 'student042', ip: '14.139.221.14', device: 'Chrome on macOS', location: 'Berhampur, Odisha, IN', status: 'SUCCESS' },
    { timestamp: '2026-03-05T10:15:00Z', user_id: 'student042', ip: '194.26.29.112', device: 'Firefox on Linux', location: 'Moscow, Russia', status: 'SUCCESS' }
  ];
  const travelRes = analyzeAuthLogs(travelLogs);
  assert(Boolean(travelRes.anomalies.impossible_travel), 'Detects impossible travel speed (> 850 km/h) between logins');
  assert(travelRes.indicators.some(i => i.id === 'IMPOSSIBLE_TRAVEL_ANOMALY'), 'Generates IMPOSSIBLE_TRAVEL_ANOMALY indicator');

  // Test 6: Risk Engine Calibration
  console.log('\n6. Testing Calibrated Risk Engine & Policy Bands...');
  const safeRisk = computeCalibratedRisk([]);
  assert(safeRisk.severity === 'SAFE' && safeRisk.score <= 20, 'Zero indicators evaluates to 0-20 SAFE band');

  const criticalRisk = computeCalibratedRisk(
    [
      { id: 'DOMAIN_LOOKALIKE', name: 'DOMAIN_LOOKALIKE', description: '', severity: 'critical', weight: 32, source: 'url_analyzer', evidence_data: {} },
      { id: 'OTP_SOLICITATION', name: 'OTP_SOLICITATION', description: '', severity: 'critical', weight: 32, source: 'message_analyzer', evidence_data: {} },
      { id: 'IMPOSSIBLE_TRAVEL_ANOMALY', name: 'IMPOSSIBLE_TRAVEL_ANOMALY', description: '', severity: 'critical', weight: 34, source: 'auth_guard', evidence_data: {} }
    ],
    { is_executive_target: true, correlated_events_count: 3 }
  );
  assert(criticalRisk.severity === 'CRITICAL' && criticalRisk.score >= 81, 'Correlated critical indicators escalate to CRITICAL band');

  // Test 7: Evidence Collection
  console.log('\n7. Testing Evidence Layer Compilation...');
  const evidenceCollection = compileEvidenceCollection([
    { id: 'DOMAIN_LOOKALIKE', name: 'DOMAIN_LOOKALIKE', description: 'Lookalike domain', severity: 'critical', weight: 32, source: 'url_analyzer', evidence_data: { domain: 'pmec-exam-support.com' }, mitre: ['T1566.002'] }
  ]);
  assert(evidenceCollection.length === 1, 'Compiles verifiable evidence records');
  assert(evidenceCollection[0].evidence_id.startsWith('EVD-'), 'Assigns structured evidence ID format (EVD-xxxx)');

  // Test 8: End-to-End Correlation & Response Playbook Approval
  console.log('\n8. Testing End-to-End Incident Correlation & Response Authorization...');
  db.resetToDefault();

  const testEvent: SecurityEvent = {
    event_id: 'EVT-TEST-E2E-01',
    timestamp: new Date().toISOString(),
    source: 'url_analyzer',
    classification: 'lookalike_domain',
    confidence: 0.94,
    risk_score: 85,
    severity: 'CRITICAL',
    entities: {
      user_id: 'student042',
      url: 'https://pmec-exam-support.com/auth',
      domain: 'pmec-exam-support.com'
    },
    indicators: [
      { id: 'DOMAIN_LOOKALIKE', name: 'DOMAIN_LOOKALIKE', description: 'Spoofed domain', severity: 'critical', weight: 32, source: 'url_analyzer', evidence_data: {} }
    ],
    recommended_actions: ['block_url', 'revoke_sessions'],
    mitre: ['T1566.002'],
    raw_input_summary: 'Test lookalike domain event'
  };
  db.addEvent(testEvent);

  const correlatedIncidents = correlateEventsIntoIncidents();
  assert(correlatedIncidents.length > 0, 'Correlates event into unified incident dossier');

  const inc = correlatedIncidents[0];
  assert(inc.target_user === 'student042', 'Associates incident with target user');
  assert(inc.recommended_actions.length > 0, 'Populates response playbook actions');

  // Test Response Execution & Audit Logging
  const criticalAction = inc.recommended_actions[0];
  const responseResult = executeResponseAction({
    incident_id: inc.id,
    action_id: criticalAction.action_id,
    actor: 'Lead SOC Analyst (pratikmohanty730)',
    reason: 'Automated test suite approval'
  });
  assert(responseResult.success === true, 'Authorizes simulated response containment action');
  assert(Boolean(responseResult.audit_entry), 'Creates immutable audit log entry');

  const auditLogs = db.getAuditLogs();
  assert(auditLogs.some(log => log.incident_id === inc.id), 'Persists audit record in institutional database');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
