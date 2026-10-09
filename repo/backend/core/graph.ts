/**
 * CYBERGUARD - Digital Trust Graph Engine
 * Builds high-fidelity node-edge topology mapping entities and relationships
 * across human identities, social vectors, incident dossiers, and technical infrastructure.
 */

import { DigitalTrustNode, DigitalTrustEdge, SecurityEvent, SeverityLevel, Incident, TrustDomain, TrustIdentity } from '../types';

export function buildDigitalTrustGraph(
  events: SecurityEvent[],
  incidentId: string,
  incidentSeverity: SeverityLevel
): { nodes: DigitalTrustNode[]; edges: DigitalTrustEdge[] } {
  const nodeMap = new Map<string, DigitalTrustNode>();
  const edgeMap = new Map<string, DigitalTrustEdge>();

  const addEdge = (edge: DigitalTrustEdge) => {
    edgeMap.set(edge.id, edge);
  };

  // 1. Root Incident Node
  const incNodeId = `inc-${incidentId}`;
  nodeMap.set(incNodeId, {
    id: incNodeId,
    label: `Incident ${incidentId}`,
    type: 'Incident',
    risk: incidentSeverity,
    category: 'Incident',
    mitre_code: 'T1566',
    mitre_tactic: 'Phishing / Multi-Stage Campaign',
    risk_score: incidentSeverity === 'CRITICAL' ? 96 : incidentSeverity === 'HIGH' ? 82 : incidentSeverity === 'MEDIUM' ? 64 : 30,
    status: 'ACTIVE',
    metadata: { incident_id: incidentId, event_count: events.length }
  });

  events.forEach((evt) => {
    // 2. Determine Vector Node Type: QR, Audio/Deepfake, or Message
    const isQr = 
      evt.source === 'qr_decoder' || 
      evt.classification === 'qr_phishing' ||
      String(evt.classification).includes('qr');

    const isAudio = 
      evt.source === 'deepfake_audio' || 
      evt.source === 'deepfake_detector' ||
      evt.source === 'deepfake_video' ||
      String(evt.classification).includes('deepfake') ||
      String(evt.classification).includes('voice');

    const evtType: DigitalTrustNode['type'] = isQr ? 'QR' : isAudio ? 'Audio' : 'Message';
    const evtNodeId = `evt-${evt.event_id}`;

    let mitreCode = 'T1566.002';
    let mitreTactic = 'Initial Access (Spearphishing Link)';
    if (isQr) {
      mitreCode = 'T1566.003';
      mitreTactic = 'Initial Access (Quishing Physical Vector)';
    } else if (isAudio) {
      mitreCode = 'T1656';
      mitreTactic = 'Defense Evasion / Social Eng (Synthetic Voice)';
    }

    nodeMap.set(evtNodeId, {
      id: evtNodeId,
      label: `${evt.classification.replace(/_/g, ' ')} (#${evt.event_id})`,
      type: evtType,
      risk: evt.severity,
      category: 'Vector',
      mitre_code: mitreCode,
      mitre_tactic: mitreTactic,
      risk_score: evt.risk_score || (evt.severity === 'CRITICAL' ? 95 : evt.severity === 'HIGH' ? 80 : 50),
      status: 'ACTIVE',
      metadata: { 
        event_id: evt.event_id, 
        source: evt.source, 
        timestamp: evt.timestamp,
        indicators_count: evt.indicators?.length || 0,
        raw_text_snippet: evt.raw_input_summary || evt.entities?.url || ''
      }
    });

    addEdge({
      id: `edge-inc-${evt.event_id}`,
      source: evtNodeId,
      target: incNodeId,
      relationship: 'correlated_in',
      label: 'correlated into',
      category: 'causal',
      weight: 0.9
    });

    // 3. User Target Victim Entity
    if (evt.entities.user_id) {
      const userNodeId = `user-${evt.entities.user_id}`;
      if (!nodeMap.has(userNodeId)) {
        nodeMap.set(userNodeId, {
          id: userNodeId,
          label: `User: ${evt.entities.user_id}`,
          type: 'User',
          risk: evt.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          category: 'Human',
          mitre_code: 'T1087.002',
          mitre_tactic: 'Discovery (Compromised User Identity)',
          risk_score: evt.severity === 'CRITICAL' ? 92 : 78,
          status: 'ACTIVE',
          metadata: { user_id: evt.entities.user_id }
        });
      }
      addEdge({
        id: `edge-target-${evt.event_id}`,
        source: evtNodeId,
        target: userNodeId,
        relationship: 'targets',
        label: 'targets victim',
        category: 'flow',
        weight: 0.95
      });
    }

    // 4. Sender Entity
    if (evt.entities.sender) {
      const senderNodeId = `sender-${evt.entities.sender}`;
      if (!nodeMap.has(senderNodeId)) {
        nodeMap.set(senderNodeId, {
          id: senderNodeId,
          label: `Sender: ${evt.entities.sender}`,
          type: 'Sender',
          risk: evt.severity,
          category: 'Human',
          mitre_code: 'T1586.002',
          mitre_tactic: 'Resource Dev (Compromised / Malicious Sender)',
          risk_score: 88,
          status: 'ACTIVE',
          metadata: { sender_handle: evt.entities.sender }
        });
      }
      addEdge({
        id: `edge-sent-${evt.event_id}`,
        source: senderNodeId,
        target: evtNodeId,
        relationship: 'sent_by',
        label: isAudio ? 'transmits synthetic call' : isQr ? 'printed QR code' : 'dispatched lure',
        category: 'flow',
        weight: 0.85
      });
    }

    // 5. Impersonated Authority / Claimed Role
    if (evt.entities.claimed_identity) {
      const identNodeId = `ident-${evt.entities.claimed_identity.replace(/\s+/g, '_')}`;
      if (!nodeMap.has(identNodeId)) {
        nodeMap.set(identNodeId, {
          id: identNodeId,
          label: `Role: ${evt.entities.claimed_identity}`,
          type: 'Identity',
          risk: 'HIGH',
          category: 'Human',
          mitre_code: 'T1656',
          mitre_tactic: 'Impersonation (Spoofed Authority)',
          risk_score: 84,
          status: 'ACTIVE',
          metadata: { authority_role: evt.entities.claimed_identity }
        });
      }
      if (evt.entities.sender) {
        addEdge({
          id: `edge-claim-${evt.event_id}`,
          source: `sender-${evt.entities.sender}`,
          target: identNodeId,
          relationship: 'claims_identity',
          label: 'impersonates authority',
          category: 'identity',
          weight: 0.9
        });
      }
    }

    // 6. URL & Domain Infrastructure Entities
    if (evt.entities.url) {
      const urlNodeId = `url-${evt.entities.url.substring(0, 30)}`;
      if (!nodeMap.has(urlNodeId)) {
        nodeMap.set(urlNodeId, {
          id: urlNodeId,
          label: `URL: ${evt.entities.url.length > 25 ? evt.entities.url.substring(0, 25) + '...' : evt.entities.url}`,
          type: 'URL',
          risk: evt.severity,
          category: 'Infra',
          mitre_code: 'T1204.001',
          mitre_tactic: 'User Execution (Malicious Link)',
          risk_score: evt.severity === 'CRITICAL' ? 94 : 80,
          status: 'ACTIVE',
          metadata: { full_url: evt.entities.url }
        });
      }
      addEdge({
        id: `edge-contains-${evt.event_id}`,
        source: evtNodeId,
        target: urlNodeId,
        relationship: 'contains',
        label: isQr ? 'decodes to URL' : 'embeds link',
        category: 'infra',
        weight: 0.9
      });

      if (evt.entities.domain) {
        const domNodeId = `domain-${evt.entities.domain}`;
        if (!nodeMap.has(domNodeId)) {
          nodeMap.set(domNodeId, {
            id: domNodeId,
            label: `Domain: ${evt.entities.domain}`,
            type: 'Domain',
            risk: evt.severity,
            category: 'Infra',
            mitre_code: 'T1583.001',
            mitre_tactic: 'Resource Dev (Lookalike Domain Typosquat)',
            risk_score: 90,
            status: 'ACTIVE',
            metadata: { domain: evt.entities.domain }
          });
        }
        addEdge({
          id: `edge-redirect-${evt.event_id}`,
          source: urlNodeId,
          target: domNodeId,
          relationship: 'redirects_to',
          label: 'resolves to host',
          category: 'infra',
          weight: 0.85
        });
      }
    }

    // 7. IP Address & Device Client Fingerprint
    if (evt.entities.ip) {
      const ipNodeId = `ip-${evt.entities.ip}`;
      if (!nodeMap.has(ipNodeId)) {
        nodeMap.set(ipNodeId, {
          id: ipNodeId,
          label: `IP: ${evt.entities.ip}`,
          type: 'IP',
          risk: evt.severity,
          category: 'Infra',
          mitre_code: 'T1078.004',
          mitre_tactic: 'Defense Evasion (Impossible Travel / Tor C2)',
          risk_score: evt.severity === 'CRITICAL' ? 95 : 75,
          status: 'ACTIVE',
          metadata: { ip_address: evt.entities.ip }
        });
      }
      addEdge({
        id: `edge-login-${evt.event_id}`,
        source: evtNodeId,
        target: ipNodeId,
        relationship: 'logged_in_from',
        label: 'connection origin',
        category: 'infra',
        weight: 0.88
      });
    }

    if (evt.entities.device) {
      const devNodeId = `device-${evt.entities.device.substring(0, 20)}`;
      if (!nodeMap.has(devNodeId)) {
        nodeMap.set(devNodeId, {
          id: devNodeId,
          label: `Device: ${evt.entities.device.length > 20 ? evt.entities.device.substring(0, 20) + '...' : evt.entities.device}`,
          type: 'Device',
          risk: evt.severity,
          category: 'Infra',
          mitre_code: 'T1082',
          mitre_tactic: 'System Info (Adversary User-Agent)',
          risk_score: 70,
          status: 'ACTIVE',
          metadata: { device_fingerprint: evt.entities.device }
        });
      }
      addEdge({
        id: `edge-device-${evt.event_id}`,
        source: evtNodeId,
        target: devNodeId,
        relationship: 'uses_device',
        label: 'client fingerprint',
        category: 'infra',
        weight: 0.75
      });
    }
  });

  // Calculate blast radius for each node based on degree centrality
  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  const degreeMap = new Map<string, number>();
  edges.forEach(e => {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  });

  nodes.forEach(n => {
    n.blast_radius = degreeMap.get(n.id) || 1;
  });

  return { nodes, edges };
}

