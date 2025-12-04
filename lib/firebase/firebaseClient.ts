import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { firebaseConfig } from "./firebaseConfig";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

export const db = getFirestore(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
export { firebaseApp };
