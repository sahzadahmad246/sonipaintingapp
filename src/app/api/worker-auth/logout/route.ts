import { NextResponse } from "next/server";
import { WORKER_SESSION_COOKIE } from "@/lib/worker-auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(WORKER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
