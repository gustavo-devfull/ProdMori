import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCsgETTEl2bWeCAaAosdwAT5FfUvnWJydY",
  authDomain: "loja-13939.firebaseapp.com",
  projectId: "loja-13939",
  storageBucket: "loja-13939.firebasestorage.app",
  messagingSenderId: "803150163726",
  appId: "1:803150163726:web:86d7d8049f74d6bf94b15f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;

