/**
 * CYBERGUARD - Look-Alike Domain & Malicious URL Detector
 * Performs lexical analysis, homoglyph detection, string similarity against protected registry,
 * entropy calculation, and institutional deception scoring.
 */

import { Indicator, ClassificationType, SeverityLevel } from '../types';
import { db } from '../db';

export interface LiveProbeResult {
  is_reachable: boolean;
  status_code?: number;
  final_url?: string;
  redirect_count: number;
  has_https: boolean;
  hsts_enabled: boolean;
  page_title?: string;
  has_password_field: boolean;
  form_action_destinations: string[];
  external_form_action: boolean;
  latency_ms: number;
  error?: string;
}

export interface UrlAnalysisResult {
  url: string;
  normalized_domain: string;
  is_official: boolean;
  classification: ClassificationType;
  confidence: number;
  risk_score: number;
  severity: SeverityLevel;
  indicators: Indicator[];
  features: {
    url_length: number;
    subdomain_count: number;
    has_ip_host: boolean;
    has_at_symbol: boolean;
    has_punycode: boolean;
    has_homoglyphs: boolean;
    suspicious_tld: boolean;
    tld: string;
    path_entropy: number;
    lookalike_match?: {
      official_domain: string;
      similarity: number;
      method: string;
    };
    live_probe?: LiveProbeResult;
  };
  summary: string;
}

// Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; ++i) {
    matrix[i] = [i];
  }
  for (let i = 0; i <= an; ++i) {
    matrix[0][i] = i;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

// Calculate similarity ratio 0.0 - 1.0
function calculateStringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Shannon entropy calculation for randomness
function calculateShannonEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(frequencies)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

// Check for Cyrillic / Greek homoglyphs mimicking Latin letters
function detectHomoglyphs(str: string): boolean {
  // Look for Cyrillic letters that resemble Latin: a, c, e, o, p, x, y, s
  // Cyrillic range: \u0400-\u04FF
  const cyrillicRegex = /[\u0400-\u04FF]/;
  return cyrillicRegex.test(str);
}

// Normalize domain by stripping www, ports, paths
export function extractDomainFromUrl(url: string): { domain: string; path: string; fullNormalized: string } {
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = 'http://' + target;
  }
  try {
    const parsed = new URL(target);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return {
      domain,
      path: parsed.pathname + parsed.search,
      fullNormalized: `${parsed.protocol}//${parsed.host}${parsed.pathname}`
    };
  } catch {
    const clean = target.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].toLowerCase();
    return {
      domain: clean,
      path: '',
      fullNormalized: target
    };
  }
}

