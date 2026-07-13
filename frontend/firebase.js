import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "aichartboat.firebaseapp.com",
  projectId: "aichartboat",
  storageBucket: "aichartboat.firebasestorage.app",
  messagingSenderId: "975200324158",
  appId: "1:975200324158:web:0bde6b0bf94eba0842df6f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();