import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { getAdminSession } from "@/lib/admin-auth";
import { generateWorkerCode } from "@/lib/generateWorkerCode";
import { normalizeMobile } from "@/lib/twilio-verify";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "active";

    const query: Record<string, unknown> = {};

    if (status && status !== "all") query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { workerCode: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ workers });
  } catch (error) {
    console.error("Error fetching workers:", error);
    return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const mobileInput = body?.mobile;
    if (!mobileInput || typeof mobileInput !== "string") {
      return NextResponse.json({ error: "Mobile is required" }, { status: 400 });
    }

    const mobile = normalizeMobile(mobileInput);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const dailyWage = Number(body?.dailyWage ?? 0);
    const defaultShiftUnits = Number(body?.defaultShiftUnits ?? 1);

    if (Number.isNaN(dailyWage) || dailyWage < 0) {
      return NextResponse.json({ error: "Invalid daily wage" }, { status: 400 });
    }

    if (![0.5, 1, 1.5, 2].includes(defaultShiftUnits)) {
      return NextResponse.json({ error: "defaultShiftUnits must be 0.5, 1, 1.5, or 2" }, { status: 400 });
    }

    await dbConnect();

    const exists = await Worker.findOne({ mobile }).lean();
    if (exists) {
      return NextResponse.json({ error: "Worker with this mobile already exists" }, { status: 409 });
    }

    const workerCode = await generateWorkerCode();

    const worker = await Worker.create({
      workerCode,
      mobile,
      name,
      dailyWage,
      defaultShiftUnits,
      status: "active",
      isProfileCompleted: Boolean(name),
      notes: typeof body?.notes === "string" ? body.notes : "",
      joinedOn: body?.joinedOn ? new Date(body.joinedOn) : undefined,
      createdBy: session.user.id,
    });

    return NextResponse.json({ worker }, { status: 201 });
  } catch (error) {
    console.error("Error creating worker:", error);
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}
