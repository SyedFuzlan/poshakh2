import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("poshakh_token");
  return response;
}
