import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Upload, 
  FileText, 
  Download, 
  Volume2, 
  VolumeX, 
  Radio, 
  RefreshCw,
  Video,
  Mic,
  Sliders,
  ArrowRight,
  Shield,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { DeepfakeAnalysisResult, DeepfakeModality, SecurityEvent } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { decodeAudioFile, analyzeRealAudioBuffer, RealAcousticFeatures } from '../utils/audioForensics';

interface DeepfakeForensicsPageProps {
  onEventCreated?: (event: SecurityEvent) => void;
  onNavigateToIncident?: (incidentId: string) => void;
}

interface PresetSample {
  id: string;
  name: string;
  modality: DeepfakeModality;
  targetAuthority: string;
  category: 'malicious' | 'benign';
  description: string;
  transcript: string;
  duration: string;
}

const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 'voice-clone-principal',
    name: 'Wire Transfer Authorization (Voice Clone)',
    modality: 'audio',
    targetAuthority: 'Prof. Chittaranjan Tripathy (Vice Chancellor)',
    category: 'malicious',
    description: 'Voice memo directing the finance office to immediately transfer endowment reserve funds before an audit freeze.',
    transcript: 'Hello, this is the Vice Chancellor speaking. We have an urgent emergency endowment audit today. I need you to immediately route the state scholarship reserve fund of fifteen lakh rupees to our special account before the treasury freeze at 4 PM.',
    duration: '0:14'
  },
  {
    id: 'video-deepfake-vc',
    name: 'Examination Cancellation Notice (Face Swap)',
    modality: 'video',
    targetAuthority: 'Prof. Chittaranjan Tripathy (Vice Chancellor)',
    category: 'malicious',
    description: 'Video announcement circulated on student messaging groups claiming all upcoming semester examinations are cancelled.',
    transcript: 'Dear students of PMEC Berhampur, due to unforeseen state-wide administrative irregularities, all BPUT semester examinations scheduled for this week are cancelled indefinitely until further notice.',
    duration: '0:22'
  },
  {
    id: 'audio-authentic-registrar',
    name: 'Convocation Keynote Address (Authentic Voice)',
    modality: 'audio',
    targetAuthority: 'Dr. Rashmi Rekha Sahoo (Registrar)',
    category: 'benign',
    description: 'Official address to graduating students and faculty in the main auditorium, verified against institutional records.',
    transcript: 'Welcome faculty members, esteemed guests, and graduating engineers to the fourteenth annual convocation ceremony of Parala Maharaja Engineering College. Degrees will be conferred starting at 10 AM.',
    duration: '0:18'
  },
  {
    id: 'video-authentic-tour',
    name: 'Campus Laboratory Walkthrough (Authentic Video)',
    modality: 'video',
    targetAuthority: 'Student Senate Representative',
    category: 'benign',
    description: 'Live smartphone video footage walking through the new robotics laboratory with verified biological facial pulse.',
    transcript: 'Good morning everyone! This is a quick walkthrough of the newly inaugurated mechanical robotics lab and the incubation center ahead of tomorrow’s technical symposium.',
    duration: '0:25'
  }
];

