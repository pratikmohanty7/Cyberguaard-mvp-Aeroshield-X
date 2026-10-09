import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrustIdentity, TrustDomain } from '../types';
import { 
  Key, 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  X,
  Check,
  Ban,
  Activity,
  Server,
  Mail,
  UserCheck,
  Radio,
  Share2,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Download,
  Upload,
  Zap,
  Flame,
  FileText
} from 'lucide-react';

interface ToastInfo {
  text: string;
  type: 'success' | 'info' | 'error';
}

interface TrustRegistryPageProps {
  onNavigateToTopology?: () => void;
  onNavigateToIncident?: (id: string) => void;
}

export const TrustRegistryPage: React.FC<TrustRegistryPageProps> = ({
  onNavigateToTopology,
  onNavigateToIncident
}) => {
  const [identities, setIdentities] = useState<TrustIdentity[]>([]);
  const [domains, setDomains] = useState<TrustDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [domainStatusFilter, setDomainStatusFilter] = useState<'ALL' | 'OFFICIAL' | 'APPROVED_SERVICE' | 'REVOKED'>('ALL');
  const [personaFilter, setPersonaFilter] = useState<'ALL' | 'EXECUTIVE' | 'HIGH' | 'STANDARD'>('ALL');
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Identity Modal state (Add / Edit)
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [identityFormData, setIdentityFormData] = useState({
    name: '',
    role: '',
    department: 'Academic Administration',
    official_email: '',
    approved_domain: 'pmec.ac.in',
    approved_channels: ['institutional_email', 'official_portal'],
    sensitivity_level: 'HIGH' as 'STANDARD' | 'HIGH' | 'EXECUTIVE'
  });

  // Domain Modal state (Add / Edit)
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [domainFormData, setDomainFormData] = useState({
    domain: '',
    organization: '',
    status: 'OFFICIAL' as 'OFFICIAL' | 'APPROVED_SERVICE' | 'REVOKED',
    is_primary: false,
    notes: ''
  });

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'domain' | 'identity';
    id: string;
    name: string;
  } | null>(null);

  // Live DNS & Real TLS Certificate Audit Modal
  const [auditModal, setAuditModal] = useState<{
    open: boolean;
    domain: TrustDomain | null;
    loading: boolean;
    result: any;
  }>({
    open: false,
    domain: null,
    loading: false,
    result: null
  });

  // Simulated Domain Attack Campaign Modal
  const [simModal, setSimModal] = useState<{
    open: boolean;
    domainName: string;
    loading: boolean;
    result: any;
  }>({
    open: false,
    domainName: '',
    loading: false,
    result: null
  });

  // Batch Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // --- Live Sandbox State (Multi-vector test) ---
  const [sandboxTab, setSandboxTab] = useState<'URL' | 'PERSONA' | 'DNS'>('URL');

  // Sandbox URL probe
  const [sandboxUrl, setSandboxUrl] = useState('https://pmec.ac.in/examination/notice.php');
  const [isProbingUrl, setIsProbingUrl] = useState(false);
  const [urlProbeResult, setUrlProbeResult] = useState<any>(null);

  // Sandbox Persona probe
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [personaSenderEmail, setPersonaSenderEmail] = useState<string>('');
  const [personaMessageText, setPersonaMessageText] = useState<string>(
    'URGENT: All faculty & student accounts must verify credentials on the examination portal before 5:00 PM today.'
  );
  const [isProbingPersona, setIsProbingPersona] = useState(false);
  const [personaProbeResult, setPersonaProbeResult] = useState<any>(null);

  // Sandbox DNS probe
  const [sandboxDnsHost, setSandboxDnsHost] = useState('pmec.ac.in');
  const [isProbingDns, setIsProbingDns] = useState(false);
  const [dnsProbeResult, setDnsProbeResult] = useState<any>(null);

  const loadRegistry = async () => {
    setLoading(true);
    try {
      const data = await api.getTrustRegistry();
      setIdentities(data.identities || []);
      setDomains(data.domains || []);
      if (data.identities && data.identities.length > 0 && !selectedPersonaId) {
        setSelectedPersonaId(data.identities[0].id);
        setPersonaSenderEmail(data.identities[0].official_email);
      }
    } catch (err: any) {
      console.error('Error loading trust registry:', err);
      showToast('Error loading registry: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Identity Handlers ---
  const handleOpenAddIdentity = () => {
    setEditingIdentityId(null);
    setIdentityFormData({
      name: '',
      role: '',
      department: 'Academic Administration',
      official_email: '',
      approved_domain: domains.find(d => d.is_primary)?.domain || domains[0]?.domain || 'pmec.ac.in',
      approved_channels: ['institutional_email', 'official_portal'],
      sensitivity_level: 'HIGH'
    });
    setIdentityModalOpen(true);
  };

  const handleOpenEditIdentity = (ident: TrustIdentity) => {
    setEditingIdentityId(ident.id);
    setIdentityFormData({
      name: ident.name,
      role: ident.role,
      department: ident.department,
      official_email: ident.official_email,
      approved_domain: ident.approved_domain,
      approved_channels: [...ident.approved_channels],
      sensitivity_level: ident.sensitivity_level
    });
    setIdentityModalOpen(true);
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingIdentityId) {
        await api.updateIdentity(editingIdentityId, identityFormData);
        showToast(`Updated persona "${identityFormData.name}" (${identityFormData.role})`, 'success');
      } else {
        await api.addIdentity(identityFormData);
        showToast(`Added persona "${identityFormData.name}" to trust registry`, 'success');
      }
      setIdentityModalOpen(false);
      loadRegistry();
    } catch (err: any) {
      console.error('Error saving identity:', err);
      showToast('Error saving persona: ' + err.message, 'error');
    }
  };

  const handleQuickToggleSensitivity = async (ident: TrustIdentity) => {
    const nextLevel: 'STANDARD' | 'HIGH' | 'EXECUTIVE' = 
      ident.sensitivity_level === 'STANDARD' ? 'HIGH' :
      ident.sensitivity_level === 'HIGH' ? 'EXECUTIVE' : 'STANDARD';
    try {
      await api.updateIdentity(ident.id, { sensitivity_level: nextLevel });
      showToast(`Updated sensitivity of "${ident.name}" to ${nextLevel}`, 'info');
      loadRegistry();
    } catch (err: any) {
      showToast('Error updating sensitivity: ' + err.message, 'error');
    }
  };

  const executeDeleteIdentity = async (id: string, name: string) => {
    try {
      await api.deleteIdentity(id);
      showToast(`Removed persona "${name}" from registry`, 'info');
      setDeleteConfirm(null);
      loadRegistry();
    } catch (err: any) {
      showToast('Error deleting persona: ' + err.message, 'error');
    }
  };

  // --- Domain Handlers ---
  const handleOpenAddDomain = () => {
    setEditingDomainId(null);
    setDomainFormData({
      domain: '',
      organization: '',
      status: 'OFFICIAL',
      is_primary: false,
      notes: ''
    });
    setDomainModalOpen(true);
  };

  const handleOpenEditDomain = (dom: TrustDomain) => {
    setEditingDomainId(dom.id);
    setDomainFormData({
      domain: dom.domain,
      organization: dom.organization,
      status: dom.status,
      is_primary: Boolean(dom.is_primary),
      notes: dom.notes || ''
    });
    setDomainModalOpen(true);
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domainFormData.domain.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0];
    try {
      if (editingDomainId) {
        await api.updateDomain(editingDomainId, { ...domainFormData, domain: cleanDomain });
        showToast(`Updated domain: "${cleanDomain}" [${domainFormData.status}]`, 'success');
      } else {
        await api.addDomain({ ...domainFormData, domain: cleanDomain });
        showToast(`Registered domain: "${cleanDomain}" [${domainFormData.status}]`, 'success');
      }
      setDomainModalOpen(false);
      loadRegistry();
    } catch (err: any) {
      console.error('Error saving domain:', err);
      showToast('Error saving domain: ' + err.message, 'error');
    }
  };

  const handleQuickToggleDomainStatus = async (dom: TrustDomain) => {
    const nextStatus: 'OFFICIAL' | 'APPROVED_SERVICE' | 'REVOKED' = 
      dom.status === 'OFFICIAL' ? 'APPROVED_SERVICE' :
      dom.status === 'APPROVED_SERVICE' ? 'REVOKED' : 'OFFICIAL';
    try {
      await api.updateDomain(dom.id, { status: nextStatus });
      showToast(`Domain "${dom.domain}" status set to ${nextStatus}`, 'info');
      loadRegistry();
    } catch (err: any) {
      showToast('Error updating domain status: ' + err.message, 'error');
    }
  };

  const handleSetPrimaryDomain = async (dom: TrustDomain) => {
    try {
      await api.updateDomain(dom.id, { is_primary: true });
      showToast(`Set "${dom.domain}" as Primary Root Domain`, 'success');
      loadRegistry();
    } catch (err: any) {
      showToast('Error setting primary domain: ' + err.message, 'error');
    }
  };

  const executeDeleteDomain = async (id: string, domainName: string) => {
    try {
      await api.deleteDomain(id);
      showToast(`Removed domain "${domainName}" from registry`, 'info');
      setDeleteConfirm(null);
      loadRegistry();
    } catch (err: any) {
      showToast('Error deleting domain: ' + err.message, 'error');
    }
  };

  // --- Real Live DNS & Security Audit ---
  const handleAuditDomainLive = async (dom: TrustDomain) => {
    setAuditModal({
      open: true,
      domain: dom,
      loading: true,
      result: null
    });
    try {
      const res = await api.verifyDomainLive(dom.id);
      setAuditModal({
        open: true,
        domain: res.domain || dom,
        loading: false,
        result: res.inspection
      });
      loadRegistry();
    } catch (err: any) {
      console.error('Error auditing domain:', err);
      setAuditModal(prev => ({
        ...prev,
        loading: false,
        result: { error: err.message }
      }));
    }
  };

  // --- Targeted Domain Attack Simulation ---
  const handleSimulateAttackOnDomain = async (dom: TrustDomain) => {
    setSimModal({
      open: true,
      domainName: dom.domain,
      loading: true,
      result: null
    });
    try {
      const matchedPersona = identities.find(i => 
        i.approved_domain.toLowerCase() === dom.domain.toLowerCase() ||
        dom.domain.toLowerCase().includes(i.approved_domain.toLowerCase())
      );
      const res = await api.simulateCampaignForDomain(dom.id, matchedPersona?.id);
      setSimModal({
        open: true,
        domainName: dom.domain,
        loading: false,
        result: res.simulation
      });
      showToast(`Simulated attack campaign targeting "${dom.domain}" created!`, 'success');
    } catch (err: any) {
      setSimModal(prev => ({
        ...prev,
        loading: false,
        result: { error: err.message }
      }));
    }
  };

  // --- Export & Import ---
  const handleExportRegistry = async () => {
    try {
      const data = await api.exportTrustRegistry();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyberguard-trust-registry-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Trust Registry exported successfully', 'success');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    setIsImporting(true);
    try {
      const parsed = JSON.parse(importJsonText);
      const domainsToImport = Array.isArray(parsed) ? parsed : parsed.domains || [];
      const identitiesToImport = parsed.identities || [];
      const res = await api.importTrustRegistry({
        domains: domainsToImport,
        identities: identitiesToImport
      });
      showToast(`Imported ${res.imported_domains} domains and ${res.imported_identities} personas`, 'success');
      setImportModalOpen(false);
      setImportJsonText('');
      loadRegistry();
    } catch (err: any) {
      showToast('Invalid JSON import payload: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // --- Quick Sandbox Pre-fill Actions ---
  const handleLoadDomainIntoUrlSandbox = (domainName: string, type: 'official' | 'phish' | 'typosquat') => {
    setSandboxTab('URL');
    if (type === 'official') {
      setSandboxUrl(`https://${domainName}/examination/student-portal.php`);
    } else if (type === 'phish') {
      const base = domainName.split('.')[0];
      setSandboxUrl(`https://${base}-portal-verification.xyz/auth/login.php`);
    } else {
      const base = domainName.split('.')[0];
      const typo = base.length > 2 ? base.slice(0, -1) + base.slice(-1) + 's' : base + 'x';
      const tld = domainName.split('.').slice(1).join('.') || 'com';
      setSandboxUrl(`https://${typo}.${tld}/login`);
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleLoadPersonaIntoSandbox = (ident: TrustIdentity, attack: boolean = false) => {
    setSandboxTab('PERSONA');
    setSelectedPersonaId(ident.id);
    if (attack) {
      const sanitizedName = ident.name.toLowerCase().replace(/[^a-z]/g, '');
      setPersonaSenderEmail(`${sanitizedName}-urgent-desk@gmail.com`);
      setPersonaMessageText(`[URGENT FROM ${ident.role.toUpperCase()}]: Immediate biometric re-verification required for ${ident.department}. Failure to respond within 2 hours results in suspension.`);
    } else {
      setPersonaSenderEmail(ident.official_email);
      setPersonaMessageText(`Official notice from ${ident.name} (${ident.role}): The scheduled examination registration window is now open on the official university portal.`);
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // --- Live Sandbox Probe Triggers ---
  const handleRunUrlProbe = async () => {
    if (!sandboxUrl.trim()) return;
    setIsProbingUrl(true);
    setUrlProbeResult(null);
    try {
      const res = await api.analyzeUrl(sandboxUrl.trim());
      setUrlProbeResult(res);
    } catch (err: any) {
      setUrlProbeResult({ error: err.message });
    } finally {
      setIsProbingUrl(false);
    }
  };

  const handleRunPersonaProbe = async () => {
    const ident = identities.find(i => i.id === selectedPersonaId);
    if (!ident) return;
    setIsProbingPersona(true);
    setPersonaProbeResult(null);
    try {
      const res = await api.analyzeIdentity({
        claimed_identity: ident.name,
        claimed_role: ident.role,
        sender_address: personaSenderEmail.trim(),
        communication_channel: 'email',
        message_content: personaMessageText
      });
      setPersonaProbeResult(res.analysis || res);
    } catch (err: any) {
      setPersonaProbeResult({ error: err.message });
    } finally {
      setIsProbingPersona(false);
    }
  };

  const handleRunDnsProbe = async () => {
    if (!sandboxDnsHost.trim()) return;
    setIsProbingDns(true);
    setDnsProbeResult(null);
    try {
      const res = await api.inspectDomain(sandboxDnsHost.trim());
      setDnsProbeResult(res);
    } catch (err: any) {
      setDnsProbeResult({ error: err.message });
    } finally {
      setIsProbingDns(false);
    }
  };

  // Filtered lists
  const filteredDomains = domains.filter(d => {
    const matchesSearch = !searchFilter || 
      d.domain.toLowerCase().includes(searchFilter.toLowerCase()) || 
      d.organization.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.status.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = domainStatusFilter === 'ALL' || d.status === domainStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredIdentities = identities.filter(i => {
    const matchesSearch = !searchFilter ||
      i.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
      i.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.official_email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.department.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.approved_domain.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesLevel = personaFilter === 'ALL' || i.sensitivity_level === personaFilter;
    return matchesSearch && matchesLevel;
  });

  // Calculate live institutional trust statistics
  const officialCount = domains.filter(d => d.status === 'OFFICIAL').length;
  const approvedCount = domains.filter(d => d.status === 'APPROVED_SERVICE').length;
  const revokedCount = domains.filter(d => d.status === 'REVOKED').length;
  const execCount = identities.filter(i => i.sensitivity_level === 'EXECUTIVE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans px-4 sm:px-6 py-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 border ${
          toast.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-300' 
            : toast.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/60 text-rose-300'
            : 'bg-sky-950/95 border-sky-500/60 text-sky-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner - iOS Frosted Glass Panel */}
      <div className="ios-glass-card p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-mono">
            <span className="text-amber-400 font-semibold uppercase tracking-wider">PERIMETER GROUND TRUTH</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Deterministic Whitelist & Blacklist</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-200">{domains.length} domains · {identities.length} personas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Institutional Trust Panel & Persona Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage authenticated university authority figures, institutional FQDN domains, and authorized communication channels.
            All modifications immediately anchor the enterprise topology graph and govern detector decisions.
          </p>
        </div>

        {/* Global Toolbar: iOS Search & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search domains or personas..."
              className="ios-search-input w-44 sm:w-56 text-xs"
            />
          </div>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/10 text-xs font-sans flex items-center gap-1.5 transition-all ios-pressable"
            title="Import whitelist entries"
          >
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportRegistry}
            className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/10 text-xs font-sans flex items-center gap-1.5 transition-all ios-pressable"
            title="Export full registry JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export</span>
          </button>

          <button
            onClick={loadRegistry}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/10 text-xs transition-all ios-pressable"
            title="Reload registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRICS HUD STRIP: iOS Squircle Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="ios-widget p-4 flex flex-col justify-between ios-pressable">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-2">
            <span>Official Roots</span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{officialCount}</div>
            <div className="text-[10px] text-emerald-400 font-sans mt-0.5">100% Whitelist Verified</div>
          </div>
        </div>

        <div className="ios-widget p-4 flex flex-col justify-between ios-pressable">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-2">
            <span>Approved Services</span>
            <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{approvedCount}</div>
            <div className="text-[10px] text-sky-400 font-sans mt-0.5">Authorized Portals</div>
          </div>
        </div>

        <div className="ios-widget p-4 flex flex-col justify-between ios-pressable">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-2">
            <span>Hostile Blacklist</span>
            <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400 font-mono">{revokedCount}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">Quarantined Threats</div>
          </div>
        </div>

        <div className="ios-widget p-4 flex flex-col justify-between ios-pressable">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-2">
            <span>Protected Personas</span>
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 font-mono">{execCount}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">Impersonation Shield</div>
          </div>
        </div>
      </div>

      {/* TOPOLOGY INTEGRATION CALLOUT BANNER */}
      <div className="bg-[#0B0F19] border border-sky-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-white">Direct Enterprise Trust Topology Link</div>
            <div className="text-slate-400 text-[11px]">
              Every domain and persona configured here automatically forms the institutional infrastructure & human identity foundation in the interactive topology correlator.
            </div>
          </div>
        </div>
        {onNavigateToTopology && (
          <button
            onClick={onNavigateToTopology}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0 shadow-sm self-start sm:self-auto"
          >
            <span>View In Trust Topology</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* MULTI-VECTOR LIVE VERIFICATION SANDBOX: Demonstrates that edits work in real life */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Multi-Vector Live Verification Sandbox</span>
                <span className="text-[10px] font-normal text-emerald-400 font-sans px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                  Live Engine Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Test any URL, email lure, or DNS records against your live configured registry.
              </p>
            </div>
          </div>

          {/* Sandbox Modality Switcher - iOS Segmented Control */}
          <div className="ios-segmented-track self-start sm:self-auto p-1">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                setSandboxTab('URL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ios-pressable ${
                sandboxTab === 'URL' ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              URL & Portal
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                setSandboxTab('PERSONA');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ios-pressable ${
                sandboxTab === 'PERSONA' ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Persona Guard
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                setSandboxTab('DNS');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ios-pressable ${
                sandboxTab === 'DNS' ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live DNS & SSL
            </button>
          </div>
        </div>

        {/* TAB 1: URL & LINK ANALYZER */}
        {sandboxTab === 'URL' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                type="text"
                value={sandboxUrl}
                onChange={e => setSandboxUrl(e.target.value)}
                placeholder="Enter URL to test (e.g. https://pmec.ac.in/portal or lookalike phishing URL)"
                className="flex-1 px-3.5 py-2 bg-[#070913] border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleRunUrlProbe}
                disabled={isProbingUrl}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
              >
                {isProbingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Evaluate URL Against Registry</span>
              </button>
            </div>

            {/* Quick Test Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="font-mono text-slate-500">Quick Test Cases:</span>
              {domains.slice(0, 3).map(dom => (
                <button
                  key={dom.id}
                  onClick={() => handleLoadDomainIntoUrlSandbox(dom.domain, 'official')}
                  className="px-2 py-0.5 rounded border border-slate-800 bg-[#070913] hover:border-emerald-500/50 hover:text-emerald-300 text-slate-300 font-mono transition-colors"
                >
                  ✓ Official ({dom.domain})
                </button>
              ))}
              {domains.length > 0 && (
                <button
                  onClick={() => handleLoadDomainIntoUrlSandbox(domains[0].domain, 'phish')}
                  className="px-2 py-0.5 rounded border border-slate-800 bg-[#070913] hover:border-rose-500/50 hover:text-rose-300 text-slate-300 font-mono transition-colors"
                >
                  ⚠ Brand Lookalike Attack
                </button>
              )}
            </div>

            {/* Probe Results Box */}
            {urlProbeResult && (
              <div className="p-3.5 bg-[#06080F] border border-slate-800 rounded-lg text-xs font-mono space-y-2.5 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Target Host:</span>
                    <span className="text-white font-bold">{urlProbeResult.normalized_domain || sandboxUrl}</span>
                    {urlProbeResult.is_official && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        OFFICIAL VERIFIED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Verdict:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      urlProbeResult.severity === 'SAFE' 
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' 
                        : urlProbeResult.severity === 'CRITICAL'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    }`}>
                      {urlProbeResult.severity || 'UNKNOWN'} (Risk Score: {urlProbeResult.risk_score ?? 'N/A'}/100)
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 font-sans">{urlProbeResult.classification}</span>
                  </div>
                </div>

                {urlProbeResult.indicators && urlProbeResult.indicators.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">Detector Indicators Triggered:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {urlProbeResult.indicators.map((ind: any, i: number) => (
                        <span 
                          key={i} 
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            ind.id === 'VERIFIED_INSTITUTIONAL_DOMAIN' 
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                              : ind.id === 'REVOKED_HOSTILE_DOMAIN'
                              ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                              : ind.id?.includes('LOOKALIKE')
                              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {ind.id}: {ind.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {urlProbeResult.summary && (
                  <div className="text-[11px] text-slate-300 pt-1 leading-normal font-sans">
                    {urlProbeResult.summary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERSONA IMPERSONATION PROBE */}
        {sandboxTab === 'PERSONA' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">
                  Protected Authority Figure:
                </label>
                <select
                  value={selectedPersonaId}
                  onChange={e => {
                    setSelectedPersonaId(e.target.value);
                    const ident = identities.find(i => i.id === e.target.value);
                    if (ident) setPersonaSenderEmail(ident.official_email);
                  }}
                  className="w-full px-3 py-2 bg-[#070913] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {identities.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} — {i.role} ({i.department}) [{i.sensitivity_level}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 text-xs font-medium">Claimed Inbound Sender Address:</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const ident = identities.find(i => i.id === selectedPersonaId);
                        if (ident) setPersonaSenderEmail(ident.official_email);
                      }}
                      className="text-emerald-400 hover:underline"
                    >
                      Use Official
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setPersonaSenderEmail('university.authority.verify@gmail.com')}
                      className="text-rose-400 hover:underline"
                    >
                      Use Impersonator Email
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={personaSenderEmail}
                  onChange={e => setPersonaSenderEmail(e.target.value)}
                  placeholder="e.g. controller@pmec.ac.in or fake-controller@gmail.com"
                  className="w-full px-3 py-2 bg-[#070913] border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1">Communication Body:</label>
              <textarea
                rows={2}
                value={personaMessageText}
                onChange={e => setPersonaMessageText(e.target.value)}
                className="w-full px-3 py-2 bg-[#070913] border border-slate-700 rounded-lg text-xs text-white font-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRunPersonaProbe}
                disabled={isProbingPersona}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {isProbingPersona ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>Verify Persona Authenticity</span>
              </button>
            </div>

            {/* Persona Probe Results Box */}
            {personaProbeResult && (
              <div className="p-3.5 bg-[#06080F] border border-slate-800 rounded-lg text-xs font-mono space-y-2.5 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Target Persona:</span>
                    <span className="text-white font-bold">{personaProbeResult.claimed_identity || 'N/A'}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">Sender Domain:</span>
                    <span className="text-sky-400">{personaProbeResult.sender_domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Trust Score:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      (personaProbeResult.trust_score || 0) >= 70
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}>
                      {personaProbeResult.trust_score ?? 'N/A'}/100
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{personaProbeResult.classification}</span>
                  </div>
                </div>

                {personaProbeResult.indicators && personaProbeResult.indicators.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">Identity Guard Indicators:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {personaProbeResult.indicators.map((ind: any, i: number) => (
                        <span 
                          key={i} 
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            ind.id === 'OFFICIAL_DOMAIN_MATCH'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : ind.id === 'IDENTITY_DOMAIN_MISMATCH'
                              ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {ind.id}: {ind.description}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {personaProbeResult.summary && (
                  <div className="text-[11px] text-slate-300 pt-1 leading-normal font-sans">
                    {personaProbeResult.summary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE DNS / TLS AUDIT */}
        {sandboxTab === 'DNS' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                type="text"
                value={sandboxDnsHost}
                onChange={e => setSandboxDnsHost(e.target.value)}
                placeholder="Enter FQDN domain (e.g. pmec.ac.in, bput.ac.in, or your institution)"
                className="flex-1 px-3.5 py-2 bg-[#070913] border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRunDnsProbe}
                disabled={isProbingDns}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
              >
                {isProbingDns ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                <span>Audit Public DNS & SSL</span>
              </button>
            </div>

            {/* Probe Results Box */}
            {dnsProbeResult && (
              <div className="p-3.5 bg-[#06080F] border border-slate-800 rounded-lg text-xs font-mono space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Inspected Host:</span>
                    <span className="text-white font-bold">{dnsProbeResult.domain}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">Latency:</span>
                    <span className="text-sky-400">{dnsProbeResult.latency_ms} ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">DNS Trust Grade:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      {dnsProbeResult.trust_grade}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded bg-[#0A0D18] border border-slate-800 space-y-1">
                    <div className="text-[11px] text-slate-400 font-sans font-medium">A Records (IPs):</div>
                    <div className="text-slate-200">
                      {dnsProbeResult.resolved_ips && dnsProbeResult.resolved_ips.length > 0 ? (
                        dnsProbeResult.resolved_ips.map((ip: string) => <div key={ip}>{ip}</div>)
                      ) : (
                        <span className="text-slate-500">None resolved</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#0A0D18] border border-slate-800 space-y-1">
                    <div className="text-[11px] text-slate-400 font-sans font-medium">Authoritative Nameservers:</div>
                    <div className="text-slate-200 truncate">
                      {dnsProbeResult.nameservers && dnsProbeResult.nameservers.length > 0 ? (
                        dnsProbeResult.nameservers.map((ns: string, i: number) => (
                          <div key={i} className="truncate">{ns}</div>
                        ))
                      ) : (
                        <span className="text-slate-500">Inherited TLD resolvers</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#0A0D18] border border-slate-800 space-y-1">
                    <div className="text-[11px] text-slate-400 font-sans font-medium">Email Security & TLS:</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>SPF:</span>
                        <span className={dnsProbeResult.has_spf ? 'text-emerald-400' : 'text-slate-500'}>
                          {dnsProbeResult.has_spf ? 'Configured' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>DMARC:</span>
                        <span className={dnsProbeResult.has_dmarc ? 'text-emerald-400' : 'text-slate-500'}>
                          {dnsProbeResult.dmarc_policy || (dnsProbeResult.has_dmarc ? 'Configured' : 'Missing')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>TLS Issuer:</span>
                        <span className="text-sky-300 truncate max-w-[120px]">
                          {dnsProbeResult.tls_certificate?.issuer || (dnsProbeResult.https_reachable ? 'Valid' : 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {dnsProbeResult.recommendations && dnsProbeResult.recommendations.length > 0 && (
                  <div className="p-2.5 rounded bg-black/40 border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="text-slate-400 font-sans font-medium">Security Hardening Recommendations:</div>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {dnsProbeResult.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: 2 Columns for Domains & Identities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Protected Domains */}
        <div className="ios-glass-card p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Institutional Domains ({filteredDomains.length})
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Domain Status Filter - iOS Segmented Control */}
              <div className="ios-segmented-track text-[10px] p-0.5">
                {(['ALL', 'OFFICIAL', 'APPROVED_SERVICE', 'REVOKED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                      setDomainStatusFilter(st);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-sans transition-all ios-pressable ${
                      domainStatusFilter === st ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'APPROVED_SERVICE' ? 'APPROVED' : st}
                  </button>
                ))}
              </div>

              <button
                onClick={handleOpenAddDomain}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-slate-200 flex items-center gap-1 transition-all shadow-md ios-pressable"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
            {filteredDomains.map((dom) => (
              <div
                key={dom.id}
                className="ios-grouped-card p-4 space-y-3 text-xs transition-all ios-pressable hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-white text-xs">{dom.domain}</span>
                      
                      {/* Interactive Status Switcher */}
                      <button
                        type="button"
                        onClick={() => handleQuickToggleDomainStatus(dom)}
                        title="Click to toggle status (Official / Approved / Revoked)"
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer hover:opacity-85 transition-opacity ${
                          dom.status === 'OFFICIAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          dom.status === 'APPROVED_SERVICE' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {dom.status} ↻
                      </button>

                      {dom.is_primary ? (
                        <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                          Primary Root
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryDomain(dom)}
                          className="text-[10px] text-slate-400 hover:text-white font-sans transition-colors"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300">
                      {dom.organization} {dom.notes && <span className="text-slate-400">· {dom.notes}</span>}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditDomain(dom)}
                      className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 transition-colors ios-pressable"
                      title="Edit domain configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'domain', id: dom.id, name: dom.domain })}
                      className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors ios-pressable"
                      title="Remove domain"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Domain Quick Actions Strip */}
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAuditDomainLive(dom)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-sky-300 flex items-center gap-1 text-[11px] font-medium transition-all ios-pressable"
                    >
                      <Server className="w-3 h-3 text-sky-400" />
                      <span>Audit DNS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateAttackOnDomain(dom)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center gap-1 text-[11px] font-medium transition-all ios-pressable"
                    >
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Simulate Attack</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadDomainIntoUrlSandbox(dom.domain, 'official')}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-emerald-300 flex items-center gap-1 text-[11px] font-medium transition-all ios-pressable"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Sandbox Test</span>
                    </button>
                  </div>

                  {dom.last_verified ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Verified: {new Date(dom.last_verified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Not yet audited
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredDomains.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No domains matching filter. Click "Add" above to register a new domain.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Protected Institutional Authorities & Personas */}
        <div className="ios-glass-card p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Key className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Protected Personas & Authorities ({filteredIdentities.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Sensitivity Filter - iOS Segmented Control */}
              <div className="ios-segmented-track text-[10px] p-0.5">
                {(['ALL', 'EXECUTIVE', 'HIGH', 'STANDARD'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                      setPersonaFilter(lvl);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-sans transition-all ios-pressable ${
                      personaFilter === lvl ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                onClick={handleOpenAddIdentity}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-slate-200 flex items-center gap-1 transition-all shadow-md ios-pressable"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
            {filteredIdentities.map((ident) => (
              <div
                key={ident.id}
                className="ios-grouped-card p-4 space-y-3 text-xs transition-all ios-pressable hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs">{ident.name}</span>
                      <span className="text-[11px] text-amber-400 font-sans font-medium">({ident.role})</span>
                      
                      {/* Interactive Sensitivity Switcher */}
                      <button
                        type="button"
                        onClick={() => handleQuickToggleSensitivity(ident)}
                        title="Click to toggle sensitivity level (Standard / High / Executive)"
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer hover:opacity-85 transition-opacity ${
                          ident.sensitivity_level === 'EXECUTIVE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          ident.sensitivity_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {ident.sensitivity_level} ↻
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono">
                      {ident.official_email} · Approved Domain: <span className="text-white">{ident.approved_domain}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-sans">
                      Dept: {ident.department} · Channels: {ident.approved_channels.join(', ')}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditIdentity(ident)}
                      className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 transition-colors ios-pressable"
                      title="Edit persona configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'identity', id: ident.id, name: ident.name })}
                      className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors ios-pressable"
                      title="Remove persona"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Persona Quick Actions Strip */}
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleLoadPersonaIntoSandbox(ident, false)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-emerald-300 flex items-center gap-1 text-[11px] font-medium transition-all ios-pressable"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Test Official Auth</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadPersonaIntoSandbox(ident, true)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center gap-1 text-[11px] font-medium transition-all ios-pressable"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>Test Impersonation</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {ident.id}
                  </span>
                </div>
              </div>
            ))}

            {filteredIdentities.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No personas matching filter. Click "Add" above to register an authority figure.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT DOMAIN - iOS Half-Sheet Squircle Presentation */}
      {domainModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D111C]/95 border border-white/15 rounded-[28px] p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-3xl">
            <div className="ios-grabber" />
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {editingDomainId ? 'Edit Institutional Domain' : 'Register New Domain'}
                </h3>
              </div>
              <button 
                onClick={() => setDomainModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors ios-pressable"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDomain} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Domain FQDN (Host):</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pmec.ac.in, stanford.edu, or yourdomain.com"
                  value={domainFormData.domain}
                  onChange={e => setDomainFormData({ ...domainFormData, domain: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-white/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Organization / Entity Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parala Maharaja Engineering College"
                  value={domainFormData.organization}
                  onChange={e => setDomainFormData({ ...domainFormData, organization: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Trust Registry Status:</label>
                <select
                  value={domainFormData.status}
                  onChange={e => setDomainFormData({ ...domainFormData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-[#121624] border border-white/10 rounded-xl text-white font-sans focus:outline-none focus:border-white/30 transition-all"
                >
                  <option value="OFFICIAL">OFFICIAL (Verified Primary Institutional Domain)</option>
                  <option value="APPROVED_SERVICE">APPROVED_SERVICE (Authorized Vendor/SaaS)</option>
                  <option value="REVOKED">REVOKED (Hostile Blacklist / Confirmed Malicious)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Setting to REVOKED causes all detectors to quarantine and blacklist URLs under this host.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Administrative Notes (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Primary academic portal for student grading"
                  value={domainFormData.notes}
                  onChange={e => setDomainFormData({ ...domainFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all"
                />
              </div>

              {/* Authentic iOS Switch Row */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex flex-col pr-3">
                  <span className="text-white font-medium text-xs">Primary Institutional Root Domain</span>
                  <span className="text-[11px] text-slate-400">Anchor for campus lookalike detection</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(10); } catch(e){}
                    setDomainFormData(prev => ({ ...prev, is_primary: !prev.is_primary }));
                  }}
                  className={`ios-switch ${domainFormData.is_primary ? 'active' : 'inactive'}`}
                  aria-label="Toggle primary domain status"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDomainModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 font-medium transition-all ios-pressable"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-all shadow-md ios-pressable"
                >
                  {editingDomainId ? 'Save Changes' : 'Register Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PERSONA - iOS Half-Sheet Squircle Presentation */}
      {identityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D111C]/95 border border-white/15 rounded-[28px] p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-3xl">
            <div className="ios-grabber" />
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {editingIdentityId ? 'Edit Protected Persona' : 'Register New University Persona'}
                </h3>
              </div>
              <button 
                onClick={() => setIdentityModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors ios-pressable"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIdentity} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A. K. Patnaik"
                    value={identityFormData.name}
                    onChange={e => setIdentityFormData({ ...identityFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Official Role / Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Examination Controller"
                    value={identityFormData.role}
                    onChange={e => setIdentityFormData({ ...identityFormData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Examination Cell"
                    value={identityFormData.department}
                    onChange={e => setIdentityFormData({ ...identityFormData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Sensitivity Level:</label>
                  <select
                    value={identityFormData.sensitivity_level}
                    onChange={e => setIdentityFormData({ ...identityFormData, sensitivity_level: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-[#121624] border border-white/10 rounded-xl text-white font-sans focus:outline-none focus:border-white/30 transition-all"
                  >
                    <option value="EXECUTIVE">EXECUTIVE (Highest Protection / VIP)</option>
                    <option value="HIGH">HIGH (Faculty / Administrative Officer)</option>
                    <option value="STANDARD">STANDARD (General Staff)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Official Email Address:</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. controller@pmec.ac.in"
                    value={identityFormData.official_email}
                    onChange={e => setIdentityFormData({ ...identityFormData, official_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Approved FQDN Domain:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pmec.ac.in"
                    value={identityFormData.approved_domain}
                    onChange={e => setIdentityFormData({ ...identityFormData, approved_domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Approved Communication Channels:</label>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {[
                    { id: 'institutional_email', label: 'Institutional Email' },
                    { id: 'official_portal', label: 'Official Portal' },
                    { id: 'physical_bulletin', label: 'Physical Notice Bulletin' },
                    { id: 'sms_gateway', label: 'Official SMS Gateway' }
                  ].map(ch => {
                    const checked = identityFormData.approved_channels.includes(ch.id);
                    return (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={() => {
                          if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                          setIdentityFormData({
                            ...identityFormData,
                            approved_channels: checked 
                              ? identityFormData.approved_channels.filter(c => c !== ch.id)
                              : [...identityFormData.approved_channels, ch.id]
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ios-pressable ${
                          checked 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium' 
                            : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-amber-400" />}
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIdentityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 font-medium transition-all ios-pressable"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-all shadow-md ios-pressable"
                >
                  {editingIdentityId ? 'Save Changes' : 'Register Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL - iOS Action Sheet Style */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0D111C]/95 border border-white/15 rounded-[28px] p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-3xl">
            <div className="ios-grabber" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Remove {deleteConfirm.type === 'domain' ? 'Domain' : 'Authority Persona'}?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This entity will be unanchored from the institutional perimeter.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-mono text-slate-300">
              Target: <span className="text-white font-bold">{deleteConfirm.name}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 text-xs font-medium transition-all ios-pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(15); } catch(e){}
                  if (deleteConfirm.type === 'domain') {
                    executeDeleteDomain(deleteConfirm.id, deleteConfirm.name);
                  } else {
                    executeDeleteIdentity(deleteConfirm.id, deleteConfirm.name);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all ios-pressable"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE AUDIT DRAWER / MODAL: Real TLS Socket & Authoritative DNS */}
      {auditModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Live DNS, Nameservers & TLS Socket Audit: {auditModal.domain?.domain}
                </h3>
              </div>
              <button 
                onClick={() => setAuditModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {auditModal.loading ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-mono">
                <RefreshCw className="w-7 h-7 animate-spin text-sky-400" />
                <span>Performing live TCP/TLS handshake, querying authoritative NS, and auditing SPF/DMARC...</span>
              </div>
            ) : auditModal.result?.error ? (
              <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-mono">
                Inspection Error: {auditModal.result.error}
              </div>
            ) : (
              <div className="space-y-3.5 text-xs font-mono">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#06080F] border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Overall Security Hygiene Grade</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-emerald-400">{auditModal.result?.trust_grade}</span>
                      <span className="text-xs text-slate-400">({auditModal.result?.score || 0}/100 points)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Round-Trip Latency</span>
                    <span className="text-slate-200 font-bold">{auditModal.result?.latency_ms} ms</span>
                  </div>
                </div>

                {/* TLS Socket Certificate Card */}
                {auditModal.result?.tls_certificate && (
                  <div className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                      <span className="text-sky-400 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>TLS / SSL Certificate Socket Audit (Port 443)</span>
                      </span>
                      <span className="text-emerald-400">{auditModal.result.tls_certificate.protocol}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Certificate Issuer:</span>
                        <span className="text-slate-200 font-semibold">{auditModal.result.tls_certificate.issuer}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Subject (CN):</span>
                        <span className="text-slate-200 truncate block">{auditModal.result.tls_certificate.subject_cn}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Expiration:</span>
                        <span className="text-emerald-400">{auditModal.result.tls_certificate.days_remaining} days left</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px] block font-sans font-medium">Resolved IPv4 Addresses</span>
                    <div className="text-slate-200 text-[11px]">
                      {auditModal.result?.resolved_ips?.length > 0 ? (
                        auditModal.result.resolved_ips.map((ip: string) => <div key={ip}>{ip}</div>)
                      ) : (
                        <span className="text-slate-500">None detected</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px] block font-sans font-medium">Authoritative Nameservers</span>
                    <div className="text-slate-200 text-[11px] truncate">
                      {auditModal.result?.nameservers?.length > 0 ? (
                        auditModal.result.nameservers.slice(0, 3).map((ns: string, i: number) => (
                          <div key={i} className="truncate">{ns}</div>
                        ))
                      ) : (
                        <span className="text-slate-500">Inherited TLD resolvers</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 text-[11px] block font-sans font-medium">Email Security Posture</span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">SPF Record:</span>
                        <span className={auditModal.result?.has_spf ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {auditModal.result?.has_spf ? 'Valid (v=spf1)' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DMARC Policy:</span>
                        <span className={auditModal.result?.has_dmarc ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {auditModal.result?.dmarc_policy || (auditModal.result?.has_dmarc ? 'Active' : 'Missing')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 text-[11px] block font-sans font-medium">Active MX Mail Servers</span>
                    <div className="space-y-0.5 text-[11px] text-slate-300">
                      {auditModal.result?.mx_records?.length > 0 ? (
                        auditModal.result.mx_records.slice(0, 2).map((mx: any, i: number) => (
                          <div key={i} className="flex justify-between truncate">
                            <span className="truncate">{mx.exchange}</span>
                            <span className="text-slate-500 shrink-0">Pref {mx.priority}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-500">No public MX records</span>
                      )}
                    </div>
                  </div>
                </div>

                {auditModal.result?.recommendations && auditModal.result.recommendations.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#06080F] border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 text-[11px] block font-sans font-medium">Hardening Recommendations:</span>
                    <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1 font-sans">
                      {auditModal.result.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAuditModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATION ATTACK RESULT MODAL */}
      {simModal.open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-rose-900/60 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Targeted Attack Campaign Generated: {simModal.domainName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Synthetic multi-vector attack correlation created against this specific domain & authority persona.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSimModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {simModal.loading ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-mono">
                <RefreshCw className="w-7 h-7 animate-spin text-rose-400" />
                <span>Simulating multi-stage attack campaign and correlating through detection engine...</span>
              </div>
            ) : simModal.result?.error ? (
              <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-mono">
                Simulation Error: {simModal.result.error}
              </div>
            ) : (
              <div className="space-y-3.5 text-xs font-mono">
                <div className="p-3 bg-[#06080F] border border-rose-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Correlated Incident ID</span>
                    <span className="text-sm font-bold text-white">{simModal.result?.incident_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Kill Chain Stages</span>
                    <span className="text-sm font-bold text-rose-400">{simModal.result?.steps?.length || 4} Attack Vectors</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-400 text-[11px] block font-sans font-medium">Synthesized Kill Chain Vectors:</span>
                  {simModal.result?.steps?.map((step: any) => (
                    <div key={step.step} className="p-3 rounded-lg bg-[#070913] border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{step.stage_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          step.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' :
                          step.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          Risk: {step.risk_score}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">
                        {step.event?.raw_input_summary}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Data active in incident queue and perimeter topology.
              </span>

              <div className="flex items-center gap-2">
                {onNavigateToTopology && (
                  <button
                    type="button"
                    onClick={() => {
                      setSimModal(prev => ({ ...prev, open: false }));
                      onNavigateToTopology();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>View In Topology Graph</span>
                  </button>
                )}
                {onNavigateToIncident && simModal.result?.incident_id && (
                  <button
                    type="button"
                    onClick={() => {
                      const incId = simModal.result.incident_id;
                      setSimModal(prev => ({ ...prev, open: false }));
                      onNavigateToIncident(incId);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Incident Dossier</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Batch Import Whitelist & Personas</h3>
              </div>
              <button 
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Paste JSON Array or Registry Payload:
                </label>
                <textarea
                  rows={8}
                  required
                  value={importJsonText}
                  onChange={e => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "domains": [\n    { "domain": "mit.edu", "organization": "MIT", "status": "OFFICIAL" }\n  ],\n  "identities": [\n    { "name": "Prof. Smith", "role": "Dean", "official_email": "dean@mit.edu", "approved_domain": "mit.edu" }\n  ]\n}`}
                  className="w-full px-3 py-2 bg-[#070913] border border-slate-700 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Import Registry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
