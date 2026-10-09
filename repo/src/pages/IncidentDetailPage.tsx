import React, { useState } from 'react';
import { Incident, SecurityEvent, ResponseActionDefinition } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskGauge } from '../components/RiskGauge';
import { DigitalTrustGraph } from '../components/DigitalTrustGraph';
import { AttackTimeline } from '../components/AttackTimeline';
import { EvidenceTable } from '../components/EvidenceTable';
import { AuditLogModal } from '../components/AuditLogModal';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Radio, 
  ExternalLink,
  Bot,
  Activity,
  Layers
} from 'lucide-react';

interface IncidentDetailPageProps {
  incident: Incident;
  events: SecurityEvent[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenCopilot: () => void;
}

export const IncidentDetailPage: React.FC<IncidentDetailPageProps> = ({
  incident,
  events,
  onBack,
  onRefresh,
  onOpenCopilot
}) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'timeline' | 'evidence' | 'playbook' | 'mitre' | 'audit'>('graph');
  const [actionToApprove, setActionToApprove] = useState<ResponseActionDefinition | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter correlated events
  const correlatedEvents = events.filter(e => incident.event_ids.includes(e.event_id));

  const handleUpdateStatus = async (newStatus: Incident['status']) => {
    setIsUpdatingStatus(true);
    try {
      await api.updateIncidentStatus(incident.id, newStatus);
      onRefresh();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmApproval = async (actionId: string, actor: string, reason: string) => {
    await api.executeResponseAction(incident.id, actionId, actor, reason);
    onRefresh();
  };

  const handleExportDossier = () => {
    setIsExporting(true);
    const content = `# CYBERGUARD INCIDENT DOSSIER: ${incident.id}
Generated: ${new Date().toISOString()}
Classification: CONFIDENTIAL INSTITUTIONAL TELEMETRY

## EXECUTIVE SUMMARY
Title: ${incident.title}
Target User: ${incident.target_user}
Status: ${incident.status}
Severity: ${incident.severity}
Risk Score: ${incident.risk_score} / 100

## SUMMARY
${incident.summary}

## CORRELATED ATTACK STAGES
${incident.attack_stages.map((st, i) => `${i + 1}. ${st}`).join('\n')}

## MITRE ATT&CK TECHNIQUES
${incident.mitre.join(', ')}

## VERIFIED EVIDENCE INDICATORS (${incident.indicators.length})
${incident.indicators.map(ind => `- [${ind.severity.toUpperCase()}] ${ind.name}: ${ind.description} (Source: ${ind.source})`).join('\n')}

---
Parala Maharaja Engineering College (PMEC Berhampur) Cyber Defense Council
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incident_${incident.id}_Dossier.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors min-h-[40px] self-start"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Back to Incidents Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDossier}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-mono border border-slate-700/80 bg-[#0D121F] text-slate-300 hover:text-white hover:border-slate-600 transition-all min-h-[40px]"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{isExporting ? 'Exporting...' : 'Export Dossier (.md)'}</span>
          </button>

          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-sky-500/40 bg-sky-950/30 text-sky-300 hover:bg-sky-900/40 transition-all glow-cyan min-h-[40px]"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>Ask Copilot regarding {incident.id}</span>
          </button>
        </div>
      </div>

      {/* Main Incident Dossier Header */}
      <div className="ios-glass-card p-6 sm:p-8 rounded-[26px] shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-sky-400 font-mono tracking-wider">{incident.id}</span>
              <SeverityBadge severity={incident.severity} size="md" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Lifecycle State:</span>
                <select
                  value={incident.status}
                  onChange={e => handleUpdateStatus(e.target.value as any)}
                  disabled={isUpdatingStatus}
                  className="bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono ios-pressable"
                >
                  <option value="NEW">NEW</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="CONTAINED">CONTAINED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
              {incident.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              {incident.summary}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span>Target Victim: <strong className="text-white font-mono">{incident.target_user}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Correlated Signals: <strong className="text-white font-mono">{incident.event_ids.length}</strong></span>
              <span className="text-slate-600">·</span>
              <span>First Seen: <strong className="text-slate-300 tabular-nums">{new Date(incident.created_at).toLocaleTimeString()}</strong></span>
            </div>
          </div>

          <div className="shrink-0 self-center lg:self-auto">
            <RiskGauge score={incident.risk_score} severity={incident.severity} size="lg" />
          </div>
        </div>

        {/* Attack Campaign Escalation Milestones */}
        <div className="mt-5 pt-4 border-t border-white/[0.08]">
          <div className="text-xs font-semibold text-slate-400 tracking-wider mb-2.5">
            Correlated Multi-Stage Attack Milestones:
          </div>
          <div className="flex flex-wrap gap-2">
            {incident.attack_stages.map((stage, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200"
              >
                <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold font-mono">
                  {idx + 1}
                </span>
                <span>{stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investigation Workspace Tabs - iOS Segmented Control */}
      <div className="ios-segmented-track p-1.5 flex overflow-x-auto no-scrollbar rounded-2xl w-full border border-white/10">
        {[
          { id: 'graph', label: 'Topology Graph', count: incident.graph_nodes?.length || 0 },
          { id: 'timeline', label: 'Timeline', count: incident.event_ids?.length || 0 },
          { id: 'evidence', label: 'Evidence Indicators', count: incident.indicators.length },
          { id: 'playbook', label: 'Response Playbook', count: incident.recommended_actions.length },
          { id: 'mitre', label: 'MITRE ATT&CK', count: incident.mitre.length },
          { id: 'audit', label: 'Audit Trail', count: incident.audit_history?.length || 0 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] transition-all shrink-0 flex items-center gap-1.5 ios-pressable ${
              activeTab === tab.id
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`text-[11px] font-mono ${activeTab === tab.id ? 'text-black/70' : 'text-slate-400'}`}>({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {/* 1. Attack Graph */}
      {activeTab === 'graph' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Multi-Vector Digital Trust Topology (Kill Chain, Infrastructure & Identity Correlator)</span>
            <span className="hidden sm:inline">Interactive Node Drag · Subgraph Path Isolation · Kill-Chain Walkthrough</span>
          </div>
          <DigitalTrustGraph
            nodes={incident.graph_nodes}
            edges={incident.graph_edges}
            height={540}
          />
        </div>
      )}

      {/* 2. Attack Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-[#0D121F] border border-slate-800 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-2">
            Chronological multi-vector attack arrival sequence with risk escalation
          </div>
          <AttackTimeline events={correlatedEvents} stages={incident.attack_stages} />
        </div>
      )}

      {/* 3. Evidence Layer */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Full traceable indicators ledger with score weights and technical telemetry payloads:
          </div>
          <EvidenceTable indicators={incident.indicators} />
        </div>
      )}

      {/* 4. Response Playbook */}
      {activeTab === 'playbook' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Automated & Human-in-the-Loop Containment Actions</span>
            <span>Simulated actions update graph telemetry and generate verified audit records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incident.recommended_actions.map(action => {
              const isApproved = action.status === 'APPROVED' || action.status === 'EXECUTED';
              return (
                <div
                  key={action.action_id}
                  className="ios-widget p-5 sm:p-6 rounded-[24px] flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-white">
                        {action.title}
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {action.criticality}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {action.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                    <span className={`text-xs font-semibold ${
                      isApproved ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {isApproved ? 'Simulated & Authorized' : 'Pending Authorization'}
                    </span>

                    {!isApproved ? (
                      <button
                        onClick={() => setActionToApprove(action)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors min-h-[36px] ios-pressable shadow-sm"
                      >
                        Authorize Action
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        {action.executed_by || 'SOC Analyst'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MITRE ATT&CK */}
      {activeTab === 'mitre' && (
        <div className="ios-widget p-6 sm:p-8 rounded-[26px] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-white">
              MITRE ATT&CK Technique Mapping
            </h2>
            <span className="text-xs text-slate-400 font-mono">{incident.mitre.length} mapped techniques</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {incident.mitre.map((techniqueId, idx) => (
              <div
                key={`${techniqueId}-${idx}`}
                className="bg-black/40 border border-white/10 p-4 rounded-2xl shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {techniqueId}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Enterprise
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-100 mb-1 font-sans">
                  {techniqueId === 'T1566' && 'Phishing (Initial Access)'}
                  {techniqueId === 'T1566.002' && 'Spearphishing Link (Initial Access)'}
                  {techniqueId === 'T1586' && 'Compromise Accounts & Domains'}
                  {techniqueId === 'T1204.001' && 'User Execution: Malicious Link'}
                  {techniqueId === 'T1056' && 'Input Capture (Credential Access)'}
                  {techniqueId === 'T1110.003' && 'Password Spraying (Credential Access)'}
                  {techniqueId === 'T1078' && 'Valid Accounts (Defense Evasion)'}
                  {techniqueId === 'T1539' && 'Steal Web Session / MFA Token'}
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Technique directly substantiated by verified telemetry in this incident dossier.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Audit Log */}
      {activeTab === 'audit' && (
        <div className="ios-widget p-6 sm:p-8 rounded-[26px] space-y-4 shadow-xl">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Incident Containment Audit Trail
          </h2>
          {incident.audit_history && incident.audit_history.length > 0 ? (
            <div className="space-y-2.5">
              {incident.audit_history.map(entry => (
                <div
                  key={entry.id}
                  className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-sans">{entry.action_title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-semibold">
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-sans">
                      Authorized by: <strong className="text-slate-200">{entry.actor}</strong>
                    </div>
                    <div className="text-[11px] text-slate-300 italic font-sans">
                      "{entry.reason}"
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-mono shrink-0">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No containment actions executed yet. Authorize actions from the Response Playbook tab.
            </div>
          )}
        </div>
      )}

      {/* Approval Modal */}
      <AuditLogModal
        isOpen={Boolean(actionToApprove)}
        onClose={() => setActionToApprove(null)}
        action={actionToApprove}
        incidentId={incident.id}
        onConfirmApprove={handleConfirmApproval}
        auditHistory={incident.audit_history}
      />
    </div>
  );
};