export const DeepfakeForensicsPage: React.FC<DeepfakeForensicsPageProps> = ({
  onEventCreated,
  onNavigateToIncident
}) => {
  const [activeModality, setActiveModality] = useState<DeepfakeModality>('audio');
  const [selectedPreset, setSelectedPreset] = useState<PresetSample>(PRESET_SAMPLES[0]);
  const [selectedEngine, setSelectedEngine] = useState<'hybrid' | 'rule' | 'ml'>('hybrid');
  
  // Custom metadata inputs
  const [customTitle, setCustomTitle] = useState(PRESET_SAMPLES[0].name);
  const [customTranscript, setCustomTranscript] = useState(PRESET_SAMPLES[0].transcript);
  const [customAuthority, setCustomAuthority] = useState(PRESET_SAMPLES[0].targetAuthority);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Interactive biometric & acoustic parameters
  const [interactiveJitter, setInteractiveJitter] = useState<number>(0.22);
  const [interactiveSilenceGaps, setInteractiveSilenceGaps] = useState<number>(5);
  const [interactiveBoundaryWarp, setInteractiveBoundaryWarp] = useState<number>(88);
  const [interactiveRppgBpm, setInteractiveRppgBpm] = useState<number>(0);
  const [interactiveLipSync, setInteractiveLipSync] = useState<number>(24);
  const [showTuningPanel, setShowTuningPanel] = useState<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  // Web Audio Context & Real Audio State
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [realAudioBuffer, setRealAudioBuffer] = useState<AudioBuffer | null>(null);
  const [realAcousticStats, setRealAcousticStats] = useState<RealAcousticFeatures | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micChunksRef = useRef<Blob[]>([]);

  // Visual Overlays Toggles for Video
  const [showFaceMesh, setShowFaceMesh] = useState(true);
  const [showRppgHeatmap, setShowRppgHeatmap] = useState(true);
  const [showBoundaryWarp, setShowBoundaryWarp] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DeepfakeAnalysisResult | null>(null);
  const [createdEvent, setCreatedEvent] = useState<SecurityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedDossier, setCopiedDossier] = useState(false);

  // Canvas Refs
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rppgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real Audio or Synthesized Sound Playback
  const startAudioPlayback = () => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // If user uploaded or recorded a real audio buffer, play the real audio!
      if (realAudioBuffer) {
        if (bufferSourceRef.current) {
          try { bufferSourceRef.current.stop(); } catch {}
        }
        const source = ctx.createBufferSource();
        source.buffer = realAudioBuffer;
        source.playbackRate.value = playbackSpeed;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0, currentTime % realAudioBuffer.duration);
        source.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
        bufferSourceRef.current = source;
        return;
      }

      // Otherwise synthesize scenario voice harmonics
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {}
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isMalicious = selectedPreset.category === 'malicious' || interactiveJitter < 0.5;
      osc.type = isMalicious ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isMalicious ? 220 : 196, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.015, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
    } catch {
      // AudioContext policy safe fallback
    }
  };

  const stopAudioPlayback = () => {
    try {
      if (bufferSourceRef.current) {
        bufferSourceRef.current.stop();
        bufferSourceRef.current.disconnect();
        bufferSourceRef.current = null;
      }
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
    } catch {}
  };

  // Sync sound with play/mute state
  useEffect(() => {
    if (isPlaying && !isMuted) {
      startAudioPlayback();
    } else {
      stopAudioPlayback();
    }
    return () => {
      stopAudioPlayback();
    };
  }, [isPlaying, isMuted, selectedPreset.category, interactiveJitter, realAudioBuffer]);

  // Load Preset
  const handleSelectPreset = (preset: PresetSample) => {
    stopAudioPlayback();
    setRealAudioBuffer(null);
    setRealAcousticStats(null);
    setSelectedPreset(preset);
    setActiveModality(preset.modality);
    setCustomTitle(preset.name);
    setCustomTranscript(preset.transcript);
    setCustomAuthority(preset.targetAuthority);
    setUploadedFileName(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setAnalysisResult(null);

    // Sync parameters
    const isMalicious = preset.category === 'malicious';
    setInteractiveJitter(isMalicious ? 0.22 : 1.45);
    setInteractiveSilenceGaps(isMalicious ? 5 : 0);
    setInteractiveBoundaryWarp(isMalicious ? 88 : 8);
    setInteractiveRppgBpm(isMalicious ? 0 : 72);
    setInteractiveLipSync(isMalicious ? 24 : 91);
  };

  // Run Analysis
  const handleRunAnalysis = async (overrideParams?: boolean) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const isMaliciousCategory = selectedPreset.category === 'malicious';
      const jitterVal = overrideParams ? interactiveJitter : (isMaliciousCategory ? 0.22 : 1.45);
      const silenceVal = overrideParams ? interactiveSilenceGaps : (isMaliciousCategory ? 5 : 0);
      const boundaryVal = overrideParams ? interactiveBoundaryWarp > 40 : isMaliciousCategory;
      const rppgVal = overrideParams ? interactiveRppgBpm > 40 : !isMaliciousCategory;

      const payload = {
        modality: activeModality,
        title: customTitle,
        target_authority: customAuthority,
        transcript: customTranscript,
        file_name: uploadedFileName || selectedPreset.id,
        engine: selectedEngine,
        acoustic_features: {
          detected_jitter: jitterVal,
          silence_gaps: silenceVal
        },
        visual_features: {
          boundary_artifacts: boundaryVal,
          rppg_pulse_detected: rppgVal
        }
      };

      const res = await api.analyzeDeepfake(payload);
      if (res.success) {
        setAnalysisResult(res.analysis);
        setCreatedEvent(res.event);
        if (res.event && onEventCreated) {
          onEventCreated(res.event);
        }
      } else {
        setError(res.error || 'Forensic analysis could not be completed.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while contacting analysis service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Initial analysis on mount and when preset changes
  useEffect(() => {
    handleRunAnalysis();
  }, [selectedPreset.id]);

  // Audio Playback Timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 14) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.25;
        });
      }, 250 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Spectrogram Canvas Visualizer
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;
    const renderSpectrogram = () => {
      tick++;
      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#080A10';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal frequency grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw frequency bars
      const numBars = 52;
      const barWidth = width / numBars;
      const isMalicious = selectedPreset.category === 'malicious' || interactiveJitter < 0.5;

      for (let i = 0; i < numBars; i++) {
        const x = i * barWidth;
        const normalizedIdx = i / numBars;

        const waveSpeed = isPlaying ? tick * 0.08 : tick * 0.02;
        const baseAmp = Math.sin(normalizedIdx * 7 + waveSpeed) * 0.4 + 0.5;
        const noise = Math.sin(i * 11 + waveSpeed * 2) * 0.2;
        
        // Deepfake audio exhibits hard cutoff above 4.2 kHz (bars drop to near zero)
        let ampMultiplier = 1.0;
        if (isMalicious && i > 33) {
          ampMultiplier = 0.08;
        }

        const barHeight = Math.max(6, (baseAmp + noise) * ampMultiplier * (height - 24));
        const y = height - barHeight;

        // Monochrome with crisp light highlights
        if (isMalicious) {
          ctx.fillStyle = i > 33 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        }

        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

        // Highlight cutoff threshold on deepfake
        if (isMalicious && i === 34) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Scrubber Playhead Line
      const scrubX = (currentTime / 14) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scrubX, 0);
      ctx.lineTo(scrubX, height);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(renderSpectrogram);
    };

    renderSpectrogram();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, selectedPreset.category, interactiveJitter]);

  // Click-to-scrub on Spectrogram canvas
  const handleSpectrogramClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(percent * 14);
  };

  // rPPG Pulse Waveform Canvas
  useEffect(() => {
    const canvas = rppgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const renderRppg = () => {
      frame++;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.fillStyle = '#080A10';
      ctx.fillRect(0, 0, width, height);

      // Baseline reference
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      const isMalicious = selectedPreset.category === 'malicious' || interactiveRppgBpm === 0;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isMalicious ? '#EF4444' : '#10B981';

      for (let x = 0; x < width; x++) {
        let y = centerY;
        if (isMalicious) {
          // Synthetic face lacks pulsatile blood flow: flat sensor line with tiny jitter
          y += Math.sin(x * 0.15 + frame * 0.1) * 1.5 + (Math.random() - 0.5) * 2;
        } else {
          // Authentic human cardiac pulse waveform (systolic rise + dicrotic notch)
          const t = (x + frame * 2) * 0.05;
          const systolicPeak = Math.sin(t) * 20;
          const dicroticNotch = Math.sin(t * 2) * 7;
          y += -(systolicPeak + dicroticNotch);
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(renderRppg);
    };

    renderRppg();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedPreset.category, interactiveRppgBpm]);

  const handleCopyReport = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setCustomTitle(`Custom File: ${file.name}`);
    
    if (file.type.startsWith('video/')) {
      setActiveModality('video');
      setRealAudioBuffer(null);
      setRealAcousticStats(null);
      return;
    }

    setActiveModality('audio');
    try {
      setIsAnalyzing(true);
      setError(null);
      const decodedBuffer = await decodeAudioFile(file);
      setRealAudioBuffer(decodedBuffer);
      const dspFeatures = analyzeRealAudioBuffer(decodedBuffer);
      setRealAcousticStats(dspFeatures);

      setInteractiveJitter(dspFeatures.pitchJitterPercent);
      setInteractiveSilenceGaps(dspFeatures.silenceGaps);

      // Submit real DSP extracted metrics to backend
      const payload = {
        modality: 'audio' as const,
        title: `Forensic Analysis of ${file.name}`,
        target_authority: customAuthority,
        transcript: customTranscript || 'Extracted audio payload speech stream',
        file_name: file.name,
        engine: selectedEngine,
        acoustic_features: {
          detected_jitter: dspFeatures.pitchJitterPercent,
          silence_gaps: dspFeatures.silenceGaps
        }
      };
      const res = await api.analyzeDeepfake(payload);
      if (res.success) {
        setAnalysisResult(res.analysis);
        setCreatedEvent(res.event);
        if (res.event && onEventCreated) onEventCreated(res.event);
      }
    } catch (err: any) {
      console.error('Audio decoding error:', err);
      setError(`Failed to decode audio file: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startMicRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) micChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(micChunksRef.current, { type: 'audio/webm' });
        const fileName = `live_voice_${Date.now()}.webm`;
        setUploadedFileName(fileName);
        setCustomTitle('Live Voice Recording');
        setActiveModality('audio');

        try {
          setIsAnalyzing(true);
          const decodedBuffer = await decodeAudioFile(audioBlob);
          setRealAudioBuffer(decodedBuffer);
          const dspFeatures = analyzeRealAudioBuffer(decodedBuffer);
          setRealAcousticStats(dspFeatures);

          setInteractiveJitter(dspFeatures.pitchJitterPercent);
          setInteractiveSilenceGaps(dspFeatures.silenceGaps);

          const payload = {
            modality: 'audio' as const,
            title: 'Live Voice Recording',
            target_authority: customAuthority,
            transcript: customTranscript || 'Live captured microphone voice sample',
            file_name: fileName,
            engine: selectedEngine,
            acoustic_features: {
              detected_jitter: dspFeatures.pitchJitterPercent,
              silence_gaps: dspFeatures.silenceGaps
            }
          };
          const res = await api.analyzeDeepfake(payload);
          if (res.success) {
            setAnalysisResult(res.analysis);
            setCreatedEvent(res.event);
            if (res.event && onEventCreated) onEventCreated(res.event);
          }
        } catch (err: any) {
          setError(`Audio DSP decoding error: ${err.message}`);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingMic(true);
    } catch (err: any) {
      setError(err.message || 'Microphone recording permission denied.');
      setIsRecordingMic(false);
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      setIsRecordingMic(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Synthetic Media Forensics</span>
            <span aria-hidden="true">·</span>
            <span>Audio & Video Biometrics</span>
            <span aria-hidden="true">·</span>
            <span className="text-white">Institutional Baseline Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Deepfake & Voice Clone Inspection
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Inspect suspicious audio recordings, voicemails, and video statements for AI voice cloning, facial reenactment, and physiological liveness anomalies.
          </p>
        </div>

        {/* Model Engine Selector - iOS Segmented Control */}
        <div className="ios-segmented-track p-1 self-start md:self-auto shrink-0 border border-white/10">
          <button
            onClick={() => setSelectedEngine('hybrid')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ios-pressable ${
              selectedEngine === 'hybrid'
                ? 'bg-white text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gemini Multimodal AI
          </button>
          <button
            onClick={() => setSelectedEngine('rule')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ios-pressable ${
              selectedEngine === 'rule'
                ? 'bg-white text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Spectral FFT Rules
          </button>
          <button
            onClick={() => setSelectedEngine('ml')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ios-pressable ${
              selectedEngine === 'ml'
                ? 'bg-white text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Biometric Models
          </button>
        </div>
      </div>

      {/* Test Scenarios - Clean List Grid */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Preset Investigation Scenarios
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PRESET_SAMPLES.map(preset => {
            const isSelected = selectedPreset.id === preset.id;
            const isMalicious = preset.category === 'malicious';
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-4 rounded-[22px] text-left transition-all relative group flex flex-col justify-between ios-pressable ${
                  isSelected
                    ? 'ios-widget border-white text-white shadow-xl bg-white/[0.08]'
                    : 'ios-widget text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className={`w-2 h-2 rounded-full ${isMalicious ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : 'bg-emerald-400 shadow-[0_0_6px_#10b981]'}`} />
                      {isMalicious ? 'Synthetic Sample' : 'Authentic Recording'}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {preset.duration}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white group-hover:text-white leading-snug">
                    {preset.name}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[170px]">{preset.targetAuthority}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Inspection Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Inspection & Media Player (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="ios-widget rounded-[26px] p-5 sm:p-6 space-y-4 shadow-xl">
            {/* Workbench Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                  {activeModality === 'audio' ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    {activeModality === 'audio' ? 'Audio Waveform & Spectral Analyzer' : 'Video Liveness & Facial Geometry Inspector'}
                  </h2>
                  <div className="text-xs text-slate-400">
                    Inspecting: {customTitle}
                  </div>
                </div>
              </div>

              {/* Modality Toggle */}
              <div className="ios-segmented-track p-1 border border-white/10">
                <button
                  onClick={() => setActiveModality('audio')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ios-pressable ${
                    activeModality === 'audio'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Audio
                </button>
                <button
                  onClick={() => setActiveModality('video')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ios-pressable ${
                    activeModality === 'video'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            {/* Audio Modality View */}
            {activeModality === 'audio' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Frequency Spectrum (0 Hz – 8000 Hz) · Click canvas to scrub</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white"></span> Energy
                    </span>
                    {selectedPreset.category === 'malicious' && (
                      <span className="flex items-center gap-1 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span> 4.2 kHz Vocoder Cutoff
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative border border-white/[0.08] rounded-lg overflow-hidden bg-[#080A10]">
                  <canvas
                    ref={spectrogramCanvasRef}
                    onClick={handleSpectrogramClick}
                    width={640}
                    height={200}
                    className="w-full h-48 block cursor-pointer"
                  />
                  {selectedPreset.category === 'malicious' && (
                    <div className="absolute top-2.5 right-2.5 bg-black/80 border border-red-500/40 text-red-300 text-[10px] px-2.5 py-1 rounded font-mono">
                      Artificial Cutoff (&gt;4.2 kHz)
                    </div>
                  )}
                </div>

                {/* Player Controls Bar */}
                <div className="flex items-center justify-between gap-3 p-3 bg-[#080A10] border border-white/[0.08] rounded-lg">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-200 text-black flex items-center justify-center transition-colors shadow-sm"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTime(0);
                      }}
                      className="w-9 h-9 rounded-lg bg-[#161B26] hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                      title="Reset Position"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono text-slate-300 min-w-[75px] ml-1">
                      00:{String(Math.floor(currentTime)).padStart(2, '0')} / 00:14
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                    <select
                      value={playbackSpeed}
                      onChange={e => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-[#161B26] border border-white/10 text-[11px] text-slate-300 rounded px-2.5 py-1 focus:outline-none"
                    >
                      <option value={0.5}>0.5x Speed</option>
                      <option value={1}>1.0x Normal</option>
                      <option value={1.5}>1.5x Fast</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Video Modality View */
              <div className="space-y-3">
                <div className="relative border border-white/[0.08] rounded-lg overflow-hidden bg-[#080A10] aspect-video flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0E1118] via-[#0A0D14] to-black">
                    {/* Head Silhouette Frame */}
                    <div className="relative w-40 h-52 rounded-[45%] border border-slate-700 bg-slate-800/20 flex flex-col items-center justify-center shadow-xl">
                      {/* Facial Landmark Mesh Wireframe */}
                      {showFaceMesh && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 pointer-events-none">
                          <div className="w-full h-full border border-white/20 rounded-[40%] flex flex-col items-center justify-center relative">
                            {/* Eye Frames */}
                            <div className="flex justify-between w-20 mb-3">
                              <div className="w-6 h-3.5 border border-white/60 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                              <div className="w-6 h-3.5 border border-white/60 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            </div>
                            {/* Nose */}
                            <div className="w-0.5 h-6 bg-white/40 mb-2"></div>
                            {/* Mouth Viseme */}
                            <div className={`w-14 h-5 border ${selectedPreset.category === 'malicious' ? 'border-red-400 bg-red-500/10' : 'border-emerald-400 bg-emerald-500/10'} rounded flex items-center justify-center`}>
                              <span className="text-[8px] text-white font-mono">VISEME</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Boundary Seam Contour */}
                      {showBoundaryWarp && selectedPreset.category === 'malicious' && (
                        <div className="absolute -inset-1 rounded-[47%] border-2 border-red-500 border-dashed pointer-events-none"></div>
                      )}

                      {/* Capillary Blood Flush */}
                      {showRppgHeatmap && (
                        <div className={`absolute inset-4 rounded-full pointer-events-none opacity-30 ${
                          selectedPreset.category === 'malicious'
                            ? 'bg-transparent'
                            : 'bg-emerald-500/30'
                        }`} />
                      )}

                      <div className="text-[10px] text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-white/10 mt-auto mb-2 font-mono">
                        {customAuthority}
                      </div>
                    </div>

                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 text-[10px] font-mono">
                      <span className="bg-black/80 px-2 py-0.5 rounded text-white border border-white/10">
                        1080p · 29.97 FPS
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-slate-300 border border-white/10">
                      FRAME: {activeFrameIndex * 15 + 14} / 148
                    </div>
                  </div>
                </div>

                {/* Video Inspection Layers */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080A10] border border-white/[0.08] rounded-lg text-xs">
                  <div className="flex items-center gap-4 text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showFaceMesh}
                        onChange={e => setShowFaceMesh(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-white focus:ring-0"
                      />
                      <span>Facial Mesh (68-Point)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showRppgHeatmap}
                        onChange={e => setShowRppgHeatmap(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-white focus:ring-0"
                      />
                      <span>Capillary Pulse Flow</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showBoundaryWarp}
                        onChange={e => setShowBoundaryWarp(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-white focus:ring-0"
                      />
                      <span>Boundary Latent Seam</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Sample Frame:</span>
                    {['F14', 'F29', 'F48', 'F62'].map((fr, idx) => (
                      <button
                        key={fr}
                        onClick={() => setActiveFrameIndex(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          activeFrameIndex === idx
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-[#161B26] text-slate-300 border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        {fr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* rPPG Capillary Pulse Monitor */}
                <div className="p-3 bg-[#080A10] border border-white/[0.08] rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Biological Cardiac Pulse Waveform (rPPG Liveness)
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${
                      selectedPreset.category === 'malicious' || interactiveRppgBpm === 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {selectedPreset.category === 'malicious' || interactiveRppgBpm === 0 ? '0 BPM (ABSENT - SYNTHETIC)' : '72 BPM (HEALTHY BIOLOGICAL PULSE)'}
                    </span>
                  </div>
                  <canvas
                    ref={rppgCanvasRef}
                    width={640}
                    height={64}
                    className="w-full h-16 block rounded bg-black/60"
                  />
                </div>
              </div>
            )}

            {/* Interactive Biometric Parameter Stress-Test Drawer */}
            <div className="p-3.5 bg-[#080A10] border border-white/[0.08] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTuningPanel(!showTuningPanel)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-slate-300 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Interactive Parameter Tuning & Stress Test</span>
                  <span className="text-[10px] text-slate-500 font-normal">({showTuningPanel ? 'Hide Controls' : 'Show Controls'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isMal = selectedPreset.category === 'malicious';
                    setInteractiveJitter(isMal ? 0.22 : 1.45);
                    setInteractiveSilenceGaps(isMal ? 5 : 0);
                    setInteractiveBoundaryWarp(isMal ? 88 : 8);
                    setInteractiveRppgBpm(isMal ? 0 : 72);
                    setInteractiveLipSync(isMal ? 24 : 91);
                    handleRunAnalysis(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  Reset Defaults
                </button>
              </div>

              {showTuningPanel && (
                <div className="space-y-3 pt-2.5 border-t border-white/[0.06]">
                  {activeModality === 'audio' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">Pitch Jitter (F0 Variation):</span>
                          <span className={`font-mono font-bold ${interactiveJitter < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {interactiveJitter.toFixed(2)}% {interactiveJitter < 0.5 ? '(Flat TTS)' : '(Human Range)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="2.50"
                          step="0.05"
                          value={interactiveJitter}
                          onChange={e => setInteractiveJitter(parseFloat(e.target.value))}
                          className="w-full accent-white bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>0.05% (Synthetic)</span>
                          <span>1.2% (Natural Human)</span>
                          <span>2.5%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">Acoustic Silence Gaps:</span>
                          <span className={`font-mono font-bold ${interactiveSilenceGaps >= 3 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {interactiveSilenceGaps} pauses {interactiveSilenceGaps >= 3 ? '(Phase Cutoff)' : '(Continuous)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          step="1"
                          value={interactiveSilenceGaps}
                          onChange={e => setInteractiveSilenceGaps(parseInt(e.target.value))}
                          className="w-full accent-white bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>0 (Natural Room Ambient)</span>
                          <span>4 (Zero-Noise Cutoff)</span>
                          <span>8</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">Boundary Latent Warp:</span>
                          <span className={`font-mono font-bold ${interactiveBoundaryWarp > 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {interactiveBoundaryWarp}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={interactiveBoundaryWarp}
                          onChange={e => setInteractiveBoundaryWarp(parseInt(e.target.value))}
                          className="w-full accent-white bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>0% (Natural)</span>
                          <span>100% (Face-swap seam)</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">Capillary Pulse Flow:</span>
                          <span className={`font-mono font-bold ${interactiveRppgBpm < 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {interactiveRppgBpm} BPM
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="110"
                          step="5"
                          value={interactiveRppgBpm}
                          onChange={e => setInteractiveRppgBpm(parseInt(e.target.value))}
                          className="w-full accent-white bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>0 BPM (Synthetic)</span>
                          <span>72 BPM (Human)</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">Lip-Audio Sync:</span>
                          <span className={`font-mono font-bold ${interactiveLipSync < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {interactiveLipSync}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={interactiveLipSync}
                          onChange={e => setInteractiveLipSync(parseInt(e.target.value))}
                          className="w-full accent-white bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>10% (Desynced)</span>
                          <span>100% (Harmonized)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Adjust parameters to test how detection boundaries behave in edge cases.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunAnalysis(true)}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 bg-white hover:bg-slate-200 text-black rounded text-xs font-semibold transition-all active:scale-95"
                    >
                      Apply Parameters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Transcript & Metadata Editor */}
            <div className="p-4 bg-[#080A10] border border-white/[0.08] rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-white">Media Transcript & Target Authority</span>
                  <div className="text-[11px] text-slate-400">Upload any real audio file or record live voice from microphone</div>
                </div>

                <div className="flex items-center gap-2">
                  {isRecordingMic ? (
                    <button
                      type="button"
                      onClick={stopMicRecording}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>Stop Recording</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startMicRecording}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-black rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <Mic className="w-3.5 h-3.5 text-black" />
                      <span>Record Real Voice</span>
                    </button>
                  )}

                  <label className="cursor-pointer bg-[#12151E] hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Audio/Video</span>
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Real DSP Acoustic Measurements Telemetry */}
              {realAcousticStats && (
                <div className="p-3 bg-[#0E1118] border border-white/10 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      Real DSP Audio Analysis ({uploadedFileName})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      realAcousticStats.isSyntheticLikely 
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40' 
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {realAcousticStats.isSyntheticLikely ? 'SYNTHETIC VOCODER DETECTED' : 'NATURAL HUMAN VOICE VERIFIED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="p-2 bg-[#05060A] rounded border border-white/5">
                      <div className="text-slate-400">Measured Pitch Jitter</div>
                      <div className={`font-mono font-bold ${realAcousticStats.pitchJitterPercent < 0.4 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {realAcousticStats.pitchJitterPercent}%
                      </div>
                    </div>
                    <div className="p-2 bg-[#05060A] rounded border border-white/5">
                      <div className="text-slate-400">Mean Fundamental F0</div>
                      <div className="text-white font-mono font-bold">{realAcousticStats.meanPitchHz} Hz</div>
                    </div>
                    <div className="p-2 bg-[#05060A] rounded border border-white/5">
                      <div className="text-slate-400">Upper Spectral Cutoff</div>
                      <div className="text-white font-mono font-bold">~{realAcousticStats.spectralCutoffHz} Hz</div>
                    </div>
                    <div className="p-2 bg-[#05060A] rounded border border-white/5">
                      <div className="text-slate-400">Duration & Sample Rate</div>
                      <div className="text-white font-mono font-bold">{realAcousticStats.durationSec}s · {realAcousticStats.sampleRate} Hz</div>
                    </div>
                  </div>

                  {realAcousticStats.threatClues.length > 0 && (
                    <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-500/20 leading-relaxed">
                      <strong>Acoustic DSP Observations:</strong> {realAcousticStats.threatClues.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Impersonated / Target Identity</label>
                  <input
                    type="text"
                    value={customAuthority}
                    onChange={e => setCustomAuthority(e.target.value)}
                    className="w-full bg-[#12151E] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Recording Title / Identifier</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full bg-[#12151E] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Spoken Transcript</label>
                <textarea
                  rows={2}
                  value={customTranscript}
                  onChange={e => setCustomTranscript(e.target.value)}
                  className="w-full bg-[#12151E] border border-white/10 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-white/30 resize-none"
                  placeholder="Paste or transcribe the speech..."
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {uploadedFileName ? `Custom file: ${uploadedFileName}` : 'Referenced against PMEC Berhampur Authorized Leadership Registry'}
                </span>
                <button
                  onClick={() => handleRunAnalysis(true)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-white hover:bg-slate-200 disabled:opacity-50 text-black rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing Biometrics...' : 'Run Forensic Scan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forensic Findings & Verdict (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {error && (
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              {/* Verdict Card */}
              <div className={`p-5 rounded-xl border relative shadow-sm ${
                analysisResult.verdict === 'MANIPULATED_DEEPFAKE'
                  ? 'bg-[#12151E] border-red-500/40'
                  : 'bg-[#12151E] border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {analysisResult.verdict === 'MANIPULATED_DEEPFAKE' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    )}
                    <span className="text-sm font-bold text-white tracking-tight">
                      {analysisResult.verdict === 'MANIPULATED_DEEPFAKE' ? 'Manipulated Deepfake Detected' : 'Authentic Media Verified'}
                    </span>
                  </div>
                  <SeverityBadge severity={analysisResult.severity} />
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {analysisResult.threat_rationale}
                </p>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.08]">
                  <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                    <div className="text-[11px] text-slate-400">Synthetic Probability</div>
                    <div className={`text-2xl font-bold font-mono mt-0.5 tabular-nums ${
                      analysisResult.overall_deepfake_probability > 50 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {analysisResult.overall_deepfake_probability.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                    <div className="text-[11px] text-slate-400">Biological Liveness</div>
                    <div className={`text-2xl font-bold font-mono mt-0.5 tabular-nums ${
                      analysisResult.liveness_score < 40 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {analysisResult.liveness_score.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Biometric Signal Metrics */}
              <div className="bg-[#0E1118] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-3">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Biometric Signal Metrics</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {analysisResult.model_info.latency_ms.toFixed(1)}ms inference
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analysisResult.audio_metrics && (
                    <>
                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 block">Pitch Variation (Jitter)</span>
                        <span className="font-mono font-bold text-white text-xs mt-0.5 block tabular-nums">
                          {analysisResult.audio_metrics.pitch_jitter_pct}%
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {analysisResult.audio_metrics.pitch_jitter_pct < 0.5 ? '⚠️ Unnatural Flatness (TTS)' : '✓ Normal Human Speech'}
                        </span>
                      </div>

                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 block">Frequency Anomaly</span>
                        <span className="font-mono font-bold text-white text-xs mt-0.5 block tabular-nums">
                          {analysisResult.audio_metrics.spectral_rolloff_anomaly}%
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Rolloff phase discrepancy
                        </span>
                      </div>

                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06] col-span-2">
                        <span className="text-[11px] text-slate-400 block">Synthesis Profile</span>
                        <span className="font-mono text-xs text-white mt-0.5 block">
                          {analysisResult.audio_metrics.detected_tts_architecture || 'Biological Human Voiceprint'}
                        </span>
                      </div>
                    </>
                  )}

                  {analysisResult.video_metrics && (
                    <>
                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 block">Capillary Blood Flow</span>
                        <span className="font-mono font-bold text-white text-xs mt-0.5 block tabular-nums">
                          {analysisResult.video_metrics.rppg_liveness_pulse_bpm} BPM
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {analysisResult.video_metrics.rppg_pulse_confidence < 20 ? '⚠️ No Vascular Rhythm' : '✓ Authentic Circulation'}
                        </span>
                      </div>

                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 block">Boundary Seam Distortion</span>
                        <span className="font-mono font-bold text-white text-xs mt-0.5 block tabular-nums">
                          {analysisResult.video_metrics.boundary_warp_artifact_score}/100
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Edge mask blending score
                        </span>
                      </div>

                      <div className="p-3 bg-[#080A10] rounded-lg border border-white/[0.06] col-span-2">
                        <span className="text-[11px] text-slate-400 block">Viseme Alignment</span>
                        <span className="font-mono text-xs text-white mt-0.5 block">
                          Lip-Audio Match: {analysisResult.video_metrics.lip_sync_phoneme_congruence}% ({analysisResult.video_metrics.detected_face_swap_method})
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Forensic Evidence Checklist */}
              <div className="bg-[#0E1118] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-3">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Detected Indicators ({analysisResult.indicators.length})</span>
                  <span className="text-[11px] text-slate-400">MITRE: {analysisResult.mitre.join(', ') || 'T1656'}</span>
                </div>

                <div className="space-y-2">
                  {analysisResult.indicators.length === 0 ? (
                    <div className="p-3 bg-[#080A10] border border-white/[0.06] rounded-lg text-slate-400 text-xs">
                      No synthetic manipulation indicators detected. Media aligns with verified institutional acoustic profiles.
                    </div>
                  ) : (
                    analysisResult.indicators.map(ind => (
                      <div
                        key={ind.id}
                        className="p-3 bg-[#080A10] border border-white/[0.06] rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-red-300">{ind.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            +{ind.weight} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {ind.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Controls & Escalation */}
              <div className="bg-[#0E1118] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-3">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Containment & Response</span>
                  <button
                    onClick={handleCopyReport}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{copiedDossier ? 'Copied to Clipboard' : 'Export JSON Report'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {analysisResult.recommended_actions.map(action => (
                    <div
                      key={action}
                      className="flex items-center gap-2 p-2 bg-[#080A10] border border-white/[0.06] rounded-lg text-xs text-slate-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="font-mono text-[11px]">{action.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>

                {createdEvent && onNavigateToIncident && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <button
                      onClick={() => onNavigateToIncident(createdEvent.incident_id || 'CG-0001')}
                      className="w-full py-2.5 bg-white hover:bg-slate-200 text-black rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Investigate in Incident Command Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
