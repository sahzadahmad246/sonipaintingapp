import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { getAdminSession } from "@/lib/admin-auth";
import { normalizeMobile } from "@/lib/twilio-verify";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const worker = await Worker.findById(id).lean();
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    return NextResponse.json({ worker });
  } catch (error) {
    console.error("Error fetching worker:", error);
    return NextResponse.json({ error: "Failed to fetch worker" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};

    if (typeof body?.name === "string") updateData.name = body.name.trim();
    if (typeof body?.address === "string") updateData.address = body.address.trim();
    if (typeof body?.emergencyContact === "string") updateData.emergencyContact = body.emergencyContact.trim();
    if (typeof body?.notes === "string") updateData.notes = body.notes;
    if (typeof body?.status === "string" && ["active", "inactive"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (body?.dailyWage !== undefined) {
      const dailyWage = Number(body.dailyWage);
      if (Number.isNaN(dailyWage) || dailyWage < 0) {
        return NextResponse.json({ error: "Invalid daily wage" }, { status: 400 });
      }
      updateData.dailyWage = dailyWage;
    }

    if (body?.defaultShiftUnits !== undefined) {
      const defaultShiftUnits = Number(body.defaultShiftUnits);
      if (![0.5, 1, 1.5, 2].includes(defaultShiftUnits)) {
        return NextResponse.json({ error: "Invalid default shift units" }, { status: 400 });
      }
      updateData.defaultShiftUnits = defaultShiftUnits;
    }

    if (typeof body?.mobile === "string" && body.mobile.trim()) {
      updateData.mobile = normalizeMobile(body.mobile);
    }

    updateData.isProfileCompleted = Boolean(updateData.name || body?.isProfileCompleted);

    await dbConnect();

    const worker = await Worker.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    return NextResponse.json({ worker });
  } catch (error) {
    console.error("Error updating worker:", error);
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}
