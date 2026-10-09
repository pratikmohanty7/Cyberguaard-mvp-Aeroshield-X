# CYBERGUARD Architecture Documentation
## AI-Powered Institutional Digital Trust & Cyber Defence Platform

*BPUT Hackathon Technical Specification*
*Domain: Parala Maharaja Engineering College (PMEC Berhampur) / Biju Patnaik University of Technology (BPUT Odisha)*

---

### 1. Architectural Philosophy: The Central Paradigm

Traditional cybersecurity tools evaluate events in isolated silos—an email filter inspects text in isolation, a web proxy checks domains in isolation, and an IAM system checks login failures in isolation. Attackers bypass these defenses by distributing low-volume signals across multiple channels.

CYBERGUARD introduces an institutional Digital Trust paradigm:

```
CONTENT + IDENTITY + BEHAVIOUR + TECHNICAL SIGNALS + CONTEXT
                           ↓
                    DIGITAL TRUST
                           ↓
                         RISK
                           ↓
                       INCIDENT
                           ↓
                       RESPONSE
```

Our primary architectural differentiator is:
**INSTITUTIONAL DIGITAL TRUST + CROSS-CHANNEL ATTACK CORRELATION + EVIDENCE-BASED RESPONSE**

---

### 2. High-Level System Architecture

```
                  ┌────────────────────────────────────────┐
                  │       CYBERGUARD REACT FRONTEND        │
                  │   Command Center · Deep Analyzer ·     │
                  │ Incident Dossier · Digital Trust Graph │
                  └───────────────────▲────────────────────┘
                                      │ REST / JSON
                                      ▼
                  ┌────────────────────────────────────────┐
                  │           EXPRESS API LAYER            │
                  │  /api/analyze/*  ·  /api/incidents/*   │
                  └───────────────────▲────────────────────┘
                                      │
         ┌────────────────────────────┴───────────────────────────┐
         │                                                        │
         ▼                                                        ▼
┌──────────────────┐                                     ┌──────────────────┐
│   HUMAN LAYER    │                                     │ TECHNOLOGY LAYER │
│ Message Detector │                                     │    Auth Guard    │
│  TF-IDF + Rules  │                                     │  Password Spray  │
│ Lookalike Domain │                                     │ Impossible Travel│
│ Levenshtein / TLD│                                     │ ATO Drift Engine │
│   QR Pipeline    │                                     │   New Devices    │
│  jsQR + URL Norm │                                     └────────┬─────────┘
│  Identity Guard  │                                              │
│ Trust Whitelist  │                                              │
└────────┬─────────┘                                              │
         │                                                        │
         └────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         COMMON EVIDENCE ENGINE         │
                  │ Normalizes Indicators into EVD Records │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         CALIBRATED RISK ENGINE         │
                  │  Deterministic 0-100 Score Breakdown   │
                  │   SAFE · LOW · MEDIUM · HIGH · CRIT    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │      INCIDENT CORRELATION ENGINE       │
                  │   Cross-Channel Graph & Campaign ATO   │
                  │      Escalation (CG-0001 Dossier)      │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │     RESPONSE PLAYBOOK & AUDIT LOG      │
                  │  Simulated Containment · Human Gate    │
                  │  Immutable Governance Audit Records    │
                  └────────────────────────────────────────┘
```

---

### 3. Core Component Design

#### A. Phishing Shield & URL Analysis
- **Text Engine:** Analyzes urgency keywords, fear pressure, credential/OTP demands, and fee exfiltration tokens.
- **Look-Alike Engine:** Compares observed domains against the registered institutional trust perimeter (`pmec.ac.in`, `bput.ac.in`, `bputexam.in`) using normalized Levenshtein distance, token embedding checks, Shannon entropy, homoglyph detection (Cyrillic lookalikes), and suspicious TLD classification (`.xyz`, `.top`, `.support`).
- **QR Pipeline:** Follows the strict pipeline:
  `QR IMAGE → QR DECODER → URL EXTRACTION → URL NORMALIZATION → URL ANALYZER → RISK ENGINE`
  The decoded URL passes through the exact same institutional inspection engine as typed links.

#### B. Institutional Identity Guard & Trust Registry
- Maintains approved institutional identities (e.g. Registrar, Principal, Examination Cell, Scholarships).
- Cross-references claimed identity with observed sender address, domain, and transmission channel.
- Unapproved channels (e.g., WhatsApp, personal Gmail) claiming official roles trigger immediate high-priority impersonation alerts.

#### C. Login Guard & Behavioral Authentication
- **Password Spraying:** Detects when a single external IP targets multiple distinct accounts within a temporal window.
- **Impossible Travel:** Uses the Haversine formula to compute great-circle distance between successive authentication locations; speeds exceeding commercial flight thresholds (>850 km/h) trigger impossible travel indicators.
- **Account Takeover (ATO):** Flags consecutive authentication failures followed by immediate valid session establishment from unrecognized device/location profiles.

#### D. Calibrated Risk Engine
- Deterministic 0–100 scale:
  - `0–20 SAFE` (Nominal Operations)
  - `21–40 LOW` (Passive Telemetry Logging)
  - `41–60 MEDIUM` (User Warning & Verification Challenge)
  - `61–80 HIGH` (Priority Investigation & Access Restriction)
  - `81–100 CRITICAL` (Immediate Automated Containment)
- Incorporates contextual escalation (e.g., Executive role sensitivity, multi-channel correlation multiplier).

#### E. Incident Correlation & Attack Graph
- Correlates independent events sharing entities (target user, attacking IP, look-alike domain, device fingerprint).
- Constructs interactive node-edge topologies linking Users, Messages, Domains, IPs, and Incidents.
- Traces multi-stage attack campaigns from initial phishing to session compromise.

#### F. Response Playbook & Audit System
- Human-in-the-loop authorization gate for critical actions (Session Revocation, Step-Up Hardware MFA).
- Zero-Harm safe simulation that generates verifiable audit records with actor credentials, rationale, and timestamps.

---

### 4. Technical Stack Justification

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | High-density information rendering, zero-latency state transitions, robust type safety. |
| **Backend** | Node.js, Express, TypeScript | High-throughput asynchronous event processing with unified TypeScript schemas. |
| **ML & Heuristics** | TF-IDF vocabulary weights, Levenshtein, Haversine | Lightweight, interpretable, deterministic, runs offline on standard laptop hardware without GPU requirements. |
| **Database** | Relational In-Memory + File Persistence | Fast local development, full ACID-like atomic event correlation, zero external database setup friction. |

---

### 5. Production Scalability Roadmap (Future Phase)

For national-scale or multi-university federation:
1. **Queue Architecture:** Apache Kafka / RabbitMQ for event ingestion from campus firewalls and email gateways.
2. **Data Persistence:** TimescaleDB / PostgreSQL for time-series auth telemetry and audit logs.
3. **Graph Storage:** Neo4j for large-scale institutional trust graph traversals across affiliated colleges.
4. **Federated Defense:** Shared anonymized threat indicators between BPUT and affiliated institutions.