/**
 * Builds unified multi-incident enterprise perimeter graph
 * correlating cross-campaign threats across all active incidents.
 */
export function buildGlobalPerimeterGraph(
  incidents: Incident[],
  events: SecurityEvent[],
  domains?: TrustDomain[],
  identities?: TrustIdentity[]
): { nodes: DigitalTrustNode[]; edges: DigitalTrustEdge[]; summary: any } {
  const nodeMap = new Map<string, DigitalTrustNode>();
  const edgeMap = new Map<string, DigitalTrustEdge>();

  // 1. Anchor registered institutional infrastructure domains
  if (domains && domains.length > 0) {
    domains.forEach(d => {
      const domNodeId = `dom-${d.id}`;
      const isRevoked = d.status === 'REVOKED';
      const isApproved = d.status === 'APPROVED_SERVICE';
      nodeMap.set(domNodeId, {
        id: domNodeId,
        label: d.domain,
        type: 'Domain',
        category: 'Infra',
        risk: isRevoked ? 'CRITICAL' : isApproved ? 'LOW' : 'SAFE',
        status: isRevoked ? 'CONTAINED' : 'ACTIVE',
        risk_score: isRevoked ? 95 : isApproved ? 20 : 5,
        mitre_code: isRevoked ? 'T1583.001' : undefined,
        mitre_tactic: isRevoked ? 'Resource Development' : undefined,
        metadata: {
          domain_id: d.id,
          organization: d.organization,
          status: d.status,
          is_primary: d.is_primary,
          notes: d.notes,
          dns_records: d.dns_records,
          last_verified: d.last_verified
        }
      });
    });
  }

  // 2. Anchor registered institutional authorities & personas
  if (identities && identities.length > 0) {
    identities.forEach(ident => {
      const identNodeId = `identity-${ident.id}`;
      const isExec = ident.sensitivity_level === 'EXECUTIVE';
      const isHigh = ident.sensitivity_level === 'HIGH';
      nodeMap.set(identNodeId, {
        id: identNodeId,
        label: `${ident.name} (${ident.role})`,
        type: 'Identity',
        category: 'Human',
        risk: isExec ? 'HIGH' : isHigh ? 'MEDIUM' : 'SAFE',
        status: 'ACTIVE',
        risk_score: isExec ? 65 : isHigh ? 35 : 15,
        metadata: {
          identity_id: ident.id,
          name: ident.name,
          role: ident.role,
          department: ident.department,
          official_email: ident.official_email,
          approved_domain: ident.approved_domain,
          sensitivity_level: ident.sensitivity_level,
          approved_channels: ident.approved_channels
        }
      });

      // Link authority persona to their approved domain node
      if (domains) {
        const targetDomain = domains.find(d => 
          d.domain.toLowerCase() === ident.approved_domain.toLowerCase() ||
          ident.approved_domain.toLowerCase().endsWith('.' + d.domain.toLowerCase())
        );
        if (targetDomain) {
          const domNodeId = `dom-${targetDomain.id}`;
          edgeMap.set(`edge-auth-${ident.id}-${targetDomain.id}`, {
            id: `edge-auth-${ident.id}-${targetDomain.id}`,
            source: identNodeId,
            target: domNodeId,
            relationship: 'authorized_on',
            label: 'institutional email domain'
          });
        }
      }
    });
  }

  // 3. Populate incident-specific subgraphs
  incidents.forEach(inc => {
    const incGraph = buildDigitalTrustGraph(
      events.filter(e => inc.event_ids.includes(e.event_id)),
      inc.id,
      inc.severity
    );

    incGraph.nodes.forEach(n => {
      if (!nodeMap.has(n.id)) {
        nodeMap.set(n.id, n);
      }
    });

    incGraph.edges.forEach(e => {
      if (!edgeMap.has(e.id)) {
        edgeMap.set(e.id, e);
      }
    });
  });

  // Also include ambient events not yet bundled into an incident
  const assignedEventIds = new Set(incidents.flatMap(i => i.event_ids));
  const unassignedEvents = events.filter(e => !assignedEventIds.has(e.event_id));

  unassignedEvents.forEach(evt => {
    const evtNodeId = `evt-${evt.event_id}`;
    const isQr = evt.source === 'qr_decoder' || evt.classification === 'qr_phishing' || String(evt.classification).includes('qr');
    const isAudio = evt.source === 'deepfake_audio' || evt.source === 'deepfake_detector' || String(evt.classification).includes('deepfake');

    if (!nodeMap.has(evtNodeId)) {
      nodeMap.set(evtNodeId, {
        id: evtNodeId,
        label: `${evt.classification.replace(/_/g, ' ')} (#${evt.event_id})`,
        type: isQr ? 'QR' : isAudio ? 'Audio' : 'Message',
        risk: evt.severity,
        category: 'Vector',
        mitre_code: isQr ? 'T1566.003' : isAudio ? 'T1656' : 'T1566.002',
        mitre_tactic: 'Initial Access',
        risk_score: evt.risk_score || 50,
        status: 'ACTIVE',
        metadata: { event_id: evt.event_id, source: evt.source, timestamp: evt.timestamp }
      });
    }

    if (evt.entities.user_id) {
      const uId = `user-${evt.entities.user_id}`;
      if (!nodeMap.has(uId)) {
        nodeMap.set(uId, {
          id: uId,
          label: `User: ${evt.entities.user_id}`,
          type: 'User',
          risk: evt.severity,
          category: 'Human',
          status: 'ACTIVE'
        });
      }
      edgeMap.set(`edge-target-${evt.event_id}`, {
        id: `edge-target-${evt.event_id}`,
        source: evtNodeId,
        target: uId,
        relationship: 'targets',
        label: 'targets victim'
      });
    }
  });

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  // Compute blast radius
  const degreeMap = new Map<string, number>();
  edges.forEach(e => {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  });
  nodes.forEach(n => {
    n.blast_radius = degreeMap.get(n.id) || 1;
  });

  const summary = {
    total_nodes: nodes.length,
    total_edges: edges.length,
    critical_nodes: nodes.filter(n => n.risk === 'CRITICAL').length,
    high_nodes: nodes.filter(n => n.risk === 'HIGH').length,
    human_entities: nodes.filter(n => n.category === 'Human').length,
    vector_entities: nodes.filter(n => n.category === 'Vector').length,
    infra_entities: nodes.filter(n => n.category === 'Infra').length,
    incidents_count: incidents.length
  };

  return { nodes, edges, summary };
}

