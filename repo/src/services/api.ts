/**
 * CYBERGUARD API Client & Offline Service Layer
 * Communicates with backend endpoints with resilient offline fallback.
 */

import { 
  SecurityEvent, 
  Incident, 
  TrustIdentity, 
  TrustDomain, 
  AuditLogEntry, 
  EvaluationMetrics,
  DigitalTrustNode,
  DigitalTrustEdge
} from '../types';

export const api = {
  // Analyze Message
  analyzeMessage: async (text: string, userId = 'student042', engine = 'hybrid'): Promise<any> => {
    const res = await fetch('/api/analyze/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user_id: userId, engine })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze URL
  analyzeUrl: async (url: string, userId = 'student042', engine = 'hybrid'): Promise<any> => {
    const res = await fetch('/api/analyze/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId, engine })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze QR
  analyzeQr: async (qrPayload: string, userId = 'student042'): Promise<any> => {
    const res = await fetch('/api/analyze/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_payload: qrPayload, user_id: userId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze Identity
  analyzeIdentity: async (data: {
    claimed_identity?: string;
    claimed_role?: string;
    sender_address: string;
    communication_channel: string;
    message_content: string;
    user_id?: string;
  }): Promise<any> => {
    const res = await fetch('/api/analyze/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze Auth Logs
  analyzeAuthLogs: async (logsOrCsv: { logs?: any[]; csv_content?: string; user_id?: string }): Promise<any> => {
    const res = await fetch('/api/analyze/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logsOrCsv)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze Fake Login
  analyzeFakeLogin: async (data: {
    claimed_brand?: string;
    observed_url: string;
    html_snippet?: string;
    has_login_form?: boolean;
    fields_present?: string[];
    form_action_target?: string;
    user_id?: string;
  }): Promise<any> => {
    const res = await fetch('/api/analyze/fake-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Analyze Deepfake Audio & Video
  analyzeDeepfake: async (data: {
    modality: 'audio' | 'video' | 'multimodal_av';
    title?: string;
    target_authority?: string;
    media_url?: string;
    file_name?: string;
    transcript?: string;
    audio_base64?: string;
    video_base64?: string;
    acoustic_features?: any;
    visual_features?: any;
    raw_samples?: number[];
    engine?: string;
    user_id?: string;
  }): Promise<any> => {
    const res = await fetch('/api/analyze/deepfake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Get Events
  getEvents: async (): Promise<SecurityEvent[]> => {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.events || [];
  },

  // Get Incidents
  getIncidents: async (): Promise<Incident[]> => {
    const res = await fetch('/api/incidents');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.incidents || [];
  },

  // Get Incident by ID
  getIncidentById: async (id: string): Promise<Incident | null> => {
    const res = await fetch(`/api/incidents/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.incident || null;
  },

  // Update Incident Status
  updateIncidentStatus: async (id: string, status: Incident['status']): Promise<Incident> => {
    const res = await fetch(`/api/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.incident;
  },

  // Execute Response Action
  executeResponseAction: async (incidentId: string, actionId: string, actor = 'SOC Security Analyst', reason?: string): Promise<any> => {
    const res = await fetch(`/api/incidents/${incidentId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, actor, reason })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Topology Endpoints
  getTopology: async (incidentId?: string): Promise<{
    success: boolean;
    scope: 'global' | 'incident';
    incident_id?: string;
    nodes: DigitalTrustNode[];
    edges: DigitalTrustEdge[];
    summary: any;
    available_incidents: { id: string; title: string; severity: string }[];
  }> => {
    const query = incidentId ? `?incident_id=${encodeURIComponent(incidentId)}` : '';
    const res = await fetch(`/api/topology${query}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  containTopologyNode: async (nodeId: string, action = 'ISOLATE_ASSET'): Promise<any> => {
    const res = await fetch('/api/topology/node/contain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, action })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Trust Registry
  getTrustRegistry: async (): Promise<{ identities: TrustIdentity[]; domains: TrustDomain[] }> => {
    const res = await fetch('/api/trust-registry');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  addIdentity: async (identity: Partial<TrustIdentity>): Promise<TrustIdentity> => {
    const res = await fetch('/api/trust-registry/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identity)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.identity;
  },

  deleteIdentity: async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/trust-registry/identity/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success;
  },

  updateIdentity: async (id: string, identity: Partial<TrustIdentity>): Promise<TrustIdentity> => {
    const res = await fetch(`/api/trust-registry/identity/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identity)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.identity;
  },

  addDomain: async (domain: Partial<TrustDomain>): Promise<TrustDomain> => {
    const res = await fetch('/api/trust-registry/domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domain)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.domain;
  },

  updateDomain: async (id: string, domain: Partial<TrustDomain>): Promise<TrustDomain> => {
    const res = await fetch(`/api/trust-registry/domain/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(domain)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.domain;
  },

  deleteDomain: async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/trust-registry/domain/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success;
  },

  verifyDomainLive: async (id: string): Promise<{ domain: TrustDomain; inspection: any }> => {
    const res = await fetch(`/api/trust-registry/domain/${id}/verify-live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  inspectDomain: async (domain: string): Promise<any> => {
    const res = await fetch('/api/trust-registry/domain-inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.inspection;
  },

  exportTrustRegistry: async (): Promise<any> => {
    const res = await fetch('/api/trust-registry/export');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  importTrustRegistry: async (payload: { domains?: any[]; identities?: any[] }): Promise<any> => {
    const res = await fetch('/api/trust-registry/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Simulations
  simulateCampaign: async (): Promise<any> => {
    const res = await fetch('/api/simulate/campaign', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  simulateCampaignForDomain: async (domainId: string, personaId?: string): Promise<any> => {
    const res = await fetch('/api/simulate/campaign-for-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_id: domainId, persona_id: personaId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  simulateSafeNotice: async (): Promise<any> => {
    const res = await fetch('/api/simulate/safe-notice', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  resetDatabase: async (): Promise<any> => {
    const res = await fetch('/api/simulate/reset', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  // Evaluation
  getEvaluation: async (): Promise<EvaluationMetrics> => {
    const res = await fetch('/api/evaluation');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.evaluation;
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.audit_logs || [];
  },

  // Grounded Copilot Query
  queryCopilot: async (query: string, incidentId?: string): Promise<{ answer: string; citations?: string[]; grounded_incident_id?: string; grounded_indicators_count?: number }> => {
    const res = await fetch('/api/copilot/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, incident_id: incidentId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }
};
