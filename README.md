# AEGIS STUDIO — Autonomous DevSecOps & AI Red-Team Security Platform
### Google AI Studio & Cloud Run Challenge — Competition Winner Edition

A production-grade cybersecurity and AI defense studio powered by the Gemini API and Google Cloud Firestore. Built to solve the core ideathon challenge: **configuring AI Studio to think like a security engineer before generating code**, enforcing rigorous authorization barriers, secret custody, and mathematical tenant isolation.

---

## 🛡️ Architecture & Threat Modeling (5 Threat Zones)

This application strictly satisfies the **5 Threat Zones** and OWASP Top 10 Web & LLM Standards:

1. **Input Surfaces (OWASP A03 / LLM02):**
   - Top-level JSON request deserialization ordering prevents unhandled crash vectors.
   - Character bounding (25,000 chars for code analysis, 15,000 chars for prompt assault) prevents memory exhaustion and token flooding.
2. **Planning & Reasoning (OWASP LLM01 - Prompt Injection):**
   - Indirect Prompt Injection Defense: Boundary constraint fences ensure scanned source code and target system prompts are treated strictly as **untrusted passive data**, neutralizing evasion attacks and instruction smuggling.
3. **Tool Execution & Broken Access Control (OWASP A01):**
   - Zero dynamic code execution (`eval()` prohibited).
   - Server-side Bearer JWT token verification via the Firebase Admin SDK on all analysis routes (`/api/audit`, `/api/redteam`, `/api/scans`).
4. **Memory & State (Cryptographic Path Scoping):**
   - Owner-bound Firestore pathing (`/users/{userId}/scans/{scanId}`).
   - `firestore.rules` enforces `request.auth.uid == userId` with zero insecure defaults (`allow read, write: if true;` strictly prohibited).
   - Strict undefined-stripping (`JSON.parse(JSON.stringify(payload))`) before persistence ensures zero driver crashes.
5. **Inter-System Communication & Secret Custody:**
   - Zero Gemini API keys or service account credentials in browser bundles.
   - All AI interactions run in server-side API routes configured with Google Cloud Secret Manager runtime injection.

---

## ⚡ AEGIS Core Capabilities

### 1. 🛡️ DevSecOps Code Guardian (`/api/audit`)
- Automated static security analysis across source code, API handlers, Dockerfiles, and Firestore rules.
- Maps detected flaws against **OWASP Top 10** and **CWE catalogs** (CWE-798, CWE-89, CWE-78, CWE-284).
- Calculates a real-time **Security Posture Score (0–100)** with severity classification (CRITICAL, HIGH, MEDIUM, LOW).
- Synthesizes a **Verified Remediation Diff Patch** with a 1-click copy button.
- **Multi-Source Code & Repository Importer (`/api/import`):**
  - **Full GitHub Repository Ingestion**: Ingests entire GitHub repositories (e.g. `https://github.com/owner/repo`), automatically indexes file trees via GitHub REST API, skips heavy media/binaries, and bundles all source files (`.py`, `.ts`, `.js`, etc.) into a cohesive multi-file project view for unified security analysis.
  - **Direct GitHub File Import**: Fetches individual files directly from public repositories or `raw.githubusercontent.com`.
  - **Google Drive & Docs Integration**: Ingests public shareable documents and text files directly via file ID export.
  - **Local File Upload & Drag-and-Drop**: Supports direct local file uploads (.ts, .py, .rules, Dockerfile, etc.) up to 500KB.
  - **Enterprise Anti-SSRF Protection**: Strict domain allowlist (`github.com`, `drive.google.com`, `docs.google.com`), loopback/private IP blocking (`127.0.0.1`, `10.*`, `192.168.*`, `172.16.*`, `169.254.169.254`), and 25,000 char bounded ingestion.
- Pre-loaded with 1-click vulnerability presets:
  - *Hardcoded API Key & Insecure Deserialization*
  - *Insecure Firestore Security Rules (Public Read/Write)*
  - *SQL & Command Injection Vector*

### 2. ⚔️ Adversarial AI Red-Team Arena (`/api/redteam`)
- Autonomous multi-vector adversarial assault testing against LLM system prompts and agent instructions.
- Simulates real-world exploit vectors:
  1. *Direct Instruction Override & DAN Persona Hijacking* (OWASP LLM01)
  2. *System Prompt Extraction & Exfiltration* (OWASP LLM06)
  3. *Delimiter Smuggling & XML/Markdown Breakout* (OWASP LLM01)
  4. *Indirect Payload Ingestion & Tool Hijacking* (OWASP LLM07)
- Live penetration scorecard: **Resilience Score (0–100)** with simulated outcomes (`BREACHED` vs. `DEFENDED`).
- Synthesizes an **AEGIS Hardened System Prompt** incorporating immutable priority rules, passive data fences, and anti-leakage clauses.

### 3. 🛡️ Live Security Posture Command Center
- Live 4-tab interactive command center where judges can test:
  - **5 Threat Zones Matrix** with real-time pass/fail telemetry.
  - **Firestore Rules Inspector** verifying mathematical user isolation.
  - **Prompt Injection Defense Simulator** firing live payloads.
  - **Gemini Fallback Ladder Telemetry**.

### 4. ⚡ Resilient Gemini Fallback Ladder
- Zero-crash failover ladder:
  `gemini-3.6-flash` (Primary) &rarr; `gemini-3.1-flash-lite` (High Availability) &rarr; `gemini-flash-latest` (Dynamic Alias) &rarr; `gemini-3.7-flash` (Deep Reasoning).
- Catches status codes `503`, `429`, `404`, and `500` to guarantee uninterrupted uptime.

### 5. 🚀 Instant Evaluator Sandbox
- 1-click preview mode allowing hackathon judges to immediately test all features without requiring localhost Google OAuth setup.

---

## Prerequisites

1. **Google Cloud Platform Project** with active billing.
2. **Firebase Project** configured with Authentication (Google Sign-In) and Cloud Firestore in Native mode.
3. **Google Cloud CLI (`gcloud`)** installed and authenticated.
4. **Node.js 20+** installed.

---

## Setup & Deployment Instructions

### 1. Enable Required Google Cloud APIs

```bash
gcloud services enable run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Configure Secret Management

Create a Google Cloud Secret Manager secret for your Gemini API key and grant access to the Cloud Run runtime service account:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Firestore Security Rules

Deploy the owner-bound security rules configured in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all access to unknown paths
    match /{document=**} {
      allow read, write: if false;
    }

    // Strict User Data Isolation: Users can only read and write their own security scans
    match /users/{userId}/scans/{scanId} {
      allow read, delete: if request.auth != null && request.auth.uid == userId;
      allow create, update: if request.auth != null 
        && request.auth.uid == userId 
        && (!('userId' in request.resource.data) || request.resource.data.userId == userId);
    }
  }
}
```

Deploy using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Run Deployment Flow

Deploy the container directly to Cloud Run:

```bash
gcloud run deploy aegis-studio \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 5. Required Campaign Labeling

Register the service for automated challenge verification:

```bash
gcloud run services update aegis-studio \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-south1
```

---

## Local Development

```bash
npm install
npm run dev
# Open in browser: http://localhost:3000
```
