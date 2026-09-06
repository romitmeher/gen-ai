'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
  isSandbox?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isSandbox: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  enterDemoSandbox: () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const SANDBOX_STORAGE_KEY = 'gemini_journal_sandbox_active';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSandbox, setIsSandbox] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || '');
      const name = event?.reason?.name || '';
      if (
        name === 'AbortError' ||
        msg.includes('BodyStreamBuffer') ||
        msg.includes('aborted')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Check if sandbox was previously selected in this browser session
    const wasSandbox = typeof window !== 'undefined' && sessionStorage.getItem(SANDBOX_STORAGE_KEY) === 'true';

    if (wasSandbox) {
      setUser({
        uid: 'sandbox-evaluator-uid',
        displayName: 'Ideathon Evaluator (Sandbox)',
        email: 'evaluator@ideathon.local',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=SecurityEvaluator',
        getIdToken: async () => 'sandbox-demo-token',
        isSandbox: true,
      });
      setIsSandbox(true);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
        setIsSandbox(false);
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          getIdToken: () => firebaseUser.getIdToken(),
          isSandbox: false,
        });
      } else if (!wasSandbox) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed before completion. Please try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not in your Firebase authorized domains list. Use Sandbox Evaluation Mode below to explore immediately.');
      } else if (code === 'auth/network-request-failed') {
        setAuthError('Network error connecting to Google Auth. Check your connection or use Sandbox Mode.');
      } else {
        setAuthError(error?.message || 'Failed to sign in with Google. You can use Sandbox Mode to evaluate instantly.');
      }
    }
  };

  const enterDemoSandbox = () => {
    setAuthError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SANDBOX_STORAGE_KEY, 'true');
    }
    setIsSandbox(true);
    setUser({
      uid: 'sandbox-evaluator-uid',
      displayName: 'Ideathon Evaluator (Sandbox)',
      email: 'evaluator@ideathon.local',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=SecurityEvaluator',
      getIdToken: async () => 'sandbox-demo-token',
      isSandbox: true,
    });
  };

  const logout = async () => {
    setAuthError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    }
    setIsSandbox(false);
    setUser(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSandbox,
        authError,
        signInWithGoogle,
        enterDemoSandbox,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
