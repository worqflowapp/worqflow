import { useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DOC_REF = doc(db, "shopstate", "main");

export function useSaveToFirebase(state) {
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(DOC_REF, JSON.parse(JSON.stringify(state)))
        .catch(e => console.error("Save error:", e));
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [state]);
}

export function useLoadFromFirebase(setState) {
  const loaded = useRef(false);
  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        setState(prev => {
          const remote = snap.data();
          if (!loaded.current) {
            loaded.current = true;
            return { ...prev, ...remote };
          }
          return { ...prev, ...remote };
        });
      }
    });
    return () => unsub();
  }, []);
}
