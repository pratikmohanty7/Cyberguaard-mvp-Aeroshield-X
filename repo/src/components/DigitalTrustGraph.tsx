import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DigitalTrustNode, DigitalTrustEdge, SeverityLevel } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { 
  ShieldAlert, 
  User, 
  Globe, 
  Laptop, 
  Key, 
  Link as LinkIcon, 
  Radio, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  CheckCircle, 
  Maximize2, 
  Minimize2, 
  Download, 
  Move, 
  ArrowRight, 
  ShieldCheck, 
  Ban, 
  Crosshair, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Flame, 
  Copy, 
  Activity, 
  Zap, 
  Compass, 
  FileCode, 
  Volume2, 
  Shield, 
  Eye, 
  Server,
  MessageSquare,
  QrCode,
  SlidersHorizontal,
  ChevronRight,
  X
} from 'lucide-react';

interface DigitalTrustGraphProps {
  nodes: DigitalTrustNode[];
  edges: DigitalTrustEdge[];
  height?: number;
  initialSelectedId?: string;
  onContainNode?: (nodeId: string, action: string) => void;
}

export type LayoutPreset = 'KILL_CHAIN' | 'FORCE_DIRECTED' | 'RADIAL_ORBIT' | 'CLUSTER_MESH';

// 5 Kill-Chain Attack Stages for the Interactive Playback / Step-through
interface KillChainPhase {
  id: number;
  name: string;
  tag: string;
  description: string;
  matchingNodeTypes: DigitalTrustNode['type'][];
}

const KILL_CHAIN_PHASES: KillChainPhase[] = [
  {
    id: 1,
    name: 'Adversary Inception',
    tag: 'Adversary Layer',
    description: 'Adversary establishes external origin and crafts impersonated institutional authority lures.',
    matchingNodeTypes: ['Sender', 'Identity']
  },
  {
    id: 2,
    name: 'Vector Delivery & Payloads',
    tag: 'Delivery Layer',
    description: 'Weaponized SMS/WhatsApp communication, bulletin QR codes, synthetic voice calls, and links.',
    matchingNodeTypes: ['Message', 'QR', 'Audio', 'URL']
  },
  {
    id: 3,
    name: 'Incident Correlation',
    tag: 'Correlation Engine',
    description: 'Correlation engine links social deception vectors with identity anomalies into an active threat dossier.',
    matchingNodeTypes: ['Incident']
  },
  {
    id: 4,
    name: 'Deceptive Infrastructure',
    tag: 'Infrastructure Layer',
    description: 'Attacker deploys look-alike domain (pmec-exam-support.com) and credential-harvesting endpoints.',
    matchingNodeTypes: ['Domain', 'IP', 'Device']
  },
  {
    id: 5,
    name: 'Account Takeover & Impact',
    tag: 'Victim & ATO Layer',
    description: 'Harvested student credentials trigger impossible travel and unauthorized administrative session access.',
    matchingNodeTypes: ['User']
  }
];

