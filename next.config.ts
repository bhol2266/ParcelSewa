import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyDY_Bn_ol1zd8f1T2vCSkUeGr9b0MB7V04",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "parcel-sewa.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "parcel-sewa",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "parcel-sewa.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "77205406370",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:77205406370:web:64537418eb85fbbbb24dfb",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-0GMBZ1L7JR",
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: "https://parcel-sewa-default-rtdb.asia-southeast1.firebasedatabase.app"
  }
};

export default nextConfig;
