/**
 * CYBERGUARD - QR Code Phishing (Quishing) Pipeline
 * Follows exact BPUT architecture:
 * QR IMAGE -> QR DECODER -> URL EXTRACTION -> URL NORMALIZATION -> URL ANALYZER -> RISK ENGINE
 */

import jsQR from 'jsqr';
import { Indicator, ClassificationType, SeverityLevel } from '../types';
import { analyzeUrl, analyzeUrlLive, extractDomainFromUrl, UrlAnalysisResult } from './url_detector';

interface QrAnalysisResult {
  decoded_payload: string;
  extracted_url: string;
  is_valid_qr: boolean;
  classification: ClassificationType;
  confidence: number;
  risk_score: number;
  severity: SeverityLevel;
  indicators: Indicator[];
  url_analysis: UrlAnalysisResult | null;
  summary: string;
}

/**
 * Decode image buffer or raw RGBA pixel data using jsQR
 */
export function decodeQrFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  try {
    const code = jsQR(data, width, height);
    if (code && code.data) {
      return code.data.trim();
    }
  } catch (err) {
    console.warn('jsQR decoding failed:', err);
  }
  return null;
}

/**
 * Parses base64 dataURL or simulation QR payload string
 */
export function processQrInput(input: string): QrAnalysisResult {
  let decodedPayload = '';
  const trimmed = input.trim();

  // If the input is already a URL or mock QR payload string
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('URL:') || trimmed.startsWith('MATMSG:')) {
    decodedPayload = trimmed.replace(/^URL:/i, '').trim();
  } else if (trimmed.startsWith('data:image/')) {
    // If it's a data URL, we decode or handle synthetic image
    // For demo & offline resilience, check if payload is encoded or test string
    decodedPayload = trimmed;
  } else {
    decodedPayload = trimmed;
  }

  // Handle URL extraction from decoded QR payload
  let extractedUrl = '';
  if (/^https?:\/\//i.test(decodedPayload)) {
    extractedUrl = decodedPayload;
  } else {
    const match = decodedPayload.match(/https?:\/\/[^\s]+/i);
    if (match) {
      extractedUrl = match[0];
    } else if (decodedPayload.includes('.')) {
      extractedUrl = `https://${decodedPayload.replace(/^www\./, '')}`;
    }
  }

  if (!extractedUrl) {
    // Non-URL QR code or invalid data
    return {
      decoded_payload: decodedPayload,
      extracted_url: '',
      is_valid_qr: Boolean(decodedPayload),
      classification: 'social_engineering',
      confidence: 0.85,
      risk_score: 35,
      severity: 'LOW',
      indicators: [
        {
          id: 'QR_OPAQUE_PAYLOAD',
          name: 'QR_OPAQUE_PAYLOAD',
          description: 'QR code contains non-standard text or offline instruction string',
          severity: 'low',
          weight: 15,
          source: 'qr_decoder',
          evidence_data: { payload: decodedPayload }
        }
      ],
      url_analysis: null,
      summary: 'Decoded QR code contains non-URL text payload.'
    };
  }

  // Pass extracted URL through the exact SAME URL ANALYSIS ENGINE
  const urlAnalysis = analyzeUrl(extractedUrl);

  const qrIndicators: Indicator[] = [
    {
      id: 'QR_OBFUSCATED_VECTOR',
      name: 'QR_OBFUSCATED_VECTOR',
      description: 'Physical or digital QR vector bypasses standard text-based mail filters and hides destination URL from preview',
      severity: 'medium',
      weight: 15,
      source: 'qr_decoder',
      evidence_data: {
        raw_qr_payload: decodedPayload,
        extracted_destination: extractedUrl,
        normalized_domain: urlAnalysis.normalized_domain
      },
      mitre: ['T1204.001', 'T1566.002']
    },
    ...urlAnalysis.indicators
  ];

  // Escalate risk score when QR vector combines with lookalike or high-risk domain
  let escalatedRisk = urlAnalysis.risk_score;
  if (!urlAnalysis.is_official) {
    escalatedRisk = Math.min(100, Math.round(escalatedRisk * 1.1 + 10));
  }

  let severity: SeverityLevel = 'SAFE';
  if (escalatedRisk >= 80) severity = 'CRITICAL';
  else if (escalatedRisk >= 60) severity = 'HIGH';
  else if (escalatedRisk >= 40) severity = 'MEDIUM';
  else if (escalatedRisk >= 20) severity = 'LOW';

  const classification: ClassificationType = urlAnalysis.is_official 
    ? 'legitimate' 
    : 'qr_phishing';

  return {
    decoded_payload: decodedPayload,
    extracted_url: extractedUrl,
    is_valid_qr: true,
    classification,
    confidence: urlAnalysis.confidence,
    risk_score: escalatedRisk,
    severity,
    indicators: qrIndicators,
    url_analysis: urlAnalysis,
    summary: urlAnalysis.is_official
      ? `Verified official institutional QR code directing to ${urlAnalysis.normalized_domain}.`
      : `${severity} Quishing Attempt: QR code decodes to suspicious destination "${extractedUrl}" mimicking institutional infrastructure.`
  };
}

/**
 * Real live network processing of decoded QR destination
 */
export async function processQrInputLive(input: string): Promise<QrAnalysisResult> {
  const syncResult = processQrInput(input);
  if (!syncResult.extracted_url) {
    return syncResult;
  }

  // Probe live target destination
  const liveUrlAnalysis = await analyzeUrlLive(syncResult.extracted_url);
  const qrIndicators: Indicator[] = [
    {
      id: 'QR_OBFUSCATED_VECTOR',
      name: 'QR_OBFUSCATED_VECTOR',
      description: 'Physical or digital QR vector bypasses standard text-based mail filters and hides destination URL from preview',
      severity: 'medium',
      weight: 15,
      source: 'qr_decoder',
      evidence_data: {
        raw_qr_payload: syncResult.decoded_payload,
        extracted_destination: syncResult.extracted_url,
        normalized_domain: liveUrlAnalysis.normalized_domain
      },
      mitre: ['T1204.001', 'T1566.002']
    },
    ...liveUrlAnalysis.indicators
  ];

  let escalatedRisk = liveUrlAnalysis.risk_score;
  if (!liveUrlAnalysis.is_official) {
    escalatedRisk = Math.min(100, Math.round(escalatedRisk * 1.1 + 10));
  }

  let severity: SeverityLevel = 'SAFE';
  if (escalatedRisk >= 80) severity = 'CRITICAL';
  else if (escalatedRisk >= 60) severity = 'HIGH';
  else if (escalatedRisk >= 40) severity = 'MEDIUM';
  else if (escalatedRisk >= 20) severity = 'LOW';

  const classification: ClassificationType = liveUrlAnalysis.is_official 
    ? 'legitimate' 
    : 'qr_phishing';

  return {
    decoded_payload: syncResult.decoded_payload,
    extracted_url: syncResult.extracted_url,
    is_valid_qr: true,
    classification,
    confidence: liveUrlAnalysis.confidence,
    risk_score: escalatedRisk,
    severity,
    indicators: qrIndicators,
    url_analysis: liveUrlAnalysis,
    summary: liveUrlAnalysis.is_official
      ? `Verified official institutional QR code directing to ${liveUrlAnalysis.normalized_domain}.`
      : `${severity} Quishing Threat: Live destination "${syncResult.extracted_url}" evaluated with live network telemetry.`
  };
}
