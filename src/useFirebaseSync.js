import { useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DOC_REF = doc(db, "shopstate", "main");

export function useSaveToFirebase(state) {
  useEffect(() => {
    const timer = setTimeout(() => {
      setDoc(DOC_REF, JSON.parse(JSON.stringify(state)))
        .catch(e => console.error("Save error:", e));
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);
}

export function useLoadFromFirebase(setState) {
  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        setState(snap.data());
      }
    });
    return () => unsub();
  }, []);
}
