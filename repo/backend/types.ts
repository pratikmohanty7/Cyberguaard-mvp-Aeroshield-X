/**
 * CYBERGUARD - Institutional Digital Trust & Cyber Defence Platform
 * Unified Evidence, Event, Incident & Trust Types
 */

export type SeverityLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventSource = 
  | 'message_analyzer'
  | 'url_analyzer'
  | 'qr_decoder'
  | 'identity_guard'
  | 'auth_guard'
  | 'fake_login_detector'
  | 'deepfake_detector'
  | 'deepfake_audio'
  | 'deepfake_video';

export type ClassificationType =
  | 'legitimate'
  | 'credential_phishing'
  | 'social_engineering'
  | 'lookalike_domain'
  | 'qr_phishing'
  | 'executive_impersonation'
  | 'unauthorized_channel'
  | 'password_spraying'
  | 'brute_force'
  | 'impossible_travel'
  | 'new_device_anomaly'
  | 'credential_harvesting'
  | 'account_takeover_risk'
  | 'coordinated_attack'
  | 'deepfake_audio'
  | 'deepfake_video'
  | 'synthetic_voice_clone'
  | 'face_swap_manipulation';

export interface Indicator {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number; // Contributing score 0-35
  source: EventSource;
  evidence_data: Record<string, any>;
  mitre?: string[];
}

export interface NormalizedEntities {
  user_id?: string;
  target_email?: string;
  sender?: string;
  sender_domain?: string;
  claimed_identity?: string;
  claimed_role?: string;
  url?: string;
  domain?: string;
  ip?: string;
  device?: string;
  location?: string;
  session_id?: string;
  timestamp?: string;
}

export interface SecurityEvent {
  event_id: string;
  timestamp: string;
  source: EventSource;
  classification: ClassificationType;
  confidence: number; // 0.0 - 1.0
  risk_score: number; // 0 - 100
  severity: SeverityLevel;
  entities: NormalizedEntities;
  indicators: Indicator[];
  recommended_actions: string[];
  mitre: string[];
  raw_input_summary: string;
  incident_id?: string;
}

export interface TrustIdentity {
  id: string;
  name: string;
  role: string;
  department: string;
  official_email: string;
  approved_domain: string;
  approved_channels: string[]; // e.g. ["institutional_email", "official_portal"]
  sensitivity_level: 'STANDARD' | 'HIGH' | 'EXECUTIVE';
  last_updated: string;
}

export interface TrustDomain {
  id: string;
  domain: string;
  organization: string;
  status: 'OFFICIAL' | 'APPROVED_SERVICE' | 'REVOKED';
  is_primary: boolean;
  notes?: string;
  dns_records?: {
    spf?: boolean;
    dkim?: boolean;
    dmarc?: boolean;
  };
  last_verified?: string;
}

export interface DigitalTrustNode {
  id: string;
  label: string;
  type: 'User' | 'Identity' | 'Sender' | 'URL' | 'Domain' | 'IP' | 'Device' | 'QR' | 'Audio' | 'Incident' | 'Message';
  risk: SeverityLevel;
  category?: 'Human' | 'Vector' | 'Infra' | 'Incident';
  mitre_code?: string;
  mitre_tactic?: string;
  risk_score?: number;
  status?: 'ACTIVE' | 'CONTAINED' | 'ISOLATED' | 'MONITORED';
  blast_radius?: number;
  metadata?: Record<string, any>;
}

export interface DigitalTrustEdge {
  id: string;
  source: string;
  target: string;
  relationship: 
    | 'claims_identity'
    | 'sent_by'
    | 'contains'
    | 'redirects_to'
    | 'targets'
    | 'logged_in_from'
    | 'uses_device'
    | 'correlated_in'
    | 'impersonates'
    | 'transmits_audio'
    | 'decodes_to'
    | string;
  label?: string;
  weight?: number;
  category?: 'flow' | 'causal' | 'identity' | 'infra';
  protocol?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: 'NEW' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  severity: SeverityLevel;
  risk_score: number;
  created_at: string;
  updated_at: string;
  target_user: string;
  target_identity?: string;
  summary: string;
  event_ids: string[];
  attack_stages: string[];
  indicators: Indicator[];
  mitre: string[];
  graph_nodes: DigitalTrustNode[];
  graph_edges: DigitalTrustEdge[];
  recommended_actions: ResponseActionDefinition[];
  audit_history: AuditLogEntry[];
}

