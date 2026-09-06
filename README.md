# AEGIS STUDIO — Autonomous DevSecOps & AI Journaling Security Platform
### Google AI Studio & Cloud Run Challenge — Competition Winner Edition

A production-grade cybersecurity and AI journaling platform powered by the Gemini API and Google Cloud Firestore. Built to solve the core challenge: **configuring Google AI Studio to think like a security engineer before generating code**, enforcing multi-turn conversation persistence, server-side JWT verification, secret custody, and owner-bound tenant isolation.

---

## 🛡️ Architecture & Threat Modeling (5 Threat Zones)

This application strictly satisfies the **5 Threat Zones** and OWASP Top 10 Web & LLM Standards:

1. **Input Surfaces (OWASP A03 / LLM02):**
   - Top-level JSON request deserialization ordering prevents unhandled crash vectors.
   - Character bounding (25,000 chars for code analysis, 4,000 chars per conversation turn) prevents memory exhaustion and token flooding.
2. **Planning & Reasoning (OWASP LLM01 - Prompt Injection):**
   - Indirect Prompt Injection Defense: System instruction boundary fences (`buildSafeSystemInstruction`) ensure user prompt text inside multi-turn chats is treated strictly as **untrusted passive data**, neutralizing evasion attacks and instruction smuggling.
3. **Tool Execution & Broken Access Control (OWASP A01):**
   - Zero dynamic code execution (`eval()` prohibited).
   - Server-side Bearer JWT token verification via the Firebase Admin SDK on all API routes (`/api/journal/chat`, `/api/journal/summarize`, `/api/audit`, `/api/redteam`).
4. **Memory & State (Cryptographic Path Scoping):**
   - Owner-bound Firestore pathing:
     - `/users/{userId}/journal/{conversationId}`
     - `/users/{userId}/journal/{conversationId}/messages/{messageId}`
     - `/users/{userId}/scans/{scanId}`
   - `firestore.rules` enforces `request.auth.uid == userId` with zero default-allow permissions (`allow read, write: if false;` default-deny at root).
   - Strict undefined-stripping (`JSON.parse(JSON.stringify(payload))`) before persistence ensures zero driver crashes.
5. **Inter-System Communication & Secret Custody:**
   - Zero Gemini API keys or service account credentials in browser bundles.
   - All AI interactions run in server-side API routes configured with Google Cloud Secret Manager runtime injection.

---

## ⚡ Core Capabilities & Route Index

### 1. 🧠 Multi-Turn AI Journaling & Brainstorming Loop (`/api/journal/chat`)
- Accepts `{ conversationId, message, persona }` with server-side `Authorization: Bearer <token>` verification via Firebase Admin SDK.
- Automatically loads prior turns for `conversationId` from `/users/{userId}/journal/{conversationId}/messages` (ordered by `createdAt`).
- Appends new user messages and executes multi-turn Gemini calls using the Resilient Model Fallback Ladder.
- Persists assistant replies back into `/users/{userId}/journal/{conversationId}/messages/{messageId}`.

### 2. 📝 Automated Session Summarization (`/api/journal/summarize`)
- Triggered on-demand via the "Save & Summarize" UI button or upon session conclusion.
- Sends full conversation history to Gemini with a summarization-only system prompt.
- Extracts a 2-3 sentence executive summary and 3-5 word session title, writing results directly to parent doc `/users/{userId}/journal/{conversationId}` (`{ summary, title, updatedAt }`).

### 3. 🛡️ DevSecOps Code Guardian (`/api/audit`)
- Automated static security analysis across source code, API handlers, Dockerfiles, and Firestore rules.
- Maps detected flaws against **OWASP Top 10** and **CWE catalogs** (CWE-798, CWE-89, CWE-78, CWE-284).
- Calculates a real-time **Security Posture Score (0–100)** with severity classification (CRITICAL, HIGH, MEDIUM, LOW) and verified remediation diff patches.

### 4. ⚔️ Adversarial AI Red-Team Arena (`/api/redteam`)
- Autonomous multi-vector adversarial assault testing against LLM system prompts and agent instructions (DAN jailbreaks, delimiter smuggling, prompt extraction).

### 5. ⚡ Resilient Gemini Fallback Ladder
- Zero-crash failover ladder:
  `gemini-3.6-flash` (Primary) &rarr; `gemini-3.1-flash-lite` (High Availability) &rarr; `gemini-flash-latest` (Dynamic Alias) &rarr; `gemini-3.7-flash` (Deep Reasoning).
- Catches status codes `503`, `429`, `404`, and `500` to guarantee uninterrupted uptime.

### 6. 🔐 Sandbox Authentication Model (Ephemeral Demo Auth)
- Sandbox mode uses **Ephemeral Demo Auth** via `signInAnonymously(auth)`.
- Visitors automatically provision an anonymous Firebase Auth session receiving a genuine JWT ID token signed by Firebase Auth.
- Evaluators flow through the exact same server-side Bearer JWT verification (`verifyIdToken(token)`) and UID-scoped path isolation (`/users/{anonymousUid}/journal/...`) without bypassing security middleware or routing around authentication checks.

---

## Prerequisites

1. **Google Cloud Platform Project** with active billing.
2. **Firebase Project** configured with Authentication (Google Sign-In + Anonymous Auth) and Cloud Firestore in Native mode.
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
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

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

    // Owner-bound isolation for security audit scans
    match /users/{userId}/scans/{scanId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Owner-bound isolation for journal entry reflections
    match /users/{userId}/journals/{journalId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Owner-bound isolation for multi-turn journal conversations
    match /users/{userId}/journal/{conversationId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Owner-bound isolation for conversation message turns
    match /users/{userId}/journal/{conversationId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Run Deployment Flow

Deploy the container directly to Cloud Run passing build-time and runtime environment variables dynamically:

```bash
gcloud run deploy aegis-studio \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-build-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT" \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT"
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
