import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { normalizeMobile, verifyMobileOtp } from "@/lib/twilio-verify";
import {
  createWorkerSessionToken,
  WORKER_SESSION_COOKIE,
  workerSessionCookieOptions,
} from "@/lib/worker-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mobileRaw = body?.mobile;
    const otpCode = body?.code;

    if (!mobileRaw || !otpCode || typeof mobileRaw !== "string" || typeof otpCode !== "string") {
      return NextResponse.json({ error: "Mobile and OTP code are required" }, { status: 400 });
    }

    const mobile = normalizeMobile(mobileRaw);

    await dbConnect();

    const worker = await Worker.findOne({ mobile });
    if (!worker || worker.status !== "active") {
      return NextResponse.json(
        { error: "Mobile number is not registered as an active worker" },
        { status: 404 }
      );
    }

    const check = await verifyMobileOtp(mobile, otpCode);
    if (!check.approved) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    worker.lastLoginAt = new Date();
    await worker.save();

    const token = createWorkerSessionToken(worker._id.toString(), worker.mobile);

    const res = NextResponse.json({
      success: true,
      worker: {
        id: worker._id,
        workerCode: worker.workerCode,
        name: worker.name,
        mobile: worker.mobile,
        isProfileCompleted: worker.isProfileCompleted,
      },
    });

    res.cookies.set(WORKER_SESSION_COOKIE, token, workerSessionCookieOptions());

    return res;
  } catch (error) {
    console.error("Error verifying worker OTP:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
