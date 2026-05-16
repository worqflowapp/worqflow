import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrcI-X7DKWT5klMJf-yw4srTqFCW6WWkQ",
  authDomain: "worqflow-67bff.firebaseapp.com",
  projectId: "worqflow-67bff",
  storageBucket: "worqflow-67bff.firebasestorage.app",
  messagingSenderId: "496653312164",
  appId: "1:496653312164:web:04e79c0a508745fc29c631",
  measurementId: "G-0G1RW4RJN6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);