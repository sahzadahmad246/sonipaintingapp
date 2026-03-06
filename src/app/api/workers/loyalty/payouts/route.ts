import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import WorkerLoyaltyWeeklyPayout from "@/models/WorkerLoyaltyWeeklyPayout";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const workerId = typeof body?.workerId === "string" ? body.workerId : "";
    const isoWeekYear = Number(body?.isoWeekYear);
    const isoWeek = Number(body?.isoWeek);
    const status = body?.status === "paid" ? "paid" : "pending";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!workerId) {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    if (
      Number.isNaN(isoWeekYear) ||
      Number.isNaN(isoWeek) ||
      isoWeekYear < 2000 ||
      isoWeek < 1 ||
      isoWeek > 53
    ) {
      return NextResponse.json({ error: "Invalid isoWeekYear or isoWeek" }, { status: 400 });
    }

    await dbConnect();

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const weeklyAgg = await WorkerLoyaltyEntry.aggregate([
      {
        $match: {
          workerId: worker._id,
        },
      },
      {
        $project: {
          points: 1,
          isoWeekYear: { $isoWeekYear: "$date" },
          isoWeek: { $isoWeek: "$date" },
        },
      },
      {
        $match: {
          isoWeekYear,
          isoWeek,
        },
      },
      {
        $group: {
          _id: null,
          netPoints: { $sum: "$points" },
        },
      },
    ]);

    const netPoints = weeklyAgg[0]?.netPoints || 0;
    const payoutRupees = Math.max(0, netPoints);

    const payoutRecord = await WorkerLoyaltyWeeklyPayout.findOneAndUpdate(
      { workerId, isoWeekYear, isoWeek },
      {
        workerId,
        isoWeekYear,
        isoWeek,
        netPoints,
        payoutRupees,
        status,
        paidAt: status === "paid" ? new Date() : undefined,
        markedBy: session.user.id,
        note,
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ payoutRecord });
  } catch (error) {
    console.error("Error updating loyalty payout status:", error);
    return NextResponse.json({ error: "Failed to update loyalty payout status" }, { status: 500 });
  }
}
