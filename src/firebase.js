/**
 * ShopFlowTracker — Service Department Board
 * © 2025 Worqflow. All rights reserved.
 *
 * This software and its source code are proprietary
 * and confidential. Unauthorized copying, transfer,
 * or reproduction of the contents of this file, via
 * any medium, is strictly prohibited.
 *
 * Built by Worqflow — worqflow.vercel.app
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhh-lq9b8AtN7BEu8cDDXoGI_FlrKvRxg",
  authDomain: "worqflow-67bff.firebaseapp.com",
  projectId: "worqflow-67bff",
  storageBucket: "worqflow-67bff.firebasestorage.app",
  messagingSenderId: "496653312164",
  appId: "1:496653312164:web:c856ee685431a9cf29c631",
  measurementId: "G-KZG8P21LPM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
