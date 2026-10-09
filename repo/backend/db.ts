/**
 * CYBERGUARD Relational & In-Memory Persistent Store
 * Handles Users, Identities, Trust Domains, Security Events, Incidents, and Audit Logs
 */

import fs from 'node:fs';
import path from 'node:path';
import { 
  TrustIdentity, 
  TrustDomain, 
  SecurityEvent, 
  Incident, 
  AuditLogEntry 
} from './types';

interface DatabaseState {
  identities: TrustIdentity[];
  domains: TrustDomain[];
  events: SecurityEvent[];
  incidents: Incident[];
  audit_logs: AuditLogEntry[];
  user_baselines: Record<string, {
    home_location: string;
    normal_device: string;
    active_hours: [number, number]; // [8, 22]
    normal_ip: string;
  }>;
}

const DB_FILE = path.resolve(process.cwd(), 'data/cyberguard_db.json');

const INITIAL_IDENTITIES: TrustIdentity[] = [
  {
    id: 'ID-001',
    name: 'Dr. S. K. Nayak',
    role: 'Registrar',
    department: 'Administration',
    official_email: 'registrar@pmec.ac.in',
    approved_domain: 'pmec.ac.in',
    approved_channels: ['institutional_email', 'official_portal'],
    sensitivity_level: 'EXECUTIVE',
    last_updated: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ID-002',
    name: 'Prof. B. C. Panda',
    role: 'Principal / Director',
    department: 'Office of the Principal',
    official_email: 'principal@pmec.ac.in',
    approved_domain: 'pmec.ac.in',
    approved_channels: ['institutional_email', 'formal_circular'],
    sensitivity_level: 'EXECUTIVE',
    last_updated: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ID-003',
    name: 'Examination Cell',
    role: 'Controller of Examinations',
    department: 'Examination Division',
    official_email: 'exam.cell@bput.ac.in',
    approved_domain: 'bput.ac.in',
    approved_channels: ['institutional_email', 'bputexam.in'],
    sensitivity_level: 'HIGH',
    last_updated: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ID-004',
    name: 'State Scholarship Section',
    role: 'Nodal Officer (Scholarships)',
    department: 'Student Affairs',
    official_email: 'scholarships@pmec.ac.in',
    approved_domain: 'pmec.ac.in',
    approved_channels: ['institutional_email', 'official_portal'],
    sensitivity_level: 'HIGH',
    last_updated: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ID-005',
    name: 'Campus IT Helpdesk',
    role: 'Systems Administrator',
    department: 'Computer Center',
    official_email: 'helpdesk@pmec.ac.in',
    approved_domain: 'pmec.ac.in',
    approved_channels: ['institutional_email', 'internal_tickets'],
    sensitivity_level: 'HIGH',
    last_updated: '2026-03-01T10:00:00Z'
  }
];

const INITIAL_DOMAINS: TrustDomain[] = [
  {
    id: 'DOM-001',
    domain: 'pmec.ac.in',
    organization: 'Parala Maharaja Engineering College (PMEC Berhampur)',
    status: 'OFFICIAL',
    is_primary: true,
    notes: 'Primary institutional domain'
  },
  {
    id: 'DOM-002',
    domain: 'bput.ac.in',
    organization: 'Biju Patnaik University of Technology (BPUT Odisha)',
    status: 'OFFICIAL',
    is_primary: true,
    notes: 'Affiliating state technical university'
  },
  {
    id: 'DOM-003',
    domain: 'bputexam.in',
    organization: 'BPUT Examination Portal',
    status: 'APPROVED_SERVICE',
    is_primary: false,
    notes: 'Approved student exam registration & results portal'
  },
  {
    id: 'DOM-004',
    domain: 'scholarship.odisha.gov.in',
    organization: 'Government of Odisha State Scholarship Portal',
    status: 'APPROVED_SERVICE',
    is_primary: false,
    notes: 'Verified state scholarship portal'
  }
];

