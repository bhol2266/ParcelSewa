import { NextResponse } from "next/server";
import { rtdb } from "@/lib/firebase/firebaseClient";
import { ref, set } from "firebase/database";

export async function GET() {
  try {
    const testRef = ref(rtdb, "testRealtimeData");

    await set(testRef, {
      message: "Realtime Database working!",
      time: Date.now(),
    });

    return NextResponse.json({
      status: "success",
      message: "Data written successfully",
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
    });
  }
}
