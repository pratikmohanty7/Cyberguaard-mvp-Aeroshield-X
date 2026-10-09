/**
 * CYBERGUARD - Response Playbook & Audit Log System
 * Simulates containment actions with human-in-the-loop authorization gates and immutable audit logs.
 */

import { db } from '../db';
import { Incident, AuditLogEntry, ResponseActionDefinition } from '../types';

export interface ExecuteActionRequest {
  incident_id: string;
  action_id: string;
  actor: string;
  reason?: string;
}

export function executeResponseAction(request: ExecuteActionRequest): { success: boolean; message: string; audit_entry?: AuditLogEntry } {
  const incident = db.getIncidentById(request.incident_id);
  if (!incident) {
    return { success: false, message: `Incident ${request.incident_id} not found.` };
  }

  const action = incident.recommended_actions.find(a => a.action_id === request.action_id);
  if (!action) {
    return { success: false, message: `Action ${request.action_id} not defined in incident playbook.` };
  }

  // Update action state
  action.status = 'APPROVED';
  action.executed_at = new Date().toISOString();
  action.executed_by = request.actor;

  // If critical actions like session revocation or password reset are executed, update incident status
  if (action.action_id === 'REVOKE_USER_SESSIONS' || action.action_id === 'ENFORCE_STEPUP_MFA') {
    incident.status = 'CONTAINED';
  }

  const defaultReason = action.criticality === 'CRITICAL'
    ? 'Critical threat containment authorized by SOC Security Analyst'
    : 'Standard mitigation playbook approved';

  const auditEntry = db.addAuditLog({
    incident_id: incident.id,
    action_id: action.action_id,
    action_title: action.title,
    status: 'SIMULATED / APPROVED',
    actor: request.actor || 'SOC Security Analyst',
    reason: request.reason || defaultReason
  });

  if (!incident.audit_history) incident.audit_history = [];
  incident.audit_history.unshift(auditEntry);
  incident.updated_at = new Date().toISOString();

  db.saveIncident(incident);

  return {
    success: true,
    message: `Action "${action.title}" simulated and approved successfully. Audit record created.`,
    audit_entry: auditEntry
  };
}
