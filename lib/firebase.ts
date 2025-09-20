import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Firebase Admin SDK imports (server-side only)
let initializeAdminApp: any;
let getAdminApps: any;
let App: any;
let cert: any;
let getFirebaseAdminAuth: any;
let getAdminFirestore: any;

// Dynamically import Firebase Admin SDK only on server side
if (typeof window === 'undefined') {
  const firebaseAdmin = require('firebase-admin/app');
  const firebaseAdminAuth = require('firebase-admin/auth');
  const firebaseAdminFirestore = require('firebase-admin/firestore');
  
  initializeAdminApp = firebaseAdmin.initializeApp;
  getAdminApps = firebaseAdmin.getApps;
  App = firebaseAdmin.App;
  cert = firebaseAdmin.cert;
  getFirebaseAdminAuth = firebaseAdminAuth.getAuth;
  getAdminFirestore = firebaseAdminFirestore.getFirestore;
}

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

// Firebase Admin SDK (Server-side only)
let adminApp: any = null;

export function getFirebaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK can only be used on the server side');
  }

  if (adminApp) return adminApp;

  const adminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FB_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n')
      ?.replace(/"/g, '') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  };

  // Validate required Admin config
  if (!adminConfig.projectId || !adminConfig.privateKey || !adminConfig.clientEmail) {
    console.error('Firebase Admin configuration is missing required environment variables:', {
      projectId: !!adminConfig.projectId,
      privateKey: !!adminConfig.privateKey,
      clientEmail: !!adminConfig.clientEmail,
    });
    throw new Error('Firebase Admin configuration is incomplete. Please check your environment variables.');
  }

  if (!getAdminApps().length) {
    adminApp = initializeAdminApp({
      credential: cert({
        projectId: adminConfig.projectId,
        privateKey: adminConfig.privateKey,
        clientEmail: adminConfig.clientEmail,
      }),
    });
  } else {
    adminApp = getAdminApps()[0];
  }

  return adminApp;
}

export function getAdminAuth() {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK can only be used on the server side');
  }
  return getFirebaseAdminAuth();
}

export function getAdminDb() {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK can only be used on the server side');
  }
  return getAdminFirestore(getFirebaseAdmin());
}