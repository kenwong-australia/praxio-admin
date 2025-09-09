import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let auth: Auth | null = null;

export function getFirebaseAuth() {
  if (auth) return auth;

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || '',
  };

  // Validate required Firebase config
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.error('Firebase configuration is missing required environment variables:', {
      apiKey: !!firebaseConfig.apiKey,
      authDomain: !!firebaseConfig.authDomain,
      projectId: !!firebaseConfig.projectId,
    });
    throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
  }

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  auth = getAuth();
  setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function getDb() {
  // Firestore shares the same default app
  return getFirestore();
}