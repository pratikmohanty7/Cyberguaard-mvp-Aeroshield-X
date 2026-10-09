import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ShieldAlert, 
  Globe, 
  QrCode, 
  Key, 
  Laptop, 
  CheckCircle2,
  Activity,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { RiskGauge } from './RiskGauge';

interface InteractiveCampaignStepperProps {
  onStageExecuted: (stageIndex: number) => Promise<void>;
  onReset: () => Promise<void>;
  currentRiskScore: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenDossier: () => void;
}

const CAMPAIGN_STAGES = [
  {
    num: 1,
    title: 'Urgent Pre-Matric Scholarship Notice',
    layer: 'Human / Social Engineering',
    source: 'SMS / Inbound Message',
    vector: 'Fake Pre-Matric Scholarship freeze lure with 24-hr deadline',
    risk: 52,
    severity: 'MEDIUM' as const,
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />
  },
  {
    num: 2,
    title: 'Physical Quishing Poster Vector',
    layer: 'Human / Visual Vector',
    source: 'QR Code Decoder',
    vector: 'Malicious QR on campus bulletin redirects to deceptive portal',
    risk: 70,
    severity: 'HIGH' as const,
    icon: <QrCode className="w-4 h-4 text-sky-400" />
  },
  {
    num: 3,
    title: 'Look-Alike Institutional Domain',
    layer: 'Human / Infrastructure Spoof',
    source: 'URL & Lexical Engine',
    vector: 'pmec-exam-support.com deployed with 92% brand token similarity',
    risk: 82,
    severity: 'CRITICAL' as const,
    icon: <Globe className="w-4 h-4 text-amber-400" />
  },
  {
    num: 4,
    title: 'Executive Impersonation (Registrar)',
    layer: 'Identity / Trust Registry',
    source: 'Identity Guard',
    vector: 'registrar-pmec-support@gmail.com on WhatsApp demanding student OTP',
    risk: 88,
    severity: 'CRITICAL' as const,
    icon: <Key className="w-4 h-4 text-purple-400" />
  },
  {
    num: 5,
    title: 'Distributed Password Spraying',
    layer: 'Technology / Authentication',
    source: 'Login Guard',
    vector: 'IP 185.220.101.4 simultaneously attacks student041-044 accounts',
    risk: 91,
    severity: 'CRITICAL' as const,
    icon: <Laptop className="w-4 h-4 text-rose-400" />
  },
  {
    num: 6,
    title: 'Impossible Travel Anomaly',
    layer: 'Technology / Geographic Baseline',
    source: 'Login Guard (Haversine)',
    vector: 'Relocation: Berhampur to Bucharest (6,052 km in 36m = 10,087 km/h)',
    risk: 94,
    severity: 'CRITICAL' as const,
    icon: <Activity className="w-4 h-4 text-rose-400" />
  },
  {
    num: 7,
    title: 'Active Account Takeover Compromise',
    layer: 'Cross-Channel Attack Correlation',
    source: 'Correlation Engine (CG-0001)',
    vector: '3 brute-force failures followed by valid session takeover on Kali Linux',
    risk: 96,
    severity: 'CRITICAL' as const,
    icon: <Zap className="w-4 h-4 text-rose-500" />
  }
];

