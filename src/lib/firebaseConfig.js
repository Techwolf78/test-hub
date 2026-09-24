// lib/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp, writeBatch, doc, enableNetwork, disableNetwork } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Firestore for better connectivity
try {
  // Set aggressive timeouts for Firestore
  if (typeof window !== 'undefined') {
    // Re-enable network on load (in case it was disabled)
    enableNetwork(db).catch(e => console.log('Enable network error:', e.message));
  }
} catch (e) {
  console.log('Firestore config error:', e.message);
}

export { serverTimestamp, writeBatch, doc, enableNetwork, disableNetwork };