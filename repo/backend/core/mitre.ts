/**
 * CYBERGUARD - MITRE ATT&CK Mapping Matrix
 */

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
}

export const MITRE_TECHNIQUES: Record<string, MitreTechnique> = {
  'T1566': {
    id: 'T1566',
    name: 'Phishing',
    tactic: 'Initial Access',
    description: 'Adversaries send phishing messages to gain access to victim systems or harvest credentials.'
  },
  'T1566.001': {
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    tactic: 'Initial Access',
    description: 'Adversaries send spearphishing emails with malicious files or documents.'
  },
  'T1566.002': {
    id: 'T1566.002',
    name: 'Spearphishing Link',
    tactic: 'Initial Access',
    description: 'Adversaries send spearphishing messages with deceptive links directing victims to malicious websites.'
  },
  'T1586': {
    id: 'T1586',
    name: 'Compromise Accounts & Domains',
    tactic: 'Resource Development',
    description: 'Adversaries acquire or compromise look-alike domains and external services to mimic trusted institutional entities.'
  },
  'T1204.001': {
    id: 'T1204.001',
    name: 'User Execution: Malicious Link',
    tactic: 'Execution',
    description: 'An adversary relies on the user to follow a link or scan an unverified QR code.'
  },
  'T1056': {
    id: 'T1056',
    name: 'Input Capture',
    tactic: 'Collection / Credential Access',
    description: 'Adversaries use fake forms or harvest portals to capture user credentials and PINs.'
  },
  'T1056.001': {
    id: 'T1056.001',
    name: 'Keylogging / Web Form Credential Capture',
    tactic: 'Collection',
    description: 'Adversaries harvest web login inputs directly via spoofed login templates.'
  },
  'T1110': {
    id: 'T1110',
    name: 'Brute Force',
    tactic: 'Credential Access',
    description: 'Adversaries repeatedly guess authentication tokens or passwords to compromise accounts.'
  },
  'T1110.003': {
    id: 'T1110.003',
    name: 'Password Spraying',
    tactic: 'Credential Access',
    description: 'Adversaries use a single password against many distinct institutional user accounts to evade account lockouts.'
  },
  'T1078': {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'Defense Evasion / Initial Access',
    description: 'Adversaries obtain and abuse credentials of existing legitimate institutional accounts.'
  },
  'T1078.003': {
    id: 'T1078.003',
    name: 'Local & Cloud Accounts',
    tactic: 'Initial Access',
    description: 'Adversaries authenticate using valid academic portal or cloud credentials on untrusted devices.'
  },
  'T1539': {
    id: 'T1539',
    name: 'Steal Web Session Cookie / MFA Token',
    tactic: 'Credential Access',
    description: 'Adversaries solicit or capture secondary MFA verification tokens to bypass dual-factor defenses.'
  }
};

export function lookupMitreTechnique(id: string): MitreTechnique | undefined {
  return MITRE_TECHNIQUES[id];
}
