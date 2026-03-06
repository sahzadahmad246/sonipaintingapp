import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const entryId = typeof body?.entryId === "string" ? body.entryId : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    await dbConnect();

    const originalEntry = await WorkerLoyaltyEntry.findById(entryId);
    if (!originalEntry) {
      return NextResponse.json({ error: "Loyalty entry not found" }, { status: 404 });
    }

    const alreadyReversed = await WorkerLoyaltyEntry.findOne({ reversalOf: originalEntry._id }).lean();
    if (alreadyReversed) {
      return NextResponse.json({ error: "This entry is already reversed" }, { status: 400 });
    }

    const reversalEntry = await WorkerLoyaltyEntry.create({
      workerId: originalEntry.workerId,
      entryType: originalEntry.points > 0 ? "debit" : "credit",
      points: -originalEntry.points,
      category: "reversal",
      reason: `Reversal: ${reason}`,
      note: `Reversed entry ${originalEntry._id.toString()}`,
      date: new Date(),
      reversalOf: originalEntry._id,
      isReversal: true,
      awardedBy: session.user.id,
    });

    await reversalEntry.populate("workerId", "workerCode name mobile");

    return NextResponse.json({
      success: true,
      reversalEntry,
    });
  } catch (error) {
    console.error("Error reversing loyalty entry:", error);
    return NextResponse.json({ error: "Failed to reverse loyalty entry" }, { status: 500 });
  }
}
