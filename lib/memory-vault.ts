/**
 * In-Memory Fallback Vault
 * Provides zero-crash resilience for Sandbox Evaluators or when Cloud Firestore API
 * is pending enablement in the Google Cloud Console.
 */

export interface VaultDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
  summary: string;
  mood: string;
  color: string;
  reflectionPrompt: string;
  tags: string[];
  cognitivePatterns?: string[];
  growthOpportunity?: string;
  sentimentScore?: number;
  persona?: string;
  userId: string;
}

// Global persistence cache across Next.js API route invocations
declare global {
  var __memoryVault: Map<string, VaultDoc[]> | undefined;
}

if (!global.__memoryVault) {
  global.__memoryVault = new Map();
}

export const memoryVault = global.__memoryVault;

export function saveToMemoryVault(userId: string, doc: Omit<VaultDoc, 'id'>): string {
  const id = `vault-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fullDoc: VaultDoc = { id, ...doc };

  const userDocs = memoryVault.get(userId) || [];
  userDocs.unshift(fullDoc);
  memoryVault.set(userId, userDocs);

  return id;
}

export function getFromMemoryVault(userId: string): VaultDoc[] {
  return memoryVault.get(userId) || [];
}

export function deleteFromMemoryVault(userId: string, docId?: string): number {
  if (!docId) {
    const count = (memoryVault.get(userId) || []).length;
    memoryVault.delete(userId);
    return count;
  }

  const userDocs = memoryVault.get(userId) || [];
  const filtered = userDocs.filter((d) => d.id !== docId);
  const deletedCount = userDocs.length - filtered.length;
  memoryVault.set(userId, filtered);
  return deletedCount;
}