export function analyzeUrl(rawUrl: string): UrlAnalysisResult {
  const { domain, path: urlPath, fullNormalized } = extractDomainFromUrl(rawUrl);
  const indicators: Indicator[] = [];

  const parts = domain.split('.');
  const tld = parts.length > 1 ? parts.slice(-1)[0] : '';
  const subdomainCount = Math.max(0, parts.length - 2);

  const officialDomains = db.getDomains();
  const isRevoked = officialDomains.some(d => 
    d.status === 'REVOKED' && 
    (domain === d.domain.toLowerCase() || domain.endsWith('.' + d.domain.toLowerCase()))
  );

  if (isRevoked) {
    const revokedRecord = officialDomains.find(d => 
      d.status === 'REVOKED' && 
      (domain === d.domain.toLowerCase() || domain.endsWith('.' + d.domain.toLowerCase()))
    );
    return {
      url: fullNormalized,
      normalized_domain: domain,
      is_official: false,
      classification: 'credential_phishing',
      confidence: 0.99,
      risk_score: 99,
      severity: 'CRITICAL',
      indicators: [
        {
          id: 'REVOKED_HOSTILE_DOMAIN',
          name: 'REVOKED_HOSTILE_DOMAIN',
          description: `Domain "${domain}" is explicitly REVOKED and blacklisted in the Institutional Trust Registry (${revokedRecord?.organization || 'Hostile Entity'})`,
          severity: 'critical',
          weight: 45,
          source: 'url_analyzer',
          evidence_data: { domain, registry_status: 'REVOKED', organization: revokedRecord?.organization },
          mitre: ['T1583.001']
        }
      ],
      features: {
        url_length: rawUrl.length,
        subdomain_count: Math.max(0, domain.split('.').length - 2),
        has_ip_host: /^(\d{1,3}\.){3}\d{1,3}$/.test(domain),
        has_at_symbol: rawUrl.includes('@'),
        has_punycode: domain.startsWith('xn--') || domain.includes('.xn--'),
        has_homoglyphs: detectHomoglyphs(domain),
        suspicious_tld: true,
        tld,
        path_entropy: calculateShannonEntropy(urlPath)
      },
      summary: `CRITICAL BLACKLIST: "${domain}" is registered as REVOKED in the institutional trust panel. All network routing is quarantined.`
    };
  }

  const isOfficial = officialDomains.some(d => 
    (d.status === 'OFFICIAL' || d.status === 'APPROVED_SERVICE') && 
    (domain === d.domain.toLowerCase() || domain.endsWith('.' + d.domain.toLowerCase()))
  );

  const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain);
  const hasAtSymbol = rawUrl.includes('@');
  const hasPunycode = domain.startsWith('xn--') || domain.includes('.xn--');
  const hasHomoglyphs = detectHomoglyphs(domain);
  const pathEntropy = calculateShannonEntropy(urlPath);

  const suspiciousTlds = ['xyz', 'top', 'tk', 'ml', 'cf', 'live', 'support', 'online', 'click', 'site', 'work'];
  const hasSuspiciousTld = suspiciousTlds.includes(tld);

  let bestLookalike: { official_domain: string; similarity: number; method: string } | undefined;

  // Compare against registered official domains
  for (const official of officialDomains) {
    if (official.status === 'REVOKED') continue;
    const offDomain = official.domain.toLowerCase();
    if (domain === offDomain) continue;

    // Check 1: Brand/Subdomain embedding (e.g. pmec-exam-support.com, pmec.login-help.net)
    const baseOfficial = offDomain.split('.')[0]; // "pmec" or "bput"
    if (baseOfficial.length >= 3 && domain.includes(baseOfficial) && !isOfficial) {
      bestLookalike = {
        official_domain: offDomain,
        similarity: 0.92,
        method: 'brand_token_insertion_subdomain_hijack'
      };
      break;
    }

    // Check 2: Levenshtein distance on domain core
    const domainCore = domain.split('.')[0];
    if (baseOfficial.length >= 3) {
      const sim = calculateStringSimilarity(domainCore, baseOfficial);
      if (sim >= 0.75) {
        bestLookalike = {
          official_domain: offDomain,
          similarity: Number((sim * 100).toFixed(1)),
          method: 'normalized_edit_distance_similarity'
        };
        break;
      }
    }
  }

  let totalWeight = 0;

  if (isOfficial) {
    // Official institutional domain
    return {
      url: fullNormalized,
      normalized_domain: domain,
      is_official: true,
      classification: 'legitimate',
      confidence: 0.99,
      risk_score: 5,
      severity: 'SAFE',
      indicators: [
        {
          id: 'VERIFIED_INSTITUTIONAL_DOMAIN',
          name: 'VERIFIED_INSTITUTIONAL_DOMAIN',
          description: `Domain ${domain} matches official verified institutional trust registry`,
          severity: 'low',
          weight: 0,
          source: 'url_analyzer',
          evidence_data: { domain, registry_status: 'OFFICIAL' }
        }
      ],
      features: {
        url_length: rawUrl.length,
        subdomain_count: subdomainCount,
        has_ip_host: false,
        has_at_symbol: false,
        has_punycode: false,
        has_homoglyphs: false,
        suspicious_tld: false,
        tld,
        path_entropy: pathEntropy
      },
      summary: `Verified legitimate institutional destination: ${domain}`
    };
  }

  // Not official, check threat indicators
  if (bestLookalike) {
    const weight = 65;
    indicators.push({
      id: 'DOMAIN_LOOKALIKE',
      name: 'DOMAIN_LOOKALIKE',
      description: `Observed domain "${domain}" closely mimics protected institutional domain "${bestLookalike.official_domain}" (${bestLookalike.similarity}% similarity via ${bestLookalike.method})`,
      severity: 'critical',
      weight,
      source: 'url_analyzer',
      evidence_data: {
        observed_domain: domain,
        official_domain: bestLookalike.official_domain,
        similarity: bestLookalike.similarity,
        method: bestLookalike.method
      },
      mitre: ['T1566.002', 'T1586']
    });
    totalWeight += weight;
  }

  if (isIpHost) {
    const weight = 28;
    indicators.push({
      id: 'RAW_IP_HOST',
      name: 'RAW_IP_HOST',
      description: `URL uses bare numeric IP address "${domain}" instead of an institutional FQDN host`,
      severity: 'high',
      weight,
      source: 'url_analyzer',
      evidence_data: { ip: domain },
      mitre: ['T1566.002']
    });
    totalWeight += weight;
  }

  if (hasHomoglyphs || hasPunycode) {
    const weight = 30;
    indicators.push({
      id: 'HOMOGLYPH_PUNYCODE_SPOOF',
      name: 'HOMOGLYPH_PUNYCODE_SPOOF',
      description: 'Domain uses confusable non-ASCII characters or punycode encoding to disguise target host',
      severity: 'critical',
      weight,
      source: 'url_analyzer',
      evidence_data: { has_homoglyphs: hasHomoglyphs, has_punycode: hasPunycode },
      mitre: ['T1566.002']
    });
    totalWeight += weight;
  }

  if (hasAtSymbol) {
    const weight = 24;
    indicators.push({
      id: 'URL_USERINFO_OBFUSCATION',
      name: 'URL_USERINFO_OBFUSCATION',
      description: 'URL contains "@" symbol indicating credential embedding or host confusion obfuscation',
      severity: 'high',
      weight,
      source: 'url_analyzer',
      evidence_data: { rawUrl },
      mitre: ['T1566.002']
    });
    totalWeight += weight;
  }

  if (hasSuspiciousTld) {
    const weight = 16;
    indicators.push({
      id: 'HIGH_RISK_TLD',
      name: 'HIGH_RISK_TLD',
      description: `Domain uses top-level domain .${tld} frequently associated with low-cost throwaway phishing assets`,
      severity: 'medium',
      weight,
      source: 'url_analyzer',
      evidence_data: { tld },
      mitre: ['T1586']
    });
    totalWeight += weight;
  }

  if (subdomainCount >= 3) {
    const weight = 14;
    indicators.push({
      id: 'EXCESSIVE_SUBDOMAINS',
      name: 'EXCESSIVE_SUBDOMAINS',
      description: `Domain contains ${subdomainCount} subdomains which is characteristic of dynamic evasion routing`,
      severity: 'medium',
      weight,
      source: 'url_analyzer',
      evidence_data: { subdomain_count: subdomainCount },
      mitre: ['T1566.002']
    });
    totalWeight += weight;
  }

  // Suspicious credential path keywords
  const credentialPaths = /(login|signin|portal|verify|auth|session|account-update|exam-cell|bput-result)/i;
  if (credentialPaths.test(urlPath)) {
    const weight = 20;
    indicators.push({
      id: 'DECEPTIVE_AUTH_PATH',
      name: 'DECEPTIVE_AUTH_PATH',
      description: `URL path targets authentication endpoint "${urlPath}" on an unapproved external domain`,
      severity: 'high',
      weight,
      source: 'url_analyzer',
      evidence_data: { path: urlPath },
      mitre: ['T1566.002', 'T1056']
    });
    totalWeight += weight;
  }

  if (rawUrl.length > 75) {
    const weight = 8;
    indicators.push({
      id: 'EXCESSIVE_URL_LENGTH',
      name: 'EXCESSIVE_URL_LENGTH',
      description: `URL length (${rawUrl.length} chars) exceeds standard institutional link thresholds`,
      severity: 'low',
      weight,
      source: 'url_analyzer',
      evidence_data: { length: rawUrl.length },
      mitre: ['T1566.002']
    });
    totalWeight += weight;
  }

  const riskScore = Math.min(100, Math.round(totalWeight * 1.1));

  let severity: SeverityLevel = 'SAFE';
  let classification: ClassificationType = 'legitimate';

  if (riskScore >= 80) {
    severity = 'CRITICAL';
    classification = bestLookalike ? 'lookalike_domain' : 'credential_phishing';
  } else if (riskScore >= 60) {
    severity = 'HIGH';
    classification = bestLookalike ? 'lookalike_domain' : 'credential_phishing';
  } else if (riskScore >= 40) {
    severity = 'MEDIUM';
    classification = 'social_engineering';
  } else if (riskScore >= 20) {
    severity = 'LOW';
    classification = 'social_engineering';
  } else {
    severity = 'SAFE';
    classification = 'legitimate';
  }

  const confidence = indicators.length === 0 ? 0.90 : Math.min(0.98, 0.72 + indicators.length * 0.07);

  let summary = '';
  if (severity === 'SAFE') {
    summary = `Domain ${domain} does not exhibit look-alike or malicious structural heuristics.`;
  } else {
    summary = `${severity} threat: URL ${domain} exhibits ${indicators.map(i => i.name).join(', ')}.`;
  }

  return {
    url: fullNormalized,
    normalized_domain: domain,
    is_official: false,
    classification,
    confidence,
    risk_score: riskScore,
    severity,
    indicators,
    features: {
      url_length: rawUrl.length,
      subdomain_count: subdomainCount,
      has_ip_host: isIpHost,
      has_at_symbol: hasAtSymbol,
      has_punycode: hasPunycode,
      has_homoglyphs: hasHomoglyphs,
      suspicious_tld: hasSuspiciousTld,
      tld,
      path_entropy: pathEntropy,
      lookalike_match: bestLookalike
    },
    summary
  };
}

