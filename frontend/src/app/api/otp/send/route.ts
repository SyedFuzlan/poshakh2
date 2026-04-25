import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";

export const dynamic = "force-static";

export async function POST(req: NextRequest) {
  try {
    const { mobile, firstName, lastName } = await req.json();
    if (!mobile) return NextResponse.json({ success: false, error: "Mobile number required" }, { status: 400 });

    const normalized = String(mobile).replace(/^\+/, "");

    if (process.env.DEV_TEST_PHONE && normalized === process.env.DEV_TEST_PHONE) {
      return NextResponse.json({ success: true });
    }

    const res = await fetch(`${BACKEND}/store/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: mobile, firstName, lastName }),
    });

    const text = await res.text();
    let data: { error?: string; message?: string } = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (res.ok) return NextResponse.json({ success: true });
    return NextResponse.json({ success: false, error: data.error ?? data.message ?? "Failed to send OTP" }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
