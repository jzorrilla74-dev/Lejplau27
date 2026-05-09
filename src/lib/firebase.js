import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const DOC_REF = () => doc(db, 'lejplau27', '79-woods-street');

export async function saveToFirestore(data) {
  try {
    await setDoc(DOC_REF(), { ...data, savedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('Firestore save failed:', e);
    return false;
  }
}

export async function loadFromFirestore() {
  try {
    const snap = await getDoc(DOC_REF());
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Firestore load failed:', e);
    return null;
  }
}
