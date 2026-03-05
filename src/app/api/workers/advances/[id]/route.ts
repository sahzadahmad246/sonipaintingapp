import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerAdvance from "@/models/WorkerAdvance";
import { getAdminSession } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const amount = Number(body?.amount);
    const note = typeof body?.note === "string" ? body.note : "";

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
    }

    await dbConnect();

    const advance = await WorkerAdvance.findByIdAndUpdate(
      id,
      { amount, note },
      { new: true }
    ).populate("workerId", "workerCode name mobile dailyWage status");

    if (!advance) {
      return NextResponse.json({ error: "Advance entry not found" }, { status: 404 });
    }

    return NextResponse.json({ advance });
  } catch (error) {
    console.error("Error updating advance:", error);
    return NextResponse.json({ error: "Failed to update advance" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const advance = await WorkerAdvance.findByIdAndDelete(id);
    if (!advance) {
      return NextResponse.json({ error: "Advance entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting advance:", error);
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 });
  }
}
