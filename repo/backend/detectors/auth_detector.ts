/**
 * CYBERGUARD - Login Guard: Behavioral Authentication & Account Takeover Detector
 * Detects Password Spraying (multi-account targeting from single IP),
 * Impossible Travel (Haversine geodesic distance / speed calculation),
 * Device Anomaly, Baseline Drifts, and Credential Stuffing.
 */

import { Indicator, ClassificationType, SeverityLevel } from '../types';
import { db } from '../db';

export interface AuthLogRecord {
  id?: string;
  timestamp: string;
  user_id: string;
  ip: string;
  device: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: 'SUCCESS' | 'FAILURE';
  auth_method?: string;
}

interface AuthAnalysisResult {
  records_analyzed: number;
  classification: ClassificationType;
  confidence: number;
  risk_score: number;
  severity: SeverityLevel;
  indicators: Indicator[];
  anomalies: {
    password_spraying?: {
      attacking_ip: string;
      targeted_accounts: string[];
      total_failures: number;
    };
    impossible_travel?: {
      user_id: string;
      origin_location: string;
      destination_location: string;
      distance_km: number;
      elapsed_hours: number;
      implied_speed_kmh: number;
    };
    account_takeover?: {
      user_id: string;
      failed_attempts_count: number;
      subsequent_success: boolean;
      new_device: string;
      new_location: string;
    };
    new_device_anomalies: string[];
  };
  summary: string;
}

// Approximate coordinates for known demo cities
const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Berhampur, Odisha, IN': { lat: 19.3150, lon: 84.7941 },
  'Bhubaneswar, Odisha, IN': { lat: 20.2961, lon: 85.8245 },
  'Cuttack, Odisha, IN': { lat: 20.4625, lon: 85.8828 },
  'Rourkela, Odisha, IN': { lat: 22.2604, lon: 84.8536 },
  'Bengaluru, Karnataka, IN': { lat: 12.9716, lon: 77.5946 },
  'Moscow, Russia': { lat: 55.7558, lon: 37.6173 },
  'Bucharest, Romania': { lat: 44.4268, lon: 26.1025 },
  'Frankfurt, Germany': { lat: 50.1109, lon: 8.6821 },
  'Lagos, Nigeria': { lat: 6.5244, lon: 3.3792 }
};

// Haversine formula to compute great-circle distance between two geographic coordinates
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function parseAuthCsv(csvContent: string): AuthLogRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const records: AuthLogRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 4) continue;

    const record: any = {};
    headers.forEach((h, idx) => {
      record[h] = cols[idx];
    });

    records.push({
      timestamp: record.timestamp || new Date().toISOString(),
      user_id: record.user_id || record.username || 'unknown',
      ip: record.ip || record.ip_address || '127.0.0.1',
      device: record.device || record.user_agent || 'Unknown Device',
      location: record.location || 'Unknown Location',
      status: (record.status || '').toUpperCase() === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
      auth_method: record.auth_method || 'password'
    });
  }

  return records;
}

