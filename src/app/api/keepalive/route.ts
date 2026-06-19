import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/config';

// Force the route to be evaluated dynamically at runtime
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("Starting Keep-Alive Ping...");

    // 1. Ping Supabase directly to prevent pausing
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('counselors')
      .select('id')
      .limit(1);

    if (supabaseError) {
      console.error("Supabase Ping Error:", supabaseError);
    } else {
      console.log("Supabase Ping Success!");
    }

    // 2. Ping Hugging Face Backend to prevent it from going to sleep
    let backendStatus = "Skipped or Failed";
    try {
      const backendRes = await fetch(`${BACKEND_URL}/server-api/counselors`, { 
        method: 'GET',
        // Short timeout so Vercel function doesn't hang forever
        signal: AbortSignal.timeout(10000) 
      });
      if (backendRes.ok) {
        backendStatus = "Success";
        console.log("Backend Ping Success!");
      } else {
        backendStatus = `Failed with status ${backendRes.status}`;
      }
    } catch (err: any) {
      backendStatus = err.message;
      console.error("Backend Ping Error:", err);
    }

    return NextResponse.json({
      status: "Keep-Alive Ping Completed",
      timestamp: new Date().toISOString(),
      supabase: supabaseError ? "Failed" : "Success",
      backend: backendStatus
    }, { status: 200 });

  } catch (error: any) {
    console.error("Keep-Alive Critical Error:", error);
    return NextResponse.json({ 
      error: "Keep-alive failed", 
      details: error.message 
    }, { status: 500 });
  }
}
