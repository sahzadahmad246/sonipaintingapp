import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import Worker from "@/models/Worker";
import { getAdminSession } from "@/lib/admin-auth";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

function getRange(period: string) {
  const now = new Date();

  if (period === "weekly") {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const adminSession = await getAdminSession();
    const workerSession = adminSession ? null : await getWorkerSessionFromCookie();

    if (!adminSession && !workerSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = req.nextUrl.searchParams.get("period") === "monthly" ? "monthly" : "weekly";
    const range = getRange(period);

    const activeWorkers = await Worker.find({ status: "active" }).select("_id workerCode name mobile").lean();
    const workerMap = new Map(activeWorkers.map((w) => [String(w._id), w]));

    const pointsAgg = await WorkerLoyaltyEntry.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
        },
      },
      {
        $group: {
          _id: "$workerId",
          totalPoints: { $sum: "$points" },
          debits: {
            $sum: {
              $cond: [{ $lt: ["$points", 0] }, "$points", 0],
            },
          },
        },
      },
    ]);

    const leaderboard = pointsAgg
      .map((row) => {
        const worker = workerMap.get(String(row._id));
        if (!worker) return null;
        return {
          workerId: row._id,
          workerCode: worker.workerCode,
          name: worker.name,
          mobile: worker.mobile,
          totalPoints: row.totalPoints || 0,
          totalRupees: row.totalPoints || 0,
          totalDebits: Math.abs(row.debits || 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const pointsDiff = (b?.totalPoints || 0) - (a?.totalPoints || 0);
        if (pointsDiff !== 0) return pointsDiff;
        return (a?.totalDebits || 0) - (b?.totalDebits || 0);
      })
      .slice(0, 25)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return NextResponse.json({
      period,
      pointValueInRupees: 1,
      range,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching loyalty leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty leaderboard" }, { status: 500 });
  }
}