export const InteractiveCampaignStepper: React.FC<InteractiveCampaignStepperProps> = ({
  onStageExecuted,
  onReset,
  currentRiskScore,
  isOpen,
  onClose,
  onOpenDossier
}) => {
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1..7
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1600);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      if (currentStep < CAMPAIGN_STAGES.length) {
        timer = setTimeout(async () => {
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          await onStageExecuted(nextStep);
        }, speedMs);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speedMs, onStageExecuted]);

  if (!isOpen) return null;

  const handleNextStep = async () => {
    if (currentStep < CAMPAIGN_STAGES.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await onStageExecuted(nextStep);
    }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    setCurrentStep(0);
    await onReset();
  };

  const activeStage = currentStep > 0 ? CAMPAIGN_STAGES[currentStep - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl font-sans select-none">
      <div className="bg-[#0D121F]/95 border border-white/15 rounded-[28px] max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-3xl">
        <div className="ios-grabber mt-3 mb-0" />
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Zap className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Attack Campaign Simulator
                </h3>
                <span className="text-xs text-slate-400 font-mono">· Incident CG-0001</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate multi-stage cyber attack vectors to observe real-time incident correlation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ios-pressable"
            aria-label="Close simulator"
          >
            ✕
          </button>
        </div>

        {/* Playback Control Bar - iOS Segmented styling */}
        <div className="px-5 py-3 bg-black/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(10); } catch(e){}
                setIsPlaying(!isPlaying);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all min-h-[38px] shadow-md ios-pressable ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-white hover:bg-slate-200 text-black'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play All Stages'}</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                handleNextStep();
              }}
              disabled={isPlaying || currentStep >= CAMPAIGN_STAGES.length}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/10 transition-all disabled:opacity-40 min-h-[38px] ios-pressable"
            >
              <span>Next Stage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
                handleReset();
              }}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 min-h-[38px] min-w-[38px] flex items-center justify-center transition-all ios-pressable"
              title="Reset to clean baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>Speed:</span>
            <div className="ios-segmented-track p-0.5">
              <button
                onClick={() => setSpeedMs(2200)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium transition-all ${speedMs === 2200 ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                1x
              </button>
              <button
                onClick={() => setSpeedMs(1400)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium transition-all ${speedMs === 1400 ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                1.5x
              </button>
              <button
                onClick={() => setSpeedMs(800)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium transition-all ${speedMs === 800 ? 'bg-white text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Live Active Stage Display */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {activeStage ? (
            <div className="bg-[#06080F] border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-sky-400 font-mono">
                    Stage {activeStage.num} of {CAMPAIGN_STAGES.length}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <SeverityBadge severity={activeStage.severity} size="sm" />
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{activeStage.layer}</span>
                </div>

                <h4 className="text-base font-semibold text-white tracking-tight">
                  {activeStage.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeStage.vector}
                </p>

                <div className="text-xs text-slate-400 pt-1">
                  Source: <strong className="text-slate-200">{activeStage.source}</strong> · Target: <strong className="text-white font-mono">student042@pmec.ac.in</strong>
                </div>
              </div>

              <div className="shrink-0 self-center md:self-auto">
                <RiskGauge score={activeStage.risk} severity={activeStage.severity} size="md" />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#06080F] border border-slate-800 rounded-xl space-y-2">
              <Zap className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">Ready to Simulate Attack Campaign</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click "Play All Stages" or "Next Stage" to trigger realistic synthetic events across phishing, look-alike domain, impersonation, and account takeover layers.
              </p>
            </div>
          )}

          {/* Stepper Timeline Progression */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">
              Pipeline Progress ({currentStep}/{CAMPAIGN_STAGES.length} Completed):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAMPAIGN_STAGES.map(stage => {
                const isCompleted = currentStep >= stage.num;
                const isCurrent = currentStep === stage.num;

                return (
                  <div
                    key={stage.num}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-colors ${
                      isCurrent
                        ? 'bg-slate-800/90 border-sky-500/50 text-white'
                        : isCompleted
                        ? 'bg-[#06080F] border-slate-800 text-slate-300'
                        : 'bg-[#06080F]/50 border-slate-800/50 text-slate-500'
                    }`}
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-[10px] font-mono">
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                          {stage.num}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{stage.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{stage.source}</div>
                    </div>

                    <span className="font-mono tabular-nums text-slate-400 text-xs">
                      {stage.risk}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#06080F] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {currentStep === CAMPAIGN_STAGES.length
              ? 'Full attack campaign correlated into Incident CG-0001'
              : 'Authorized Demonstration · Parala Maharaja Engineering College'}
          </span>

          <div className="flex items-center gap-2">
            {currentStep >= 3 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDossier();
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
              >
                Inspect Incident CG-0001 →
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
