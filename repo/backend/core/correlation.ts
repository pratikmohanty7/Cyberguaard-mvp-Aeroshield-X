/**
 * CYBERGUARD - Incident Correlation & Attack Campaign Escalation Engine
 * Correlates Human Layer (phishing, impersonation, QR) with Technology Layer (auth anomalies, password spraying, ATO)
 * into a single unified institutional incident with an escalating attack chain.
 */

import { SecurityEvent, Incident, ResponseActionDefinition, Indicator } from '../types';
import { db } from '../db';
import { computeCalibratedRisk } from './risk';
import { buildDigitalTrustGraph } from './graph';

export function correlateEventsIntoIncidents(): Incident[] {
  const allEvents = db.getEvents();
  if (allEvents.length === 0) return db.getIncidents();

  // Group events by target user or correlated entity
  const userClusters = new Map<string, SecurityEvent[]>();

  for (const evt of allEvents) {
    const targetKey = evt.entities.user_id || evt.entities.target_email || 'institutional_perimeter';
    if (!userClusters.has(targetKey)) {
      userClusters.set(targetKey, []);
    }
    userClusters.get(targetKey)!.push(evt);
  }

  const generatedIncidents: Incident[] = [];

  for (const [targetUser, clusterEvents] of userClusters.entries()) {
    // Only correlate if there is at least one non-safe threat
    // Deduplicate cluster events by event_id to prevent duplicate processing
    const seenEvtIds = new Set<string>();
    const threatEvents: SecurityEvent[] = [];
    for (const e of clusterEvents) {
      if (e.severity !== 'SAFE' && !seenEvtIds.has(e.event_id)) {
        seenEvtIds.add(e.event_id);
        threatEvents.push(e);
      }
    }
    if (threatEvents.length === 0) continue;

    const existingIncident = db.getIncidents().find(inc => inc.target_user === targetUser);
    const incidentId = existingIncident ? existingIncident.id : `CG-${String(db.getIncidents().length + 1).padStart(4, '0')}`;

    // Collect all unique indicators across correlated events
    const allIndicators: Indicator[] = [];
    const seenIndicatorIds = new Set<string>();
    const mitreTechniques = new Set<string>();
    const attackStages: string[] = [];

    // Check for attack campaign stages
    let hasPhishing = false;
    let hasLookalike = false;
    let hasQr = false;
    let hasImpersonation = false;
    let hasDeepfake = false;
    let hasCredentialLure = false;
    let hasAuthAnomaly = false;
    let hasPasswordSpraying = false;
    let hasImpossibleTravel = false;
    let hasAto = false;

    for (const evt of threatEvents) {
      evt.incident_id = incidentId;
      for (const ind of evt.indicators) {
        if (!seenIndicatorIds.has(ind.id)) {
          seenIndicatorIds.add(ind.id);
          allIndicators.push(ind);
        }
      }
      evt.mitre.forEach(m => mitreTechniques.add(m));

      if (evt.classification === 'credential_phishing') hasPhishing = true;
      if (evt.classification === 'lookalike_domain') hasLookalike = true;
      if (evt.classification === 'qr_phishing') hasQr = true;
      if (evt.classification === 'executive_impersonation') hasImpersonation = true;
      if (evt.classification === 'deepfake_audio' || evt.classification === 'deepfake_video' || evt.classification === 'synthetic_voice_clone' || evt.source === 'deepfake_detector' || evt.source === 'deepfake_audio' || evt.source === 'deepfake_video') {
        hasDeepfake = true;
      }
      if (evt.classification === 'password_spraying') hasPasswordSpraying = true;
      if (evt.classification === 'impossible_travel') hasImpossibleTravel = true;
      if (evt.classification === 'account_takeover_risk') hasAto = true;
      if (evt.indicators.some(i => i.id === 'CREDENTIAL_HARVESTING_LURE' || i.id === 'OTP_SOLICITATION')) {
        hasCredentialLure = true;
      }
      if (evt.source === 'auth_guard') hasAuthAnomaly = true;
    }

    if (hasPhishing || hasQr) attackStages.push('Initial Phishing Vector');
    if (hasLookalike) attackStages.push('Look-Alike Institutional Domain Deployment');
    if (hasDeepfake) attackStages.push('Synthetic Deepfake Voice/Video Impersonation');
    if (hasImpersonation) attackStages.push('Executive Role Impersonation');
    if (hasCredentialLure) attackStages.push('Credential & OTP Solicitation');
    if (hasPasswordSpraying) attackStages.push('Distributed Password Spraying');
    if (hasImpossibleTravel || hasAuthAnomaly) attackStages.push('Abnormal Authentication Drift');
    if (hasAto) attackStages.push('Account Takeover & Session Compromise');

    // Context for risk calculation
    const hasExecutive = threatEvents.some(e => e.entities.claimed_role?.toLowerCase().includes('principal') || e.entities.claimed_role?.toLowerCase().includes('registrar'));

    const riskResult = computeCalibratedRisk(allIndicators, {
      is_executive_target: hasExecutive,
      is_protected_identity: hasImpersonation,
      has_credential_intent: hasCredentialLure,
      has_otp_intent: allIndicators.some(i => i.id === 'OTP_SOLICITATION'),
      has_impossible_travel: hasImpossibleTravel,
      has_password_spraying: hasPasswordSpraying,
      has_lookalike_domain: hasLookalike,
      correlated_events_count: threatEvents.length
    });

    // Build the Digital Trust Graph
    const graph = buildDigitalTrustGraph(threatEvents, incidentId, riskResult.severity);

    // Standard Response Playbook definition
    const recommendedActions: ResponseActionDefinition[] = [];

    if (riskResult.severity === 'CRITICAL' || hasAto) {
      if (hasDeepfake) {
        recommendedActions.push(
          {
            action_id: 'QUARANTINE_SYNTHETIC_BROADCAST',
            title: 'Quarantine Synthetic Voice / Video Broadcast',
            description: 'Issue institutional broadcast advisory countering synthetic media spoofing and block VoIP/media channels',
            criticality: 'CRITICAL',
            status: 'RECOMMENDED'
          },
          {
            action_id: 'VERIFY_OUT_OF_BAND_VOICE',
            title: 'Enforce Dual-Custodian In-Person Verification',
            description: 'Require physical or cryptographic token authorization before processing any financial, treasury, or exam policy directives',
            criticality: 'CRITICAL',
            status: 'RECOMMENDED'
          }
        );
      }
      recommendedActions.push(
        {
          action_id: 'REVOKE_USER_SESSIONS',
          title: 'Revoke Active User Sessions',
          description: `Forcefully invalidate active SSO and JWT web session tokens for user ${targetUser}`,
          criticality: 'CRITICAL',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'ENFORCE_STEPUP_MFA',
          title: 'Require Step-Up Hardware MFA',
          description: 'Lock account pending out-of-band verification and require FIDO2 / authenticator MFA reset',
          criticality: 'CRITICAL',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'BLOCK_SPOOFED_DOMAINS',
          title: 'Add Look-Alike Domains to Institutional DNS Sinkhole',
          description: 'Propagate deceptive look-alike domains to campus perimeter firewall and DNS sinkholes',
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'QUARANTINE_CAMPAIGN_MESSAGES',
          title: 'Quarantine Cross-Channel Campaign Inbound Mail',
          description: 'Retract received phishing lures from all student and staff inboxes campus-wide',
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'NOTIFY_CAMPUS_SECURITY_OFFICER',
          title: 'Notify Campus Cyber Defense Incident Response Team',
          description: 'Transmit structured evidence dossier and timeline to SOC security administrators',
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        }
      );
    } else if (riskResult.severity === 'HIGH') {
      recommendedActions.push(
        {
          action_id: 'BLOCK_SPOOFED_DOMAINS',
          title: 'Add Look-Alike Domains to Institutional DNS Sinkhole',
          description: 'Block malicious domain resolution across campus network',
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'WARN_TARGETED_USER',
          title: 'Dispatch Out-of-Band Warning to Targeted Account',
          description: `Send institutional SMS alert to ${targetUser} alerting them of active social engineering targeting`,
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        },
        {
          action_id: 'FLAG_UNAPPROVED_CHANNEL',
          title: 'Add Unapproved Sender to Threat Registry',
          description: 'Tag sender address as known impersonator in institutional trust directory',
          criticality: 'STANDARD',
          status: 'RECOMMENDED'
        }
      );
    } else {
      recommendedActions.push({
        action_id: 'LOG_TELEMETRY',
        title: 'Retain Observability Telemetry',
        description: 'Log anomalous pattern for continuous institutional baselining',
        criticality: 'STANDARD',
        status: 'RECOMMENDED'
      });
    }

    // Preserve any existing action approvals from previous saves
    if (existingIncident) {
      for (const rec of recommendedActions) {
        const prev = existingIncident.recommended_actions.find(a => a.action_id === rec.action_id);
        if (prev) {
          rec.status = prev.status;
          rec.executed_at = prev.executed_at;
          rec.executed_by = prev.executed_by;
        }
      }
    }

    const title = threatEvents.length > 2
      ? `Coordinated Digital Trust Attack targeting ${targetUser}`
      : `${threatEvents[0].classification.replace(/_/g, ' ').toUpperCase()} targeting ${targetUser}`;

    const incident: Incident = {
      id: incidentId,
      title,
      status: existingIncident ? existingIncident.status : 'NEW',
      severity: riskResult.severity,
      risk_score: riskResult.score,
      created_at: existingIncident ? existingIncident.created_at : threatEvents[0].timestamp,
      updated_at: new Date().toISOString(),
      target_user: targetUser,
      target_identity: threatEvents.find(e => e.entities.claimed_identity)?.entities.claimed_identity,
      summary: `Correlated ${threatEvents.length} security events across Human and Technical layers. Attack chain spans ${attackStages.join(' → ')}. Current institutional risk is ${riskResult.severity} (${riskResult.score}/100).`,
      event_ids: threatEvents.map(e => e.event_id),
      attack_stages: attackStages,
      indicators: allIndicators,
      mitre: Array.from(mitreTechniques),
      graph_nodes: graph.nodes,
      graph_edges: graph.edges,
      recommended_actions: recommendedActions,
      audit_history: existingIncident ? existingIncident.audit_history : []
    };

    db.saveIncident(incident);
    generatedIncidents.push(incident);
  }

  return generatedIncidents;
}