export interface ResponseActionDefinition {
  action_id: string;
  title: string;
  description: string;
  criticality: 'STANDARD' | 'CRITICAL';
  status: 'RECOMMENDED' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED';
  executed_at?: string;
  executed_by?: string;
}

export interface AuditLogEntry {
  id: string;
  incident_id: string;
  action_id: string;
  action_title: string;
  status: 'SIMULATED / EXECUTED' | 'SIMULATED / APPROVED' | 'REJECTED';
  actor: string;
  reason: string;
  timestamp: string;
}

export interface EvaluationMetrics {
  total_samples: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  avg_latency_ms: number;
  modes: {
    rule_only: { precision: number; recall: number; f1: number; latency_ms: number };
    ml_only: { precision: number; recall: number; f1: number; latency_ms: number };
    hybrid: { precision: number; recall: number; f1: number; latency_ms: number };
  };
  limitations: string[];
}

export type DeepfakeModality = 'audio' | 'video' | 'multimodal_av';

export interface AudioForensicMetrics {
  synthetic_voice_probability: number; // 0 - 100
  pitch_jitter_pct: number;
  pitch_shimmer_pct: number;
  spectral_rolloff_anomaly: number; // 0 - 100
  harmonic_to_noise_ratio_db: number;
  vocoder_phase_discontinuity: number; // 0 - 100
  acoustic_silence_cutoffs: number;
  mfcc_distance_to_target?: number;
  detected_tts_architecture?: string; // e.g. "Diffusion Vocoder (ElevenLabs/XTTS-v2)", "Autoregressive Tacotron"
  voice_match_confidence?: number;
  target_voice_impersonated?: string;
  temporal_segments?: {
    time_start_sec: number;
    time_end_sec: number;
    anomaly_type: string;
    confidence: number;
  }[];
}

export interface VideoForensicMetrics {
  synthetic_face_probability: number; // 0 - 100
  rppg_liveness_pulse_bpm?: number;
  rppg_pulse_confidence: number; // 0 - 100 (unnatural capillary pulse absence = low)
  eye_blink_rate_per_min: number;
  eye_blink_regularity_score: number; // 0 - 100
  facial_landmark_jitter_score: number; // 0 - 100
  boundary_warp_artifact_score: number; // 0 - 100
  gan_frequency_checkerboard_score: number; // 0 - 100
  lip_sync_phoneme_congruence: number; // 0 - 100 (low = out of sync)
  detected_face_swap_method?: string; // e.g. "Roop/SimSwap High-Res", "LivePortrait Latent Warp"
  frames_analyzed: number;
  anomalous_frames: number[];
}

export interface DeepfakeAnalysisResult {
  modality: DeepfakeModality;
  classification: ClassificationType;
  overall_deepfake_probability: number; // 0 - 100
  liveness_score: number; // 0 - 100
  severity: SeverityLevel;
  risk_score: number;
  confidence: number;
  verdict: 'MANIPULATED_DEEPFAKE' | 'AUTHENTIC_BIOMETRIC' | 'SUSPICIOUS_LOW_QUALITY';
  threat_rationale: string;
  summary?: string;
  impersonated_authority?: string;
  audio_metrics?: AudioForensicMetrics;
  video_metrics?: VideoForensicMetrics;
  indicators: Indicator[];
  recommended_actions: string[];
  mitre: string[];
  model_info: {
    engine: string;
    latency_ms: number;
    modality_breakdown: string;
  };
}