export function analyzeAuthLogs(logs: AuthLogRecord[]): AuthAnalysisResult {
  const indicators: Indicator[] = [];
  const anomalies: AuthAnalysisResult['anomalies'] = {
    new_device_anomalies: []
  };

  if (!logs || logs.length === 0) {
    return {
      records_analyzed: 0,
      classification: 'legitimate',
      confidence: 1.0,
      risk_score: 0,
      severity: 'SAFE',
      indicators: [],
      anomalies,
      summary: 'No authentication log entries provided.'
    };
  }

  // Sort logs chronologically
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // --- 1. Password Spraying Detection ---
  // Group failed attempts by IP and collect distinct user accounts targeted
  const ipFailuresMap: Record<string, { users: Set<string>; count: number }> = {};

  for (const log of sortedLogs) {
    if (log.status === 'FAILURE') {
      if (!ipFailuresMap[log.ip]) {
        ipFailuresMap[log.ip] = { users: new Set(), count: 0 };
      }
      ipFailuresMap[log.ip].users.add(log.user_id);
      ipFailuresMap[log.ip].count += 1;
    }
  }

  let totalWeight = 0;

  for (const [ip, data] of Object.entries(ipFailuresMap)) {
    // Distinct targeted accounts >= 3 indicates password spraying rather than simple typo
    if (data.users.size >= 3) {
      const targetedList = Array.from(data.users);
      anomalies.password_spraying = {
        attacking_ip: ip,
        targeted_accounts: targetedList,
        total_failures: data.count
      };

      const weight = 32;
      indicators.push({
        id: 'PASSWORD_SPRAYING_ATTACK',
        name: 'PASSWORD_SPRAYING_ATTACK',
        description: `Source IP ${ip} targeted ${data.users.size} distinct institutional accounts (${targetedList.slice(0, 4).join(', ')}) with ${data.count} credential attempts`,
        severity: 'critical',
        weight,
        source: 'auth_guard',
        evidence_data: {
          ip,
          distinct_accounts_count: data.users.size,
          targeted_accounts: targetedList,
          failure_count: data.count
        },
        mitre: ['T1110.003']
      });
      totalWeight += weight;
    }
  }

  // --- 2. Impossible Travel & Behavioral Baseline Check ---
  // Group logs by user
  const userLogsMap: Record<string, AuthLogRecord[]> = {};
  for (const log of sortedLogs) {
    if (!userLogsMap[log.user_id]) userLogsMap[log.user_id] = [];
    userLogsMap[log.user_id].push(log);
  }

  for (const [userId, userLogs] of Object.entries(userLogsMap)) {
    const baseline = db.getUserBaseline(userId);

    // Track consecutive failures followed by success
    let consecutiveFailures = 0;
    let successfulAtoLog: AuthLogRecord | null = null;

    for (let i = 0; i < userLogs.length; i++) {
      const current = userLogs[i];
      const prev = i > 0 ? userLogs[i - 1] : null;

      // Check consecutive failures
      if (current.status === 'FAILURE') {
        consecutiveFailures++;
      } else if (current.status === 'SUCCESS' && consecutiveFailures >= 3) {
        successfulAtoLog = current;
      }

      // Check device novelty
      if (baseline.normal_device && current.device && !current.device.includes(baseline.normal_device.split(' ')[0])) {
        if (!anomalies.new_device_anomalies.includes(`${userId}:${current.device}`)) {
          anomalies.new_device_anomalies.push(`${userId}:${current.device}`);
          const weight = 16;
          indicators.push({
            id: 'NEW_DEVICE_AUTHENTICATION',
            name: 'NEW_DEVICE_AUTHENTICATION',
            description: `User "${userId}" authenticated from unrecognized client device "${current.device}" (Baseline: "${baseline.normal_device}")`,
            severity: 'medium',
            weight,
            source: 'auth_guard',
            evidence_data: {
              user_id: userId,
              observed_device: current.device,
              baseline_device: baseline.normal_device
            },
            mitre: ['T1078.003']
          });
          totalWeight += weight;
        }
      }

      // Check login hour anomaly
      const date = new Date(current.timestamp);
      const hour = date.getHours();
      if (hour < baseline.active_hours[0] || hour > baseline.active_hours[1]) {
        indicators.push({
          id: 'ABNORMAL_LOGIN_HOURS',
          name: 'ABNORMAL_LOGIN_HOURS',
          description: `Authentication at ${hour}:00 for user "${userId}" falls outside standard active envelope (${baseline.active_hours[0]}:00-${baseline.active_hours[1]}:00)`,
          severity: 'low',
          weight: 10,
          source: 'auth_guard',
          evidence_data: { user_id: userId, observed_hour: hour, baseline_hours: baseline.active_hours }
        });
        totalWeight += 10;
      }

      // Impossible travel check against previous log
      if (prev && prev.location !== current.location) {
        const coord1 = LOCATION_COORDINATES[prev.location] || { lat: prev.latitude || 19.3150, lon: prev.longitude || 84.7941 };
        const coord2 = LOCATION_COORDINATES[current.location] || { lat: current.latitude || 55.7558, lon: current.longitude || 37.6173 };

        const distanceKm = calculateHaversineDistanceKm(coord1.lat, coord1.lon, coord2.lat, coord2.lon);
        const timeDiffMs = Math.abs(new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime());
        const elapsedHours = Math.max(0.05, timeDiffMs / (1000 * 60 * 60));
        const impliedSpeed = Math.round(distanceKm / elapsedHours);

        // Standard commercial flight threshold is ~850 km/h; anything higher is physically impossible
        if (distanceKm > 500 && impliedSpeed > 850) {
          anomalies.impossible_travel = {
            user_id: userId,
            origin_location: prev.location,
            destination_location: current.location,
            distance_km: distanceKm,
            elapsed_hours: Number(elapsedHours.toFixed(2)),
            implied_speed_kmh: impliedSpeed
          };

          const weight = 34;
          indicators.push({
            id: 'IMPOSSIBLE_TRAVEL_ANOMALY',
            name: 'IMPOSSIBLE_TRAVEL_ANOMALY',
            description: `Impossible geographic relocation for ${userId}: ${prev.location} to ${current.location} (${distanceKm} km in ${elapsedHours.toFixed(1)} hrs = ${impliedSpeed} km/h)`,
            severity: 'critical',
            weight,
            source: 'auth_guard',
            evidence_data: {
              user_id: userId,
              origin: prev.location,
              destination: current.location,
              distance_km: distanceKm,
              elapsed_hours: elapsedHours,
              implied_speed_kmh: impliedSpeed
            },
            mitre: ['T1078']
          });
          totalWeight += weight;
        }
      }
    }

    // Account Takeover Condition: multiple failed logins followed by successful login on new device/location
    if (successfulAtoLog && consecutiveFailures >= 3) {
      anomalies.account_takeover = {
        user_id: userId,
        failed_attempts_count: consecutiveFailures,
        subsequent_success: true,
        new_device: successfulAtoLog.device,
        new_location: successfulAtoLog.location
      };

      const weight = 38;
      indicators.push({
        id: 'ACCOUNT_TAKEOVER_BEHAVIOR',
        name: 'ACCOUNT_TAKEOVER_BEHAVIOR',
        description: `Brute force progression: ${consecutiveFailures} consecutive authentication failures followed by immediate valid session compromise from ${successfulAtoLog.location}`,
        severity: 'critical',
        weight,
        source: 'auth_guard',
        evidence_data: {
          user_id: userId,
          failures: consecutiveFailures,
          compromise_ip: successfulAtoLog.ip,
          compromise_location: successfulAtoLog.location
        },
        mitre: ['T1110', 'T1078']
      });
      totalWeight += weight;
    }
  }

  // Score calculation
  let riskScore = Math.min(100, Math.round(totalWeight * 0.95));

  // Determine classification and severity
  let severity: SeverityLevel = 'SAFE';
  let classification: ClassificationType = 'legitimate';

  if (riskScore >= 80) {
    severity = 'CRITICAL';
    classification = anomalies.account_takeover ? 'account_takeover_risk' : 'password_spraying';
  } else if (riskScore >= 60) {
    severity = 'HIGH';
    classification = anomalies.impossible_travel ? 'impossible_travel' : 'brute_force';
  } else if (riskScore >= 40) {
    severity = 'MEDIUM';
    classification = 'new_device_anomaly';
  } else if (riskScore >= 20) {
    severity = 'LOW';
    classification = 'new_device_anomaly';
  }

  const confidence = indicators.length === 0 ? 0.98 : Math.min(0.99, 0.78 + (indicators.length * 0.05));

  let summary = '';
  if (severity === 'CRITICAL') {
    summary = `CRITICAL ATO Threat: Detected ${indicators.map(i => i.name).join(' & ')}. Immediate session revocation and credential rotation required.`;
  } else if (severity === 'SAFE') {
    summary = `All ${logs.length} authentication events adhere to institutional baseline profiles without anomalies.`;
  } else {
    summary = `${severity} authentication anomaly observed across ${logs.length} analyzed records.`;
  }

  return {
    records_analyzed: logs.length,
    classification,
    confidence,
    risk_score: riskScore,
    severity,
    indicators,
    anomalies,
    summary
  };
}
