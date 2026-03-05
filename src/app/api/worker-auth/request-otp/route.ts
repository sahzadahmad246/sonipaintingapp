import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { normalizeMobile, sendOtpToMobile } from "@/lib/twilio-verify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mobileRaw = body?.mobile;

    if (!mobileRaw || typeof mobileRaw !== "string") {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
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

    const result = await sendOtpToMobile(mobile);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      devMode: Boolean(result.devMode),
      devOtpHint: result.devMode ? "000000" : undefined,
    });
  } catch (error) {
    console.error("Error sending worker OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