const INITIAL_USER_BASELINES: Record<string, { home_location: string; normal_device: string; active_hours: [number, number]; normal_ip: string }> = {
  'student042': {
    home_location: 'Berhampur, Odisha, IN',
    normal_device: 'Chrome on macOS (MacBook Pro)',
    active_hours: [7, 23],
    normal_ip: '14.139.221.14' // NKN / ERNET academic IP range
  },
  'student108': {
    home_location: 'Bhubaneswar, Odisha, IN',
    normal_device: 'Firefox on Windows 11',
    active_hours: [8, 22],
    normal_ip: '14.139.221.45'
  },
  'faculty015': {
    home_location: 'Berhampur, Odisha, IN',
    normal_device: 'Safari on iPadOS',
    active_hours: [8, 20],
    normal_ip: '14.139.221.80'
  }
};

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private sanitizeState(state: DatabaseState): DatabaseState {
    // Deduplicate events by event_id
    const seenEventIds = new Set<string>();
    const cleanEvents: SecurityEvent[] = [];
    for (const evt of state.events || []) {
      if (!seenEventIds.has(evt.event_id)) {
        seenEventIds.add(evt.event_id);
        cleanEvents.push(evt);
      }
    }
    state.events = cleanEvents;

    // Deduplicate graph edges and nodes for every incident
    for (const inc of state.incidents || []) {
      if (inc.graph_edges) {
        const seenEdgeKeys = new Set<string>();
        const cleanEdges = [];
        for (const edge of inc.graph_edges) {
          const key = edge.id || `edge-${edge.source}-${edge.target}-${edge.relationship}`;
          if (!seenEdgeKeys.has(key)) {
            seenEdgeKeys.add(key);
            cleanEdges.push({ ...edge, id: key });
          }
        }
        inc.graph_edges = cleanEdges;
      }

      if (inc.graph_nodes) {
        const seenNodeIds = new Set<string>();
        const cleanNodes = [];
        for (const node of inc.graph_nodes) {
          if (!seenNodeIds.has(node.id)) {
            seenNodeIds.add(node.id);
            cleanNodes.push(node);
          }
        }
        inc.graph_nodes = cleanNodes;
      }
    }

    return state;
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const clean = this.sanitizeState(parsed);
        // Persist cleaned state immediately
        fs.writeFileSync(DB_FILE, JSON.stringify(clean, null, 2), 'utf-8');
        return clean;
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing default:', err);
    }

    return {
      identities: [...INITIAL_IDENTITIES],
      domains: [...INITIAL_DOMAINS],
      events: [],
      incidents: [],
      audit_logs: [],
      user_baselines: { ...INITIAL_USER_BASELINES }
    };
  }

  public save(): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  public resetToDefault(): void {
    this.state = {
      identities: [...INITIAL_IDENTITIES],
      domains: [...INITIAL_DOMAINS],
      events: [],
      incidents: [],
      audit_logs: [],
      user_baselines: { ...INITIAL_USER_BASELINES }
    };
    this.save();
  }

  // --- Trust Identities ---
  public getIdentities(): TrustIdentity[] {
    return [...this.state.identities];
  }

  public getIdentityById(id: string): TrustIdentity | undefined {
    return this.state.identities.find(i => i.id === id);
  }

  public findIdentityByNameOrRole(term: string): TrustIdentity | undefined {
    const lower = term.toLowerCase().trim();
    return this.state.identities.find(i => 
      i.name.toLowerCase().includes(lower) || 
      i.role.toLowerCase().includes(lower) ||
      lower.includes(i.role.toLowerCase()) ||
      i.official_email.toLowerCase() === lower ||
      i.official_email.toLowerCase().includes(lower)
    );
  }

  public addIdentity(identity: Omit<TrustIdentity, 'id' | 'last_updated'>): TrustIdentity {
    const maxNum = this.state.identities.reduce((max, i) => {
      const n = parseInt(i.id.replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newId = `ID-${String(maxNum + 1).padStart(3, '0')}`;
    const newEntry: TrustIdentity = {
      ...identity,
      id: newId,
      last_updated: new Date().toISOString()
    };
    this.state.identities.push(newEntry);
    this.save();
    return newEntry;
  }

  public updateIdentity(id: string, updates: Partial<TrustIdentity>): TrustIdentity | null {
    const index = this.state.identities.findIndex(i => i.id === id);
    if (index === -1) return null;
    this.state.identities[index] = {
      ...this.state.identities[index],
      ...updates,
      id, // Preserve original unique ID
      last_updated: new Date().toISOString()
    };
    this.save();
    return this.state.identities[index];
  }

  public deleteIdentity(id: string): boolean {
    const initialLen = this.state.identities.length;
    this.state.identities = this.state.identities.filter(i => i.id !== id);
    if (this.state.identities.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Trust Domains ---
  public getDomains(): TrustDomain[] {
    return [...this.state.domains];
  }

  public addDomain(domain: Omit<TrustDomain, 'id'>): TrustDomain {
    const maxNum = this.state.domains.reduce((max, d) => {
      const n = parseInt(d.id.replace(/\D/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newId = `DOM-${String(maxNum + 1).padStart(3, '0')}`;
    
    // If marked primary, unset any other primary domains
    if (domain.is_primary) {
      this.state.domains.forEach(d => { d.is_primary = false; });
    }

    const newEntry: TrustDomain = {
      ...domain,
      id: newId
    };
    this.state.domains.push(newEntry);
    this.save();
    return newEntry;
  }

  public updateDomain(id: string, updates: Partial<TrustDomain>): TrustDomain | null {
    const index = this.state.domains.findIndex(d => d.id === id);
    if (index === -1) return null;

    if (updates.is_primary) {
      this.state.domains.forEach(d => {
        if (d.id !== id) d.is_primary = false;
      });
    }

    this.state.domains[index] = {
      ...this.state.domains[index],
      ...updates,
      id // Preserve original unique ID
    };
    this.save();
    return this.state.domains[index];
  }

  public deleteDomain(id: string): boolean {
    const initialLen = this.state.domains.length;
    this.state.domains = this.state.domains.filter(d => d.id !== id);
    if (this.state.domains.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public getDomainByHost(domain: string): TrustDomain | undefined {
    const clean = domain.toLowerCase().trim();
    return this.state.domains.find(d => clean === d.domain.toLowerCase() || clean.endsWith('.' + d.domain.toLowerCase()));
  }

  public isOfficialDomain(domain: string): boolean {
    const clean = domain.toLowerCase().trim();
    return this.state.domains.some(d => 
      (d.status === 'OFFICIAL' || d.status === 'APPROVED_SERVICE') && 
      (clean === d.domain.toLowerCase() || clean.endsWith('.' + d.domain.toLowerCase()))
    );
  }

  public isRevokedDomain(domain: string): boolean {
    const clean = domain.toLowerCase().trim();
    return this.state.domains.some(d => 
      d.status === 'REVOKED' && 
      (clean === d.domain.toLowerCase() || clean.endsWith('.' + d.domain.toLowerCase()))
    );
  }

  // --- Events ---
  public getEvents(): SecurityEvent[] {
    return [...this.state.events];
  }

  public getEventById(id: string): SecurityEvent | undefined {
    return this.state.events.find(e => e.event_id === id);
  }

  public addEvent(event: SecurityEvent): SecurityEvent {
    const existingIndex = this.state.events.findIndex(e => e.event_id === event.event_id);
    if (existingIndex >= 0) {
      this.state.events[existingIndex] = event;
    } else {
      this.state.events.unshift(event);
    }
    this.save();
    return event;
  }

  // --- Incidents ---
  public getIncidents(): Incident[] {
    return [...this.state.incidents];
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.state.incidents.find(i => i.id === id);
  }

  public saveIncident(incident: Incident): Incident {
    // Ensure incident graph edges and nodes are deduplicated before saving
    if (incident.graph_edges) {
      const seenEdges = new Set<string>();
      incident.graph_edges = incident.graph_edges.filter(edge => {
        const key = edge.id || `edge-${edge.source}-${edge.target}-${edge.relationship}`;
        if (seenEdges.has(key)) return false;
        seenEdges.add(key);
        edge.id = key;
        return true;
      });
    }

    if (incident.graph_nodes) {
      const seenNodes = new Set<string>();
      incident.graph_nodes = incident.graph_nodes.filter(node => {
        if (seenNodes.has(node.id)) return false;
        seenNodes.add(node.id);
        return true;
      });
    }

    const idx = this.state.incidents.findIndex(i => i.id === incident.id);
    if (idx >= 0) {
      this.state.incidents[idx] = incident;
    } else {
      this.state.incidents.unshift(incident);
    }
    this.save();
    return incident;
  }

  public updateIncidentStatus(id: string, status: Incident['status']): Incident | undefined {
    const incident = this.state.incidents.find(i => i.id === id);
    if (incident) {
      incident.status = status;
      incident.updated_at = new Date().toISOString();
      this.save();
      return incident;
    }
    return undefined;
  }

  // --- User Baselines ---
  public getUserBaseline(userId: string) {
    return this.state.user_baselines[userId] || {
      home_location: 'Berhampur, Odisha, IN',
      normal_device: 'Desktop Browser',
      active_hours: [8, 22],
      normal_ip: '14.139.221.14'
    };
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.state.audit_logs];
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.state.audit_logs.unshift(newEntry);
    this.save();
    return newEntry;
  }
}

export const db = new Database();
