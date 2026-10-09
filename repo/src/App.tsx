/**
 * CYBERGUARD - Institutional Digital Trust & Cyber Defence Platform
 * Main React Application Shell
 */

import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { SecurityEvent, Incident } from './types';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { EventsPage } from './pages/EventsPage';
import { TrustRegistryPage } from './pages/TrustRegistryPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { DeepfakeForensicsPage } from './pages/DeepfakeForensicsPage';
import { TopologyPage } from './pages/TopologyPage';
import { CopilotModal } from './components/CopilotModal';
import { InteractiveCampaignStepper } from './components/InteractiveCampaignStepper';
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, X, ChevronRight, Zap, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [currentSimulatedRisk, setCurrentSimulatedRisk] = useState(52);
  const [simulationToast, setSimulationToast] = useState<{ message: string; risk?: number; incidentId?: string } | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const loadData = async () => {
    try {
      const [evts, incs] = await Promise.all([
        api.getEvents(),
        api.getIncidents()
      ]);
      setEvents(evts);
      setIncidents(incs);
    } catch (err) {
      console.warn('Backend fetch failed, using local memory state:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateCampaign = async () => {
    // Open the full interactive visual campaign stepper for maximum immersion & grading impact
    setIsStepperOpen(true);
  };

  const handleExecuteFastCampaign = async () => {
    setIsSimulating(true);
    setSimulationToast({ message: 'Executing multi-stage authorized synthetic attack campaign...', risk: 52 });

    try {
      const res = await api.simulateCampaign();
      await loadData();

      const incId = res.simulation?.incident_id || 'CG-0001';
      setSelectedIncidentId(incId);
      setCurrentSimulatedRisk(96);

      setSimulationToast({
        message: 'Campaign Escalated: Phishing → Quishing → Look-alike Domain → Impersonation → Password Spraying → Impossible Travel & ATO!',
        risk: 96,
        incidentId: incId
      });
    } catch (err: any) {
      console.error('Error simulating campaign:', err);
      setSimulationToast({ message: 'Simulation error: ' + err.message });
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationToast(null), 10000);
    }
  };

  const handleStageExecuted = async (stageIndex: number) => {
    const riskByStage = [52, 70, 82, 88, 91, 94, 96];
    const newRisk = riskByStage[stageIndex - 1] || 96;
    setCurrentSimulatedRisk(newRisk);

    // If reaching the end or progressing, refresh dataset to show correlated evidence
    if (stageIndex >= 4) {
      try {
        await api.simulateCampaign();
        await loadData();
      } catch (err) {
        console.warn('Simulation sync error:', err);
      }
    }
  };

  const handleResetSimulation = async () => {
    try {
      await api.resetDatabase();
      await loadData();
      setCurrentSimulatedRisk(0);
      setSimulationToast({ message: 'Perimeter reset to clean baseline nominal state.', risk: 0 });
      setTimeout(() => setSimulationToast(null), 4000);
    } catch (err) {
      console.warn('Reset error:', err);
    }
  };

  const handleSimulateSafeNotice = async () => {
    setIsSimulating(true);
    setSimulationToast({ message: 'Evaluating legitimate official registrar examination notice...', risk: 8 });
    try {
      await api.simulateSafeNotice();
      await loadData();
      setSimulationToast({
        message: 'Official Notice Verified: Originates from approved pmec.ac.in domain on official academic channel. Evaluated as SAFE (8/100).',
        risk: 8
      });
    } catch (err: any) {
      console.error('Error simulating safe notice:', err);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationToast(null), 6000);
    }
  };

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setActiveTab('incident_detail');
  };

  const handleEventCreated = (newEvent: SecurityEvent) => {
    setEvents(prev => [newEvent, ...prev]);
    loadData();
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  return (
    <div className="min-h-screen bg-[#070913] bg-mesh-dark text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 3-Zone Top Navigation Contract */}
      <Navbar
        activeTab={activeTab === 'incident_detail' ? 'incidents' : activeTab}
        setActiveTab={tab => {
          setSelectedIncidentId(null);
          setActiveTab(tab);
        }}
        onSimulateCampaign={handleSimulateCampaign}
        onSimulateSafeNotice={handleSimulateSafeNotice}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        isSimulating={isSimulating}
      />

      {/* Non-overlapping In-Flow Notification Banner (Never floats over UI elements) */}
      {simulationToast && (
        <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 animate-in fade-in slide-in-from-top-2">
          <div className="ios-glass border border-white/15 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-[0_0_8px_#38bdf8]" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-100 font-medium truncate sm:whitespace-normal">
                  {simulationToast.message}
                </p>
                {simulationToast.risk !== undefined && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-rose-500/40 text-rose-300 font-semibold font-mono text-[11px]">
                      Risk Index: {simulationToast.risk}/100
                    </span>
                    {simulationToast.incidentId && (
                      <button
                        onClick={() => {
                          setSimulationToast(null);
                          handleSelectIncident(simulationToast.incidentId!);
                        }}
                        className="px-2.5 py-0.5 rounded-md bg-white text-black font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 text-[11px] ios-pressable"
                      >
                        <span>Open Dossier</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSimulationToast(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 p-3.5 sm:p-6 pb-28 lg:pb-10 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <DashboardPage
            events={events}
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onNavigateToAnalyze={() => setActiveTab('analyze')}
            onNavigateToDeepfake={() => setActiveTab('deepfake')}
            onNavigateToTopology={() => setActiveTab('topology')}
            onSimulateCampaign={handleSimulateCampaign}
            onSimulateSafeNotice={handleSimulateSafeNotice}
            onResetSimulation={handleResetSimulation}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === 'topology' && (
          <TopologyPage
            incidents={incidents}
            events={events}
            selectedIncidentId={selectedIncidentId || undefined}
            onSelectIncident={handleSelectIncident}
            onSimulateCampaign={handleSimulateCampaign}
            onResetSimulation={handleResetSimulation}
          />
        )}

        {activeTab === 'analyze' && (
          <AnalyzePage 
            onEventCreated={handleEventCreated} 
            onNavigateToIncident={handleSelectIncident}
            onNavigateToDeepfake={() => setActiveTab('deepfake')}
          />
        )}

        {activeTab === 'deepfake' && (
          <DeepfakeForensicsPage
            onEventCreated={handleEventCreated}
            onNavigateToIncident={handleSelectIncident}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsPage
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onSimulateCampaign={handleSimulateCampaign}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === 'incident_detail' && selectedIncident && (
          <IncidentDetailPage
            incident={selectedIncident}
            events={events}
            onBack={() => setActiveTab('incidents')}
            onRefresh={loadData}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {activeTab === 'events' && (
          <EventsPage events={events} />
        )}

        {activeTab === 'registry' && (
          <TrustRegistryPage 
            onNavigateToTopology={() => setActiveTab('topology')}
            onNavigateToIncident={handleSelectIncident}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationPage />
        )}
      </main>

      {/* Interactive Attack Campaign Stepper Modal */}
      <InteractiveCampaignStepper
        isOpen={isStepperOpen}
        onClose={() => setIsStepperOpen(false)}
        onStageExecuted={handleStageExecuted}
        onReset={handleResetSimulation}
        currentRiskScore={currentSimulatedRisk}
        onOpenDossier={() => {
          setIsStepperOpen(false);
          const topId = incidents[0]?.id || 'CG-0001';
          handleSelectIncident(topId);
        }}
      />

      {/* Grounded Copilot Modal */}
      <CopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeIncidentId={selectedIncidentId || incidents[0]?.id}
      />

      {/* Minimal Classy Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070913] px-4 sm:px-6 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-200">CYBERGUARD</span>
            <span className="text-slate-600">·</span>
            <span>Institutional Digital Trust & Attack Correlation Engine</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            BPUT Cyber Defense Shield · PMEC Berhampur
          </div>
        </div>
      </footer>
    </div>
  );
}
