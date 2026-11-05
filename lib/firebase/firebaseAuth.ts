// Browser-only: Firebase Auth for customer OTP login on /trackOrder. Kept apart from firebaseClient,
// which API routes also import on the server.
import { getAuth } from "firebase/auth";
import { firebaseApp } from "./firebaseClient";

export const auth = getAuth(firebaseApp);
auth.languageCode = "en";