/**
 * Real live network probe of target URL
 * Connects directly to check real HTTP status, redirects, SSL/TLS, and HTML structure
 */
export async function probeLiveUrl(rawUrl: string): Promise<LiveProbeResult> {
  const targetUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CyberGuard-Scanner/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeout);

    const latency = Date.now() - startTime;
    const finalUrl = res.url;
    const hasHttps = finalUrl.startsWith('https://');
    const hsts = Boolean(res.headers.get('strict-transport-security'));

    let pageTitle = '';
    let hasPasswordField = false;
    const formActions: string[] = [];
    let externalFormAction = false;

    try {
      const text = await res.text();
      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        pageTitle = titleMatch[1].trim();
      }
      hasPasswordField = /type=["']password["']/i.test(text);

      const formMatches = Array.from(text.matchAll(/<form[^>]+action=["']([^"']+)["']/gi));
      const originalHost = new URL(finalUrl).hostname;
      for (const m of formMatches) {
        const dest = m[1];
        formActions.push(dest);
        if (dest.startsWith('http://') || dest.startsWith('https://')) {
          try {
            const destHost = new URL(dest).hostname;
            if (destHost !== originalHost && !destHost.endsWith('.' + originalHost)) {
              externalFormAction = true;
            }
          } catch {}
        }
      }
    } catch {}

    return {
      is_reachable: true,
      status_code: res.status,
      final_url: finalUrl,
      redirect_count: finalUrl !== targetUrl ? 1 : 0,
      has_https: hasHttps,
      hsts_enabled: hsts,
      page_title: pageTitle,
      has_password_field: hasPasswordField,
      form_action_destinations: formActions,
      external_form_action: externalFormAction,
      latency_ms: latency
    };
  } catch (err: any) {
    return {
      is_reachable: false,
      has_https: targetUrl.startsWith('https://'),
      hsts_enabled: false,
      redirect_count: 0,
      has_password_field: false,
      form_action_destinations: [],
      external_form_action: false,
      latency_ms: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Connection timed out (>4000ms)' : (err.message || 'Host unreachable / DNS failure')
    };
  }
}

