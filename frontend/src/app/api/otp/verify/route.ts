import { NextRequest, NextResponse } from "next/server";
import { createSignedCookie } from "@/lib/session";

export const dynamic = "force-static";

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp, firstName, lastName } = await req.json();
    if (!mobile || !otp) return NextResponse.json({ success: false, error: "Mobile and OTP required" }, { status: 400 });

    const normalized = String(mobile).replace(/^\+/, "");

    if (process.env.DEV_TEST_PHONE && normalized === process.env.DEV_TEST_PHONE) {
      if (String(otp) !== process.env.DEV_TEST_OTP) {
        return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
      }
      const customer = {
        id: `dev_${normalized}`,
        email: `${normalized}@poshakh.app`,
        phone: mobile,
        firstName: firstName ?? "Dev",
        lastName: lastName ?? "User",
      };
      const response = NextResponse.json({ success: true, customer });
      response.cookies.set("poshakh_token", createSignedCookie(customer), COOKIE_OPTS);
      return response;
    }

    const res = await fetch(`${BACKEND}/store/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: mobile, otp, firstName, lastName }),
    });

    const text = await res.text();
    let data: { customer?: Record<string, unknown>; error?: string; message?: string } = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error ?? data.message ?? "Invalid OTP" }, { status: res.status });
    }

    const customer = data.customer as { id: string; email: string; phone: string; firstName: string; lastName: string };
    const response = NextResponse.json({ success: true, customer });
    response.cookies.set("poshakh_token", createSignedCookie(customer), COOKIE_OPTS);
    return response;
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
