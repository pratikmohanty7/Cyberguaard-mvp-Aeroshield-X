import React, { useState, useEffect } from 'react';
import { DigitalTrustGraph } from '../components/DigitalTrustGraph';
import { api } from '../services/api';
import { Incident, SecurityEvent, DigitalTrustNode, DigitalTrustEdge } from '../types';
import { 
  Layers, 
  ShieldAlert, 
  Radio, 
  Activity, 
  RefreshCw, 
  Flame, 
  RotateCcw, 
  Crosshair, 
  Globe, 
  User, 
  AlertTriangle, 
  ExternalLink,
  CheckCircle,
  Compass,
  Zap,
  ShieldCheck,
  Share2
} from 'lucide-react';

interface TopologyPageProps {
  incidents: Incident[];
  events: SecurityEvent[];
  selectedIncidentId?: string;
  onSelectIncident: (id: string) => void;
  onSimulateCampaign: () => void;
  onResetSimulation: () => void;
}

export const TopologyPage: React.FC<TopologyPageProps> = ({
  incidents,
  events,
  selectedIncidentId,
  onSelectIncident,
  onSimulateCampaign,
  onResetSimulation
}) => {
  const [currentScope, setCurrentScope] = useState<string>(selectedIncidentId || 'GLOBAL');
  const [topologyData, setTopologyData] = useState<{
    nodes: DigitalTrustNode[];
    edges: DigitalTrustEdge[];
    summary?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | undefined>(undefined);
  const [directoryTab, setDirectoryTab] = useState<'VECTORS' | 'HUMANS' | 'INFRA' | 'INCIDENTS'>('VECTORS');

  // Sync selectedIncidentId prop if passed
  useEffect(() => {
    if (selectedIncidentId && selectedIncidentId !== currentScope) {
      setCurrentScope(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  // Fetch topology from backend endpoint
  const loadTopology = async (scopeId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getTopology(scopeId === 'GLOBAL' ? undefined : scopeId);
      if (res && res.nodes) {
        setTopologyData({
          nodes: res.nodes,
          edges: res.edges,
          summary: res.summary
        });
      }
    } catch (err: any) {
      console.warn('Fallback to local calculation on topology fetch error:', err);
      // Fallback: If local incident matches
      if (scopeId !== 'GLOBAL') {
        const inc = incidents.find(i => i.id === scopeId);
        if (inc && inc.graph_nodes) {
          setTopologyData({
            nodes: inc.graph_nodes,
            edges: inc.graph_edges || []
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTopology(currentScope);
  }, [currentScope, incidents.length, events.length]);

  const handleScopeChange = (newScope: string) => {
    setCurrentScope(newScope);
    if (newScope !== 'GLOBAL') {
      onSelectIncident(newScope);
    }
  };

  const handleContainNodeAction = async (nodeId: string, action: string) => {
    try {
      await api.containTopologyNode(nodeId, action);
      setToastMessage(`Policy enforced: Asset ${nodeId} marked as CONTAINED.`);
      setTimeout(() => setToastMessage(null), 4000);
      loadTopology(currentScope);
    } catch (err) {
      console.error('Failed to contain node:', err);
    }
  };

  const activeIncident = incidents.find(i => i.id === currentScope);

  const stats = {
    totalNodes: topologyData?.nodes.length || 0,
    totalVectors: topologyData?.edges.length || 0,
    criticalNodes: topologyData?.nodes.filter(n => n.risk === 'CRITICAL').length || 0,
    humanNodes: topologyData?.nodes.filter(n => n.type === 'User' || n.type === 'Identity' || n.type === 'Sender').length || 0,
    infraNodes: topologyData?.nodes.filter(n => n.type === 'Domain' || n.type === 'IP' || n.type === 'Device' || n.type === 'URL').length || 0
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Header Banner - iOS Frosted Glass Panel */}
      <div className="ios-glass-card p-6 sm:p-8 rounded-[26px] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase tracking-wider mb-2">
              <Layers className="w-4 h-4" />
              <span>Institutional Cyber Kill-Chain Graph Correlator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Digital Trust Topology
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Multi-dimensional graph engine mapping attack paths, credential harvesting infrastructure,
              quishing vectors, and blast radius propagation across PMEC academic perimeters.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                onSimulateCampaign();
                setTimeout(() => loadTopology(currentScope), 1500);
              }}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-slate-200 transition-all ios-pressable"
            >
              <Flame className="w-3.5 h-3.5 fill-current text-rose-500" />
              <span>Simulate Campaign</span>
            </button>

            <button
              onClick={() => {
                onResetSimulation();
                setTimeout(() => loadTopology(currentScope), 1000);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors ios-pressable"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Baseline</span>
            </button>

            <button
              onClick={() => loadTopology(currentScope)}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 text-xs transition-colors ios-pressable"
              title="Refresh topology"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scope Selector Ribbon - iOS Segmented Control */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Topology Scope:</span>
            
            <div className="ios-segmented-track p-1 flex flex-wrap gap-1 rounded-2xl border border-white/10">
              <button
                onClick={() => handleScopeChange('GLOBAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ios-pressable ${
                  currentScope === 'GLOBAL'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Global Institutional Perimeter
              </button>

              {incidents.map(inc => (
                <button
                  key={inc.id}
                  onClick={() => handleScopeChange(inc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ios-pressable ${
                    currentScope === inc.id
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    inc.severity === 'CRITICAL' ? 'bg-rose-500' : inc.severity === 'HIGH' ? 'bg-orange-500' : 'bg-sky-500'
                  }`} />
                  <span>{inc.id}: {inc.title.length > 24 ? inc.title.substring(0, 22) + '...' : inc.title}</span>
                </button>
              ))}
            </div>
          </div>

          {activeIncident && (
            <div className="text-xs font-mono text-slate-400">
              Correlated Severity: <strong className="text-rose-400 uppercase font-bold">{activeIncident.severity}</strong> ({activeIncident.risk_score}/100)
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid - iOS Squircle Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Correlated Nodes</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
            {stats.totalNodes}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Interlinked assets</div>
        </div>

        <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Attack Vectors</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
            {stats.totalVectors}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Direct relationships</div>
        </div>

        <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Critical Assets</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400 tabular-nums">
            {stats.criticalNodes}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Immediate containment</div>
        </div>

        <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Human & Role Entities</span>
            <User className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
            {stats.humanNodes}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Victims & impersonations</div>
        </div>

        <div className="ios-widget p-4 sm:p-5 rounded-[22px] shadow-lg">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Hostile Infrastructure</span>
            <Globe className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
            {stats.infraNodes}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Domains, IPs & endpoints</div>
        </div>
      </div>

      {/* Main Interactive Graph Viewport */}
      <div className="space-y-3">
        <DigitalTrustGraph
          nodes={topologyData?.nodes || []}
          edges={topologyData?.edges || []}
          height={680}
          initialSelectedId={focusedNodeId}
          onContainNode={handleContainNodeAction}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Institutional Entity & Vector Ledger Directory - iOS Widget Card */}
      <div className="ios-widget p-6 sm:p-8 rounded-[26px] shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Perimeter Entity & Vector Ledger Directory</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete index of all identified threats, vectors, compromised users, and technical infrastructure.
            </p>
          </div>

          {/* Directory Filter Tabs - iOS Segmented Control */}
          <div className="ios-segmented-track p-1 rounded-2xl border border-white/10 text-xs overflow-x-auto no-scrollbar">
            {[
              { id: 'VECTORS', label: 'All Vectors', count: stats.totalVectors },
              { id: 'HUMANS', label: 'Humans & Roles', count: stats.humanNodes },
              { id: 'INFRA', label: 'Hostile Infra', count: stats.infraNodes },
              { id: 'INCIDENTS', label: 'Threat Dossiers', count: incidents.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDirectoryTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ios-pressable ${
                  directoryTab === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Directory Ledger Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {topologyData?.nodes
            .filter(n => {
              if (directoryTab === 'VECTORS') return n.type === 'Message' || n.type === 'QR' || n.type === 'Audio' || n.type === 'URL';
              if (directoryTab === 'HUMANS') return n.type === 'User' || n.type === 'Identity' || n.type === 'Sender';
              if (directoryTab === 'INFRA') return n.type === 'Domain' || n.type === 'IP' || n.type === 'Device';
              return n.type === 'Incident';
            })
            .map(node => (
              <div 
                key={node.id} 
                className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 flex flex-col justify-between gap-3 transition-all shadow-sm group ios-pressable"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-semibold uppercase">
                      {node.type}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      node.risk === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      node.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                      node.risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}>
                      {node.risk}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors" title={node.label}>
                    {node.label}
                  </h4>

                  <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                    ID: {node.id}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    {node.blast_radius !== undefined && (
                      <span>Blast: <strong className="text-sky-300">{node.blast_radius}</strong></span>
                    )}
                    {node.mitre_code && (
                      <span>MITRE: <strong className="text-rose-400">{node.mitre_code}</strong></span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setFocusedNodeId(node.id);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="text-[11px] font-medium text-sky-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>Focus Graph</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* MITRE ATT&CK Mapping & Threat Intelligence Matrix */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span>MITRE ATT&CK Matrix Cross-Correlation</span>
          </div>
          <span className="text-slate-500 text-xs font-mono">Framework v14.1 Enterprise & Mobile</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            {
              id: 'T1566.002',
              tactic: 'Initial Access',
              name: 'Spearphishing Link',
              desc: 'SMS and email messages containing deceptive links targeting university student exam portal.',
              status: 'OBSERVED',
              count: topologyData?.nodes.filter(n => n.type === 'Message').length || 1
            },
            {
              id: 'T1566.003',
              tactic: 'Initial Access',
              name: 'Quishing Visual Matrix',
              desc: 'Malicious QR codes affixed to physical academic notice boards redirecting to credential harvesters.',
              status: 'OBSERVED',
              count: topologyData?.nodes.filter(n => n.type === 'QR').length || 1
            },
            {
              id: 'T1656',
              tactic: 'Defense Evasion',
              name: 'Impersonation / Synthetic Audio',
              desc: 'Voice deepfakes mimicking PMEC Examination Controller asking for emergency identity re-verification.',
              status: 'MITIGATED',
              count: topologyData?.nodes.filter(n => n.type === 'Audio').length || 1
            },
            {
              id: 'T1078.004',
              tactic: 'Defense Evasion',
              name: 'Impossible Travel / Valid Accounts',
              desc: 'Rapid geographical hops (e.g. Berhampur to Frankfurt within 12 minutes) using stolen credentials.',
              status: 'ISOLATED',
              count: topologyData?.nodes.filter(n => n.type === 'IP').length || 1
            }
          ].map(mitre => (
            <div key={mitre.id} className="p-3.5 rounded-lg bg-[#070913] border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-rose-400 font-semibold">{mitre.id}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  mitre.status === 'OBSERVED' 
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' 
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {mitre.status} ({mitre.count})
                </span>
              </div>
              <div className="font-medium text-slate-200">{mitre.name}</div>
              <div className="text-[11px] text-slate-400 leading-normal">{mitre.desc}</div>
              <div className="text-[10px] font-mono text-slate-500">Tactic: {mitre.tactic}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