export const DigitalTrustGraph: React.FC<DigitalTrustGraphProps> = ({
  nodes,
  edges,
  height = 640,
  initialSelectedId,
  onContainNode
}) => {
  const [selectedNode, setSelectedNode] = useState<DigitalTrustNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<(DigitalTrustEdge & { uniqueKey: string }) | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<'ALL' | 'VECTORS' | 'IDENTITIES' | 'INFRASTRUCTURE' | 'INCIDENTS'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL_HIGH' | 'CRITICAL_ONLY'>('ALL');
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('KILL_CHAIN');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudTab, setHudTab] = useState<'TELEMETRY' | 'NEIGHBORS' | 'PLAYBOOK'>('TELEMETRY');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [containedNodeIds, setContainedNodeIds] = useState<Set<string>>(new Set());
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Force simulation state
  const [forcePositions, setForcePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isPhysicsRunning, setIsPhysicsRunning] = useState<boolean>(true);

  // Interactive Attack Step-through / Walkthrough Playback state
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0); // 0 = all phases active, 1..5 = specific phase isolated
  const [isPlayingWalkthrough, setIsPlayingWalkthrough] = useState(false);

  // Dragging states
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; nodeX: number; nodeY: number } | null>(null);
  
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generous virtual canvas dimensions for crisp spacing
  const canvasWidth = 1480;
  const canvasHeight = isFullscreen ? 960 : Math.max(height, 700);

  // Initialize selected node if provided
  useEffect(() => {
    if (initialSelectedId && nodes?.length) {
      const match = nodes.find(n => n.id === initialSelectedId);
      if (match) setSelectedNode(match);
    }
  }, [initialSelectedId, nodes]);

  // Handle escape key for fullscreen / deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNode) setSelectedNode(null);
        if (selectedEdge) setSelectedEdge(null);
        if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, isFullscreen]);

  // Autoplay timer for attack path walkthrough
  useEffect(() => {
    let timer: any;
    if (isPlayingWalkthrough && walkthroughActive) {
      timer = setTimeout(() => {
        setActivePhaseIndex(prev => {
          if (prev >= KILL_CHAIN_PHASES.length) {
            setIsPlayingWalkthrough(false);
            return 1;
          }
          return prev + 1;
        });
      }, 2400);
    }
    return () => clearTimeout(timer);
  }, [isPlayingWalkthrough, walkthroughActive, activePhaseIndex]);

  // Deduplicate and filter unique nodes
  const uniqueNodes = useMemo(() => {
    const seen = new Set<string>();
    const list: (DigitalTrustNode & { uniqueKey: string })[] = [];
    (nodes || []).forEach((n, idx) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = n.label.toLowerCase().includes(q);
        const matchesId = n.id.toLowerCase().includes(q);
        const matchesType = n.type.toLowerCase().includes(q);
        const matchesMitre = n.mitre_code?.toLowerCase().includes(q) || false;
        if (!matchesLabel && !matchesId && !matchesType && !matchesMitre) return;
      }

      // Filter by Layer Category
      if (filterType === 'VECTORS' && !(n.type === 'Message' || n.type === 'QR' || n.type === 'Audio' || n.type === 'URL')) return;
      if (filterType === 'IDENTITIES' && !(n.type === 'User' || n.type === 'Identity' || n.type === 'Sender')) return;
      if (filterType === 'INFRASTRUCTURE' && !(n.type === 'Domain' || n.type === 'IP' || n.type === 'Device')) return;
      if (filterType === 'INCIDENTS' && n.type !== 'Incident') return;

      // Filter by Severity
      if (severityFilter === 'CRITICAL_ONLY' && n.risk !== 'CRITICAL') return;
      if (severityFilter === 'CRITICAL_HIGH' && !(n.risk === 'CRITICAL' || n.risk === 'HIGH')) return;

      const nodeKey = n.id ? `node-${n.id}` : `node-${n.type}-${idx}`;
      if (!seen.has(nodeKey)) {
        seen.add(nodeKey);
        list.push({ ...n, uniqueKey: nodeKey });
      }
    });
    return list;
  }, [nodes, searchQuery, filterType, severityFilter]);

  // Deduplicate edges by unique composite key
  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>();
    const list: (DigitalTrustEdge & { uniqueKey: string })[] = [];
    const validNodeIds = new Set(uniqueNodes.map(n => n.id));

    (edges || []).forEach((edge, idx) => {
      if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) return;

      const key = `${edge.id || 'edge'}__${edge.source}__${edge.target}__${edge.relationship || idx}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...edge, uniqueKey: key });
      }
    });
    return list;
  }, [edges, uniqueNodes]);

  // Category counts for HUD header
  const counts = useMemo(() => {
    const total = nodes?.length || 0;
    const vectors = (nodes || []).filter(n => n.type === 'Message' || n.type === 'QR' || n.type === 'Audio' || n.type === 'URL').length;
    const identities = (nodes || []).filter(n => n.type === 'User' || n.type === 'Identity' || n.type === 'Sender').length;
    const infra = (nodes || []).filter(n => n.type === 'Domain' || n.type === 'IP' || n.type === 'Device').length;
    const incidents = (nodes || []).filter(n => n.type === 'Incident').length;
    const critical = (nodes || []).filter(n => n.risk === 'CRITICAL').length;
    return { total, vectors, identities, infra, incidents, critical };
  }, [nodes]);

  // Compute base layout coordinates with multi-column lanes so nodes NEVER squish
  const basePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    if (uniqueNodes.length === 0) return pos;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    if (layoutPreset === 'KILL_CHAIN') {
      // Sophisticated 7-Track Swimlane Architecture:
      // Track 0: Adversaries & Spoofed Identity (x ~ 140)
      // Track 1: Phishing Messages (x ~ 340)
      // Track 2: Quishing QR & Deepfake Audio (x ~ 520)
      // Track 3: Weaponized URLs (x ~ 700)
      // Track 4: Incidents Correlation Core (x ~ 890)
      // Track 5: Malicious Infrastructure Domains/IP/Device (x ~ 1080)
      // Track 6: Targeted Victims / ATO (x ~ 1280)

      const tracks: Record<number, typeof uniqueNodes> = {
        0: [], // Sender, Identity
        1: [], // Message
        2: [], // QR, Audio
        3: [], // URL
        4: [], // Incident
        5: [], // Domain, IP, Device
        6: []  // User
      };

      uniqueNodes.forEach(node => {
        if (node.type === 'Sender' || node.type === 'Identity') {
          tracks[0].push(node);
        } else if (node.type === 'Message') {
          tracks[1].push(node);
        } else if (node.type === 'QR' || node.type === 'Audio') {
          tracks[2].push(node);
        } else if (node.type === 'URL') {
          tracks[3].push(node);
        } else if (node.type === 'Incident') {
          tracks[4].push(node);
        } else if (node.type === 'Domain' || node.type === 'IP' || node.type === 'Device') {
          tracks[5].push(node);
        } else {
          tracks[6].push(node);
        }
      });

      const trackXs = [140, 340, 520, 710, 900, 1100, 1310];

      [0, 1, 2, 3, 4, 5, 6].forEach(trackIdx => {
        const items = tracks[trackIdx];
        const count = items.length;
        if (count === 0) return;

        // If a track has many items (e.g., > 10 messages), split into 2 sub-columns
        if (count > 11) {
          const half = Math.ceil(count / 2);
          const colA = items.slice(0, half);
          const colB = items.slice(half);

          const spacingA = Math.max(54, (canvasHeight - 220) / Math.max(colA.length - 1, 1));
          colA.forEach((node, i) => {
            pos[node.id] = {
              x: trackXs[trackIdx] - 45,
              y: 110 + i * spacingA
            };
          });

          const spacingB = Math.max(54, (canvasHeight - 220) / Math.max(colB.length - 1, 1));
          colB.forEach((node, i) => {
            pos[node.id] = {
              x: trackXs[trackIdx] + 45,
              y: 120 + i * spacingB
            };
          });
        } else {
          const availableHeight = canvasHeight - 220;
          const spacing = count > 1 ? Math.min(100, availableHeight / (count - 1)) : 0;
          const startY = count === 1 ? centerY : (canvasHeight - (count - 1) * spacing) / 2;

          items.forEach((node, i) => {
            pos[node.id] = {
              x: trackXs[trackIdx],
              y: count === 1 ? centerY : startY + i * spacing
            };
          });
        }
      });
    } else if (layoutPreset === 'RADIAL_ORBIT') {
      // Concentric 3-Tier Galaxy Layout
      const incidentNodes = uniqueNodes.filter(n => n.type === 'Incident');
      const humanNodes = uniqueNodes.filter(n => n.type === 'User' || n.type === 'Identity' || n.type === 'Sender');
      const vectorNodes = uniqueNodes.filter(n => n.type === 'Message' || n.type === 'QR' || n.type === 'Audio' || n.type === 'URL');
      const infraNodes = uniqueNodes.filter(n => n.type === 'Domain' || n.type === 'IP' || n.type === 'Device');

      // Center: Incidents
      incidentNodes.forEach((node, idx) => {
        const offset = (idx - (incidentNodes.length - 1) / 2) * 90;
        pos[node.id] = { x: centerX + offset, y: centerY };
      });

      // Orbit 1: Humans & Identities (Radius 220)
      const r1 = 220;
      const step1 = humanNodes.length > 0 ? (2 * Math.PI) / humanNodes.length : 0;
      humanNodes.forEach((node, i) => {
        const angle = i * step1 - Math.PI / 2;
        pos[node.id] = {
          x: centerX + r1 * Math.cos(angle),
          y: centerY + r1 * Math.sin(angle)
        };
      });

      // Orbit 2: Attack Vectors (Radius 380)
      const r2 = 380;
      const step2 = vectorNodes.length > 0 ? (2 * Math.PI) / vectorNodes.length : 0;
      vectorNodes.forEach((node, i) => {
        const angle = i * step2 - Math.PI / 3;
        pos[node.id] = {
          x: centerX + r2 * Math.cos(angle),
          y: centerY + r2 * Math.sin(angle)
        };
      });

      // Orbit 3: Infrastructure (Radius 520)
      const r3 = 520;
      const step3 = infraNodes.length > 0 ? (2 * Math.PI) / infraNodes.length : 0;
      infraNodes.forEach((node, i) => {
        const angle = i * step3;
        pos[node.id] = {
          x: centerX + r3 * Math.cos(angle),
          y: centerY + r3 * Math.sin(angle)
        };
      });
    } else if (layoutPreset === 'CLUSTER_MESH') {
      // 4 Floating Enterprise Constellations
      const humanNodes = uniqueNodes.filter(n => n.type === 'User' || n.type === 'Identity' || n.type === 'Sender');
      const vectorNodes = uniqueNodes.filter(n => n.type === 'Message' || n.type === 'QR' || n.type === 'Audio');
      const urlNodes = uniqueNodes.filter(n => n.type === 'URL');
      const techNodes = uniqueNodes.filter(n => n.type === 'Domain' || n.type === 'IP' || n.type === 'Device');
      const incidentNodes = uniqueNodes.filter(n => n.type === 'Incident');

      // Human Constellation (Top Left: cx=320, cy=240)
      humanNodes.forEach((node, i) => {
        const angle = (i * 2 * Math.PI) / Math.max(humanNodes.length, 1);
        pos[node.id] = {
          x: 320 + 130 * Math.cos(angle),
          y: 240 + 100 * Math.sin(angle)
        };
      });

      // Vector Constellation (Bottom Left: cx=380, cy=640)
      vectorNodes.forEach((node, i) => {
        const angle = (i * 2 * Math.PI) / Math.max(vectorNodes.length, 1);
        pos[node.id] = {
          x: 380 + 170 * Math.cos(angle),
          y: 640 + 120 * Math.sin(angle)
        };
      });

      // Center Core: Incidents & URLs
      incidentNodes.forEach((node, i) => {
        pos[node.id] = { x: centerX, y: centerY + (i % 2 === 0 ? -40 : 40) };
      });
      urlNodes.forEach((node, i) => {
        pos[node.id] = {
          x: centerX + (i % 2 === 0 ? -120 : 120),
          y: centerY + (i * 45) - 60
        };
      });

      // Technical Infrastructure Constellation (Right: cx=1140, cy=460)
      techNodes.forEach((node, i) => {
        const angle = (i * 2 * Math.PI) / Math.max(techNodes.length, 1);
        pos[node.id] = {
          x: 1140 + 180 * Math.cos(angle),
          y: 460 + 140 * Math.sin(angle)
        };
      });
    } else {
      // FORCE_DIRECTED initial circle seed
      uniqueNodes.forEach((n, idx) => {
        const angle = (idx / uniqueNodes.length) * 2 * Math.PI;
        const radius = 280 + (idx % 3) * 70;
        pos[n.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
    }

    return pos;
  }, [uniqueNodes, layoutPreset, canvasWidth, canvasHeight]);

  // Run dynamic force physics when in FORCE_DIRECTED mode
  useEffect(() => {
    if (layoutPreset !== 'FORCE_DIRECTED' || !isPhysicsRunning) return;

    let current = { ...forcePositions };
    if (Object.keys(current).length === 0) {
      current = { ...basePositions };
    }

    let animFrame: number;
    let iteration = 0;
    const maxIterations = 80;

    const simulateStep = () => {
      if (iteration >= maxIterations) return;
      iteration++;

      const next = { ...current };
      const kRepulse = 52000;
      const kSpring = 0.035;
      const idealEdgeLen = 160;
      const damping = 0.88;

      const ids = Object.keys(next);

      // Repulsion between all node pairs
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const idA = ids[i];
          const idB = ids[j];
          const pA = next[idA];
          const pB = next[idB];
          if (!pA || !pB) continue;

          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = kRepulse / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            pA.x -= fx * damping;
            pA.y -= fy * damping;
            pB.x += fx * damping;
            pB.y += fy * damping;
          }
        }
      }

      // Attraction along connected edges
      uniqueEdges.forEach(edge => {
        const pSource = next[edge.source];
        const pTarget = next[edge.target];
        if (!pSource || !pTarget) return;

        const dx = pTarget.x - pSource.x;
        const dy = pTarget.y - pSource.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - idealEdgeLen;
        const force = displacement * kSpring;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        pSource.x += fx * damping;
        pSource.y += fy * damping;
        pTarget.x -= fx * damping;
        pTarget.y -= fy * damping;
      });

      // Keep within canvas bounds
      ids.forEach(id => {
        const p = next[id];
        if (p) {
          p.x = Math.max(90, Math.min(canvasWidth - 90, p.x));
          p.y = Math.max(90, Math.min(canvasHeight - 90, p.y));
        }
      });

      setForcePositions(next);
      animFrame = requestAnimationFrame(simulateStep);
    };

    animFrame = requestAnimationFrame(simulateStep);
    return () => cancelAnimationFrame(animFrame);
  }, [layoutPreset, isPhysicsRunning, basePositions, uniqueEdges, canvasWidth, canvasHeight]);

  // Merged positions with custom dragged coordinates
  const positions = useMemo(() => {
    const base = layoutPreset === 'FORCE_DIRECTED' && Object.keys(forcePositions).length > 0 
      ? forcePositions 
      : basePositions;

    const merged = { ...base };
    Object.entries(customPositions).forEach(([id, custom]) => {
      if (merged[id]) {
        merged[id] = custom;
      }
    });
    return merged;
  }, [basePositions, forcePositions, customPositions, layoutPreset]);

  // Check if a node belongs to the currently active walkthrough phase
  const isNodeInActivePhase = useCallback((node: DigitalTrustNode) => {
    if (!walkthroughActive || activePhaseIndex === 0) return true;
    const phase = KILL_CHAIN_PHASES.find(p => p.id === activePhaseIndex);
    if (!phase) return true;
    return phase.matchingNodeTypes.includes(node.type);
  }, [walkthroughActive, activePhaseIndex]);

  // Compute connected subgraphs for active hover or selection
  const activeFocus = useMemo(() => {
    const focusedId = hoveredNodeId || selectedNode?.id;
    if (!focusedId) return null;

    const connectedNeighbors = new Set<string>();
    const connectedEdgeIds = new Set<string>();

    connectedNeighbors.add(focusedId);

    uniqueEdges.forEach(edge => {
      if (edge.source === focusedId || edge.target === focusedId) {
        connectedEdgeIds.add(edge.uniqueKey);
        connectedNeighbors.add(edge.source);
        connectedNeighbors.add(edge.target);
      }
    });

    return {
      focusedId,
      neighbors: connectedNeighbors,
      edges: connectedEdgeIds
    };
  }, [hoveredNodeId, selectedNode, uniqueEdges]);

  // Get neighboring nodes for inspector drawer
  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    const neighbors: { node: DigitalTrustNode; relationship: string; direction: 'outgoing' | 'incoming' }[] = [];

    uniqueEdges.forEach(edge => {
      if (edge.source === selectedNode.id) {
        const targetNode = uniqueNodes.find(n => n.id === edge.target);
        if (targetNode) {
          neighbors.push({
            node: targetNode,
            relationship: edge.relationship || edge.label || 'connected',
            direction: 'outgoing'
          });
        }
      } else if (edge.target === selectedNode.id) {
        const sourceNode = uniqueNodes.find(n => n.id === edge.source);
        if (sourceNode) {
          neighbors.push({
            node: sourceNode,
            relationship: edge.relationship || edge.label || 'connected',
            direction: 'incoming'
          });
        }
      }
    });

    return neighbors;
  }, [selectedNode, uniqueEdges, uniqueNodes]);

  // Color & icon mapping for node entities
  const getNodeVisuals = (type: DigitalTrustNode['type'], risk: SeverityLevel) => {
    let icon = <LinkIcon className="w-4 h-4 text-slate-300" />;
    let typeName: string = type;
    let baseColor = '#0EA5E9'; // Sky / Cyan

    switch (type) {
      case 'Incident':
        icon = <ShieldAlert className="w-5 h-5 text-rose-400" />;
        typeName = 'Correlated Threat Incident';
        baseColor = '#F43F5E';
        break;
      case 'User':
        icon = <User className="w-4 h-4 text-sky-400" />;
        typeName = 'Target Student / Identity';
        baseColor = '#38BDF8';
        break;
      case 'Identity':
        icon = <Key className="w-4 h-4 text-amber-400" />;
        typeName = 'Impersonated Official Role';
        baseColor = '#F59E0B';
        break;
      case 'Sender':
        icon = <Radio className="w-4 h-4 text-rose-400" />;
        typeName = 'Adversary Gateway Origin';
        baseColor = '#FB7185';
        break;
      case 'URL':
        icon = <Globe className="w-4 h-4 text-orange-400" />;
        typeName = 'Weaponized Hyperlink';
        baseColor = '#EA580C';
        break;
      case 'Domain':
        icon = <Server className="w-4 h-4 text-amber-400" />;
        typeName = 'Spoofed Host Domain';
        baseColor = '#D97706';
        break;
      case 'IP':
        icon = <Laptop className="w-4 h-4 text-purple-400" />;
        typeName = 'Adversary Ingress IP';
        baseColor = '#A855F7';
        break;
      case 'Device':
        icon = <Laptop className="w-4 h-4 text-indigo-400" />;
        typeName = 'Fingerprinted Client Client';
        baseColor = '#6366F1';
        break;
      case 'QR':
        icon = <QrCode className="w-4 h-4 text-fuchsia-400" />;
        typeName = 'Quishing Physical Matrix';
        baseColor = '#D946EF';
        break;
      case 'Audio':
        icon = <Volume2 className="w-4 h-4 text-purple-300" />;
        typeName = 'Synthetic Voice Vector';
        baseColor = '#C084FC';
        break;
      case 'Message':
        icon = <MessageSquare className="w-4 h-4 text-amber-400" />;
        typeName = 'Phishing Inbound Lure';
        baseColor = '#F59E0B';
        break;
    }

    let stroke = baseColor;
    let fill = '#0C1220';

    if (risk === 'CRITICAL') {
      stroke = '#F43F5E';
      fill = '#1F0B14';
    } else if (risk === 'HIGH') {
      stroke = '#EA580C';
      fill = '#1F1008';
    } else if (risk === 'MEDIUM') {
      stroke = '#F59E0B';
      fill = '#1F180A';
    } else if (risk === 'LOW') {
      stroke = '#38BDF8';
      fill = '#0B1726';
    } else {
      stroke = '#10B981';
      fill = '#0A1A12';
    }

    return { icon, typeName, stroke, fill, baseColor };
  };

  // Node Drag handlers
  const handleNodePointerDown = (nodeId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const pos = positions[nodeId];
    if (!pos) return;

    setDraggingNodeId(nodeId);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      nodeX: pos.x,
      nodeY: pos.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNodeId && dragStartRef.current) {
      const dx = (e.clientX - dragStartRef.current.clientX) / zoomScale;
      const dy = (e.clientY - dragStartRef.current.clientY) / zoomScale;

      const newX = Math.max(50, Math.min(canvasWidth - 50, dragStartRef.current.nodeX + dx));
      const newY = Math.max(50, Math.min(canvasHeight - 50, dragStartRef.current.nodeY + dy));

      setCustomPositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY }
      }));
    } else if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      dragStartRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y
    };
    setSelectedEdge(null);
  };

  // Reset all layout coordinates and zoom
  const handleResetLayout = () => {
    setCustomPositions({});
    setForcePositions({});
    setZoomScale(0.95);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNode(null);
    setSelectedEdge(null);
    setWalkthroughActive(false);
    setIsPlayingWalkthrough(false);
    setActivePhaseIndex(0);
  };

  // Auto-fit all nodes within the canvas
  const handleFitToScreen = () => {
    const validPos = Object.values(positions);
    if (validPos.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    validPos.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const padding = 120;
    const graphW = (maxX - minX) + padding * 2;
    const graphH = (maxY - minY) + padding * 2;

    const scaleX = canvasWidth / graphW;
    const scaleY = canvasHeight / graphH;
    const newScale = Math.min(1.3, Math.max(0.55, Math.min(scaleX, scaleY)));

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const newPanX = (canvasWidth / 2 - graphCenterX) * newScale;
    const newPanY = (canvasHeight / 2 - graphCenterY) * newScale;

    setZoomScale(+newScale.toFixed(2));
    setPanOffset({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Export topology as SVG
  const handleExportTopology = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CyberGuard_DigitalTrustGraph_${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionFeedback('Exported high-resolution vector SVG graph.');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Export topology as STIX-compatible JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify({
      version: '2.1',
      type: 'digital-trust-attack-graph',
      timestamp: new Date().toISOString(),
      nodes: uniqueNodes,
      edges: uniqueEdges
    }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CyberGuard_Topology_Dossier_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionFeedback('Exported structured STIX attack graph JSON dossier.');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Simulated SOC Playbook actions from HUD
  const handleExecutePlaybookAction = (actionTitle: string) => {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;

    if (actionTitle.includes('Isolate') || actionTitle.includes('Sinkhole') || actionTitle.includes('Contain')) {
      setContainedNodeIds(prev => new Set([...prev, nodeId]));
    }

    if (onContainNode) {
      onContainNode(nodeId, actionTitle);
    }

    setActionFeedback(`Executed: "${actionTitle}" for ${selectedNode.label}`);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleCopyIOC = (text: string) => {
    navigator.clipboard?.writeText(text);
    setActionFeedback(`Copied indicator "${text}" to clipboard.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Center on a specific node
  const handleJumpToNode = (node: DigitalTrustNode) => {
    setSelectedNode(node);
    const pos = positions[node.id];
    if (pos) {
      const targetPanX = (canvasWidth / 2 - pos.x) * zoomScale;
      const targetPanY = (canvasHeight / 2 - pos.y) * zoomScale;
      setPanOffset({ x: Math.round(targetPanX), y: Math.round(targetPanY) });
    }
  };

  const hoveredNode = hoveredNodeId ? uniqueNodes.find(n => n.id === hoveredNodeId) : null;
  const activePhaseData = KILL_CHAIN_PHASES.find(p => p.id === activePhaseIndex);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-[#06080F] border border-white/10 rounded-2xl overflow-hidden font-sans shadow-2xl select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
      }`}
      style={{ height: `${canvasHeight}px` }}
    >
      {/* Subtle Atmospheric Background Mesh */}
      <div className="absolute inset-0 bg-radial-gradient from-sky-500/5 via-transparent to-transparent pointer-events-none" />

      {/* 1. FLOATING TOP COMMAND DOCK (Glassmorphic) */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 bg-[#0A0E1A]/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          {/* Brand Insignia & Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-[#08090D] flex items-center justify-center font-bold shadow-sm shrink-0">
              <Layers className="w-4 h-4 text-[#08090D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xs sm:text-sm tracking-tight">Digital Trust Topology</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono border border-sky-500/30">
                  {uniqueNodes.length} NODES · {uniqueEdges.length} VECTORS
                </span>
              </div>
            </div>
          </div>

          {/* Layer Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#05070E]/80 p-1 rounded-xl border border-white/10 text-[11px] overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All', count: counts.total, color: 'text-white' },
              { id: 'IDENTITIES', label: 'Human', count: counts.identities, color: 'text-sky-300' },
              { id: 'VECTORS', label: 'Vectors', count: counts.vectors, color: 'text-amber-300' },
              { id: 'INFRASTRUCTURE', label: 'Infra', count: counts.infra, color: 'text-purple-300' },
              { id: 'INCIDENTS', label: 'Incidents', count: counts.incidents, color: 'text-rose-400' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[30px] ${
                  filterType === tab.id
                    ? 'bg-white text-[#08090D] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono ${filterType === tab.id ? 'text-[#08090D]' : tab.color}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search, Layout Presets, and Viewport Utilities */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search node or MITRE..."
                className="pl-8 pr-2.5 py-1.5 bg-[#05070E]/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 lg:w-48 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Layout Preset Buttons */}
            <div className="hidden lg:flex items-center gap-1 bg-[#05070E]/80 p-1 rounded-xl border border-white/10 text-[11px]">
              {[
                { id: 'KILL_CHAIN', label: 'Kill Chain' },
                { id: 'FORCE_DIRECTED', label: 'Physics' },
                { id: 'RADIAL_ORBIT', label: 'Radial' },
                { id: 'CLUSTER_MESH', label: 'Cluster' }
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setLayoutPreset(preset.id as LayoutPreset);
                    setCustomPositions({});
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap min-h-[28px] ${
                    layoutPreset === preset.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Attack Walkthrough Button */}
            <button
              onClick={() => {
                if (walkthroughActive) {
                  setWalkthroughActive(false);
                  setIsPlayingWalkthrough(false);
                  setActivePhaseIndex(0);
                } else {
                  setWalkthroughActive(true);
                  setActivePhaseIndex(1);
                  setIsPlayingWalkthrough(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                walkthroughActive
                  ? 'bg-rose-600 text-white shadow-rose-950/60 ring-1 ring-rose-400'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10'
              }`}
              title="Step-by-step kill-chain attack sequence animation"
            >
              <Flame className={`w-3.5 h-3.5 ${walkthroughActive ? 'text-amber-300' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">{walkthroughActive ? 'Exit Replay' : 'Attack Replay'}</span>
            </button>

            {/* Viewport Tools Dock */}
            <div className="flex items-center gap-1 bg-[#05070E]/80 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setZoomScale(s => Math.min(2.4, +(s + 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomScale(s => Math.max(0.4, +(s - 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFitToScreen}
                className="p-1.5 rounded-lg hover:bg-white/10 text-sky-400 hover:text-sky-300 transition-colors"
                title="Auto Fit Canvas"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetLayout}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Center & Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportTopology}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Export High-Res SVG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen War Room'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Floating Walkthrough Timeline Ribbon (if active) */}
        {walkthroughActive && (
          <div className="mt-2.5 p-2 sm:px-4 bg-[#0B0F19]/90 backdrop-blur-xl border border-rose-500/30 rounded-2xl shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              {/* Playback Controls */}
              <div className="flex items-center gap-1.5 bg-[#05070E] p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setIsPlayingWalkthrough(!isPlayingWalkthrough)}
                  className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center justify-center min-w-[28px]"
                  title={isPlayingWalkthrough ? 'Pause attack replay' : 'Play attack replay'}
                >
                  {isPlayingWalkthrough ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setIsPlayingWalkthrough(false);
                    setActivePhaseIndex(p => Math.max(1, p - 1));
                  }}
                  disabled={activePhaseIndex <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                  title="Step backward"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setIsPlayingWalkthrough(false);
                    setActivePhaseIndex(p => Math.min(KILL_CHAIN_PHASES.length, p + 1));
                  }}
                  disabled={activePhaseIndex >= KILL_CHAIN_PHASES.length}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                  title="Step forward"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stage Progress Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {KILL_CHAIN_PHASES.map(ph => {
                  const isActive = activePhaseIndex === ph.id;
                  const isPassed = activePhaseIndex > ph.id;
                  return (
                    <button
                      key={ph.id}
                      onClick={() => {
                        setIsPlayingWalkthrough(false);
                        setActivePhaseIndex(ph.id);
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-500 font-bold shadow-sm'
                          : isPassed
                          ? 'bg-slate-900/80 text-slate-300 border border-white/10'
                          : 'bg-[#05070E] text-slate-500 border border-white/5'
                      }`}
                    >
                      <span>0{ph.id}.</span>
                      <span>{ph.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Description Ticker */}
            {activePhaseData && (
              <div className="text-right text-[11px] text-slate-300 truncate max-w-lg hidden lg:block">
                <span className="text-rose-400 font-semibold font-mono mr-1.5">[{activePhaseData.tag}]</span>
                <span>{activePhaseData.description}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. MAIN INTERACTIVE SVG CANVAS */}
      <div 
        className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing bg-[#05070E]"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="w-full h-full select-none"
        >
          <defs>
            {/* Precision Cyber Grid */}
            <pattern id="cyber-soc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0E1424" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="1.2" fill="#1C2740" />
            </pattern>

            {/* Glow DropShadow Filters */}
            <filter id="glow-critical" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#F43F5E" floodOpacity="0.75" />
            </filter>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#38BDF8" floodOpacity="0.65" />
            </filter>
            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#F59E0B" floodOpacity="0.65" />
            </filter>
            <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#C084FC" floodOpacity="0.65" />
            </filter>

            {/* Directed Edge Arrowheads */}
            <marker
              id="edge-arrow"
              viewBox="0 0 10 10"
              refX="26"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#334155" />
            </marker>

            <marker
              id="edge-arrow-active"
              viewBox="0 0 10 10"
              refX="26"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38BDF8" />
            </marker>

            <marker
              id="edge-arrow-walkthrough"
              viewBox="0 0 10 10"
              refX="26"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#FB7185" />
            </marker>
          </defs>

          {/* Grid Background */}
          <rect width={canvasWidth} height={canvasHeight} fill="url(#cyber-soc-grid)" />

          {/* Master Viewport Pan/Zoom Container */}
          <g 
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomScale})`}
            style={{ 
              transformOrigin: `${canvasWidth / 2}px ${canvasHeight / 2}px`, 
              transition: isPanning || draggingNodeId ? 'none' : 'transform 0.22s ease-out' 
            }}
          >
            {/* Kill Chain Stage Column Headers (when in KILL_CHAIN layout) */}
            {layoutPreset === 'KILL_CHAIN' && (
              <g className="pointer-events-none opacity-40 select-none">
                {[
                  { x: 140, title: '01. Adversary Origin' },
                  { x: 340, title: '02A. Phishing Messages' },
                  { x: 520, title: '02B. Quishing & Voice' },
                  { x: 710, title: '02C. Weaponized Links' },
                  { x: 900, title: '03. Incident Core' },
                  { x: 1100, title: '04. Hostile Infrastructure' },
                  { x: 1310, title: '05. Target Impact / ATO' }
                ].map((col, idx) => (
                  <g key={idx}>
                    <line
                      x1={col.x}
                      y1={45}
                      x2={col.x}
                      y2={canvasHeight - 45}
                      stroke="#1E293B"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={col.x}
                      y={40}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {col.title}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Connected Directed Edges */}
            {uniqueEdges.map(edge => {
              const from = positions[edge.source];
              const to = positions[edge.target];
              if (!from || !to) return null;

              const isEdgeHighlighted =
                activeFocus?.edges.has(edge.uniqueKey) ||
                hoveredEdgeId === edge.uniqueKey ||
                selectedEdge?.uniqueKey === edge.uniqueKey;

              const sourceNode = uniqueNodes.find(n => n.id === edge.source);
              const targetNode = uniqueNodes.find(n => n.id === edge.target);

              const isEdgeInWalkthrough = walkthroughActive && sourceNode && targetNode && 
                (isNodeInActivePhase(sourceNode) || isNodeInActivePhase(targetNode));

              const isDimmed = (activeFocus && !isEdgeHighlighted) || 
                               (walkthroughActive && !isEdgeInWalkthrough && activePhaseIndex > 0);

              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              // Subtle curved path
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const curveOffset = Math.min(30, dist * 0.08);
              const controlX = midX - (dy / dist) * curveOffset;
              const controlY = midY + (dx / dist) * curveOffset;

              const pathData = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;

              return (
                <g 
                  key={edge.uniqueKey} 
                  className="transition-opacity duration-200 cursor-pointer"
                  style={{ opacity: isDimmed ? 0.12 : 1 }}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedEdge(edge);
                  }}
                  onMouseEnter={() => setHoveredEdgeId(edge.uniqueKey)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                >
                  {/* Invisible wide stroke for hover/click target */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                  />

                  {/* Base connector edge */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      isEdgeInWalkthrough 
                        ? '#FB7185' 
                        : isEdgeHighlighted 
                        ? '#38BDF8' 
                        : '#1E293B'
                    }
                    strokeWidth={isEdgeInWalkthrough || isEdgeHighlighted ? 2.5 : 1.3}
                    markerEnd={
                      isEdgeInWalkthrough 
                        ? 'url(#edge-arrow-walkthrough)' 
                        : isEdgeHighlighted 
                        ? 'url(#edge-arrow-active)' 
                        : 'url(#edge-arrow)'
                    }
                    className="transition-colors duration-150"
                  />

                  {/* Flow animation laser particles on active vector path */}
                  {(isEdgeHighlighted || isEdgeInWalkthrough) && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isEdgeInWalkthrough ? '#FDA4AF' : '#7DD3FC'}
                      strokeWidth="2.5"
                      strokeDasharray="6 8"
                      className="animate-flow-dash"
                    />
                  )}

                  {/* Relationship Label Pill */}
                  {edge.label && (
                    <g transform={`translate(${controlX}, ${controlY})`} className="pointer-events-none select-none">
                      <rect
                        x={-(edge.label.length * 3.2 + 8)}
                        y={-9}
                        width={edge.label.length * 6.4 + 16}
                        height={18}
                        rx="5"
                        fill={isEdgeInWalkthrough ? '#1F0B14' : isEdgeHighlighted ? '#081726' : '#090D18'}
                        stroke={isEdgeInWalkthrough ? '#FB7185' : isEdgeHighlighted ? '#38BDF8' : '#1E293B'}
                        strokeWidth="1"
                      />
                      <text
                        y={3.5}
                        textAnchor="middle"
                        fill={isEdgeInWalkthrough ? '#FDA4AF' : isEdgeHighlighted ? '#BAE6FD' : '#64748B'}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight={isEdgeHighlighted || isEdgeInWalkthrough ? '600' : '500'}
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Graph Nodes */}
            {uniqueNodes.map(node => {
              const pos = positions[node.id];
              if (!pos) return null;

              const isIncident = node.type === 'Incident';
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isNeighbor = activeFocus?.neighbors.has(node.id);
              const inActivePhase = isNodeInActivePhase(node);
              const isContained = containedNodeIds.has(node.id) || node.status === 'CONTAINED';

              const isDimmed = (activeFocus && !isNeighbor) || (walkthroughActive && !inActivePhase && activePhaseIndex > 0);

              const r = isIncident ? 30 : 21;
              const visuals = getNodeVisuals(node.type, node.risk);

              return (
                <g
                  key={node.uniqueKey}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  style={{ 
                    opacity: isDimmed ? 0.15 : 1,
                    transition: draggingNodeId === node.id ? 'none' : 'opacity 0.2s ease, transform 0.15s ease'
                  }}
                  onPointerDown={e => handleNodePointerDown(node.id, e)}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    setSelectedEdge(null);
                    setIsInspectorOpen(true);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Outer Pulsing Glow Aura on Hover / Selection / Walkthrough */}
                  {(isHovered || isSelected || (walkthroughActive && inActivePhase) || isIncident) && (
                    <circle
                      r={r + 8}
                      fill="none"
                      stroke={visuals.stroke}
                      strokeWidth="1.5"
                      opacity="0.75"
                      className="animate-pulse"
                      filter={node.risk === 'CRITICAL' ? 'url(#glow-critical)' : 'url(#glow-cyan)'}
                    />
                  )}

                  {/* Outer Selection Rotating Dashed Ring */}
                  {isSelected && (
                    <circle
                      r={r + 4}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Contained Ring */}
                  {isContained && (
                    <circle
                      r={r + 5}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Main Node Body Circle */}
                  <circle
                    r={r}
                    fill={visuals.fill}
                    stroke={isSelected ? '#38BDF8' : isContained ? '#10B981' : visuals.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Entity Icon via foreignObject */}
                  <foreignObject
                    x={-r}
                    y={-r}
                    width={r * 2}
                    height={r * 2}
                    className="pointer-events-none"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {visuals.icon}
                    </div>
                  </foreignObject>

                  {/* Monospace Kicker (Type) */}
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill={isIncident ? '#FB7185' : '#94A3B8'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="600"
                    className="pointer-events-none uppercase tracking-wider select-none"
                  >
                    {isContained ? '[CONTAINED]' : node.type}
                  </text>

                  {/* Primary Node Label */}
                  <g transform={`translate(0, ${r + 26})`}>
                    <text
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="500"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 3. FLOATING NODE TELEMETRY TOOLTIP (Shows instantaneous insights on hover) */}
        {hoveredNode && !selectedNode && (
          <div className="absolute bottom-16 left-4 z-40 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/15 p-3.5 rounded-xl shadow-2xl pointer-events-none max-w-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-1.5">
              {getNodeVisuals(hoveredNode.type, hoveredNode.risk).icon}
              <span className="text-xs font-bold text-white">{hoveredNode.type} Entity</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <SeverityBadge severity={hoveredNode.risk} size="sm" />
            </div>
            <div className="text-xs font-semibold text-white truncate mb-1">
              {hoveredNode.label}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              {hoveredNode.mitre_code && <span>MITRE: <strong className="text-rose-400">{hoveredNode.mitre_code}</strong></span>}
              {hoveredNode.blast_radius !== undefined && <span>Blast Radius: <strong className="text-sky-300">{hoveredNode.blast_radius}</strong></span>}
            </div>
          </div>
        )}

        {/* 4. FLOATING MINIMAP (Lower-Right Corner) */}
        <div className="absolute bottom-3 right-3 z-30 hidden md:block bg-[#090D18]/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl pointer-events-auto">
          <div className="text-[9px] font-mono text-slate-400 mb-1 px-1 flex items-center justify-between">
            <span>PERIMETER MINIMAP</span>
            <span className="text-sky-400">{Math.round(zoomScale * 100)}%</span>
          </div>
          <svg width="130" height="80" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className="bg-[#05070E] rounded-lg border border-white/5">
            {/* Mini edges */}
            {uniqueEdges.map(e => {
              const from = positions[e.source];
              const to = positions[e.target];
              if (!from || !to) return null;
              return (
                <line
                  key={e.uniqueKey}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#1E293B"
                  strokeWidth="2"
                />
              );
            })}
            {/* Mini node dots */}
            {uniqueNodes.map(n => {
              const p = positions[n.id];
              if (!p) return null;
              const color = n.risk === 'CRITICAL' ? '#F43F5E' : n.risk === 'HIGH' ? '#EA580C' : '#38BDF8';
              return (
                <circle
                  key={n.uniqueKey}
                  cx={p.x}
                  cy={p.y}
                  r={n.type === 'Incident' ? 10 : 6}
                  fill={color}
                />
              );
            })}
          </svg>
        </div>

        {/* 5. FLOATING BOTTOM STATUS & LEGEND DOCK (Lower-Left Corner) */}
        <div className="absolute bottom-3 left-3 z-30 pointer-events-auto">
          <div className="flex flex-wrap items-center gap-3 px-3.5 py-2 bg-[#090D18]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl text-xs text-slate-400">
            <span className="text-[11px] font-semibold text-slate-300">Severity:</span>
            {[
              { label: 'Critical', color: 'bg-rose-500' },
              { label: 'High', color: 'bg-orange-500' },
              { label: 'Medium', color: 'bg-amber-500' },
              { label: 'Low', color: 'bg-sky-500' },
              { label: 'Safe', color: 'bg-emerald-500' }
            ].map(leg => (
              <div key={leg.label} className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${leg.color}`} />
                <span>{leg.label}</span>
              </div>
            ))}
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-[11px] text-slate-400">
              Layout: <strong className="text-slate-200 capitalize">{layoutPreset.replace('_', ' ').toLowerCase()}</strong>
            </span>
          </div>
        </div>

        {/* 6. FLOATING RIGHT-SIDE FORENSIC INSPECTOR PANEL */}
        {selectedNode && isInspectorOpen && (
          <div className="absolute top-20 right-3 bottom-14 w-84 sm:w-96 z-40 bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-y-auto p-5 transition-all animate-in fade-in slide-in-from-right-4 pointer-events-auto">
            {/* Header with Type & Close */}
            <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                {getNodeVisuals(selectedNode.type, selectedNode.risk).icon}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {getNodeVisuals(selectedNode.type, selectedNode.risk).typeName}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <SeverityBadge severity={selectedNode.risk} size="sm" />
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close entity telemetry"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Entity Label, ID & MITRE ATT&CK */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-white break-words leading-tight">
                {selectedNode.label}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: <strong className="text-sky-300">{selectedNode.id}</strong>
                </span>
                {selectedNode.mitre_code && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono">
                    MITRE: {selectedNode.mitre_code}
                  </span>
                )}
                {selectedNode.blast_radius !== undefined && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-500/40 text-sky-300 font-mono">
                    Blast Radius: {selectedNode.blast_radius}
                  </span>
                )}
              </div>
            </div>

            {/* Drawer Sub-Tabs: Telemetry, Topology Neighbors, Playbook Actions */}
            <div className="flex gap-1 p-1 bg-[#05070E] rounded-xl border border-white/10 mb-4 text-xs">
              <button
                onClick={() => setHudTab('TELEMETRY')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-colors ${
                  hudTab === 'TELEMETRY' ? 'bg-white text-[#08090D] font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Attributes
              </button>
              <button
                onClick={() => setHudTab('NEIGHBORS')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-colors ${
                  hudTab === 'NEIGHBORS' ? 'bg-white text-[#08090D] font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Vectors ({selectedNodeNeighbors.length})
              </button>
              <button
                onClick={() => setHudTab('PLAYBOOK')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-colors ${
                  hudTab === 'PLAYBOOK' ? 'bg-white text-[#08090D] font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                SOC Playbook
              </button>
            </div>

            {/* Tab 1: Raw Telemetry & Attributes */}
            {hudTab === 'TELEMETRY' && (
              <div className="space-y-3 mb-3">
                <div className="text-[11px] bg-[#05070E] p-3 rounded-xl border border-white/10 space-y-2 max-h-48 overflow-y-auto font-mono">
                  {selectedNode.mitre_tactic && (
                    <div className="flex justify-between gap-3 text-slate-300">
                      <span className="text-slate-400">mitre_tactic:</span>
                      <span className="text-amber-300 text-right truncate">{selectedNode.mitre_tactic}</span>
                    </div>
                  )}
                  {selectedNode.risk_score !== undefined && (
                    <div className="flex justify-between gap-3 text-slate-300">
                      <span className="text-slate-400">risk_score:</span>
                      <span className="text-rose-400 font-bold text-right">{selectedNode.risk_score} / 100</span>
                    </div>
                  )}
                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 ? (
                    Object.entries(selectedNode.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-slate-300">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-slate-200 truncate text-right">{String(v)}</span>
                      </div>
                    ))
                  ) : null}
                </div>

                <button
                  onClick={() => handleCopyIOC(selectedNode.label)}
                  className="w-full py-2 rounded-xl bg-[#05070E] border border-white/10 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Copy IOC Value</span>
                </button>
              </div>
            )}

            {/* Tab 2: Connected Neighbors */}
            {hudTab === 'NEIGHBORS' && (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {selectedNodeNeighbors.length > 0 ? (
                  selectedNodeNeighbors.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleJumpToNode(item.node)}
                      className="p-2.5 rounded-xl bg-[#05070E] hover:bg-white/10 border border-white/10 hover:border-sky-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono text-sky-400">
                          {item.direction === 'outgoing' ? '→' : '←'}
                        </span>
                        <span className="text-slate-200 truncate font-medium">{item.node.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 capitalize shrink-0 ml-2">
                        {item.relationship}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-500 italic p-3 text-center">
                    No directly attached adjacent entities in current filter mode.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: SOC Containment Playbook Actions */}
            {hudTab === 'PLAYBOOK' && (
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <button
                    onClick={() => handleExecutePlaybookAction('Isolate Host / Block IP Address')}
                    className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 font-semibold flex items-center gap-2 transition-colors text-left"
                  >
                    <Ban className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Isolate & Sever Network Routing</span>
                  </button>

                  <button
                    onClick={() => handleExecutePlaybookAction('Revoke Active OAuth / Session Tokens')}
                    className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:bg-amber-900/50 font-semibold flex items-center gap-2 transition-colors text-left"
                  >
                    <Key className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Revoke Active Session & OAuth</span>
                  </button>

                  <button
                    onClick={() => handleExecutePlaybookAction('Sinkhole Deceptive Domain & URL')}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold flex items-center gap-2 transition-colors text-left"
                  >
                    <Globe className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>Sinkhole Domain DNS Record</span>
                  </button>

                  <button
                    onClick={() => handleExecutePlaybookAction('Add Entity to Institutional Whitelist')}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold flex items-center gap-2 transition-colors text-left"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Whitelist Official Entity</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Alert */}
            {actionFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
