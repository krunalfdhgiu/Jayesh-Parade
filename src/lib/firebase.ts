import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJpXN7HQywn7f0E_cfeDJ8L87E0jHe0C4",
  authDomain: "cricsense-ai.firebaseapp.com",
  projectId: "cricsense-ai",
  storageBucket: "cricsense-ai.firebasestorage.app",
  messagingSenderId: "43263837608",
  appId: "1:43263837608:web:af196c85d31f78010bc99d",
  measurementId: "G-ZQP8CXK2WY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
