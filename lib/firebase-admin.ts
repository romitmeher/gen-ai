import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length > 0) return;
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn('Firebase Admin: Missing FIREBASE_PROJECT_ID');
    return;
  }
  
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // In Google Cloud Run / GCP environments, rely on default application credentials
      initializeApp({
        projectId,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export function getAdminAuth(): Auth {
  initAdmin();
  return getAuth();
}

export function getAdminDb(): Firestore {
  initAdmin();
  return getFirestore();
}