/**
 * Combined Lexical + Real Live Network Inspection
 */
export async function analyzeUrlLive(rawUrl: string): Promise<UrlAnalysisResult> {
  const baseResult = analyzeUrl(rawUrl);
  
  // Perform real-time live network probe
  const probe = await probeLiveUrl(rawUrl);
  baseResult.features.live_probe = probe;

  // Add indicators based on real network facts
  if (!probe.is_reachable && !baseResult.is_official) {
    baseResult.indicators.push({
      id: 'LIVE_PROBE_UNREACHABLE_HOST',
      name: 'LIVE_PROBE_UNREACHABLE_HOST',
      description: `Live DNS/HTTP probe failed: ${probe.error || 'Host offline'}. Characteristic of burned or transient phishing infrastructure`,
      severity: 'medium',
      weight: 15,
      source: 'url_analyzer',
      evidence_data: { error: probe.error },
      mitre: ['T1566.002']
    });
    baseResult.risk_score = Math.min(100, baseResult.risk_score + 10);
  }

  if (probe.is_reachable) {
    if (!probe.has_https && !baseResult.is_official) {
      baseResult.indicators.push({
        id: 'LIVE_INSECURE_HTTP_PROTOCOL',
        name: 'LIVE_INSECURE_HTTP_PROTOCOL',
        description: 'Live host communicates over unencrypted HTTP protocol without TLS certificate',
        severity: 'high',
        weight: 25,
        source: 'url_analyzer',
        evidence_data: { final_url: probe.final_url },
        mitre: ['T1566.002', 'T1040']
      });
      baseResult.risk_score = Math.min(100, baseResult.risk_score + 20);
    }

    if (probe.has_password_field && !baseResult.is_official) {
      baseResult.indicators.push({
        id: 'LIVE_CREDENTIAL_FORM_DETECTED',
        name: 'LIVE_CREDENTIAL_FORM_DETECTED',
        description: `Live webpage contains active password input elements on unofficial host "${baseResult.normalized_domain}"`,
        severity: 'critical',
        weight: 35,
        source: 'url_analyzer',
        evidence_data: { page_title: probe.page_title, forms: probe.form_action_destinations },
        mitre: ['T1056', 'T1566.002']
      });
      baseResult.risk_score = Math.min(100, Math.max(85, baseResult.risk_score + 30));
      baseResult.classification = 'credential_phishing';
      baseResult.severity = 'CRITICAL';
    }

    if (probe.external_form_action) {
      baseResult.indicators.push({
        id: 'LIVE_CROSS_ORIGIN_EXFILTRATION',
        name: 'LIVE_CROSS_ORIGIN_EXFILTRATION',
        description: 'Webpage form posts submitted credentials to a third-party cross-origin domain',
        severity: 'critical',
        weight: 40,
        source: 'url_analyzer',
        evidence_data: { form_destinations: probe.form_action_destinations },
        mitre: ['T1048', 'T1056']
      });
      baseResult.risk_score = 100;
      baseResult.severity = 'CRITICAL';
    }
  }

  // Recalculate severity if changed
  if (baseResult.risk_score >= 80) baseResult.severity = 'CRITICAL';
  else if (baseResult.risk_score >= 60) baseResult.severity = 'HIGH';
  else if (baseResult.risk_score >= 40) baseResult.severity = 'MEDIUM';
  else if (baseResult.risk_score >= 20) baseResult.severity = 'LOW';
  else baseResult.severity = 'SAFE';

  return baseResult;
}
