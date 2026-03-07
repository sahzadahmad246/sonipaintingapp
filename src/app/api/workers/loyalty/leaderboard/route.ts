import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import Worker from "@/models/Worker";
import { getAdminSession } from "@/lib/admin-auth";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

/** Return the ISO week number (1-53) and ISO week year for a given date. */
function getISOWeekAndYear(date: Date): { isoWeek: number; isoWeekYear: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoWeek, isoWeekYear: d.getUTCFullYear() };
}

/** Return Monday 00:00 to Sunday 23:59 date range for a given ISO week + year. */
function getWeekRange(isoWeek: number, isoWeekYear: number): { start: Date; end: Date } {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(isoWeekYear, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Mon=1 .. Sun=7
  // Monday of ISO week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthRange() {
  const now = new Date();
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

    let range: { start: Date; end: Date };
    let isoWeek: number;
    let isoWeekYear: number;

    if (period === "weekly") {
      const weekParam = req.nextUrl.searchParams.get("week");
      const yearParam = req.nextUrl.searchParams.get("year");

      if (weekParam && yearParam) {
        isoWeek = parseInt(weekParam, 10);
        isoWeekYear = parseInt(yearParam, 10);
      } else {
        const now = new Date();
        const current = getISOWeekAndYear(now);
        isoWeek = current.isoWeek;
        isoWeekYear = current.isoWeekYear;
      }

      range = getWeekRange(isoWeek, isoWeekYear);
    } else {
      range = getMonthRange();
      const current = getISOWeekAndYear(new Date());
      isoWeek = current.isoWeek;
      isoWeekYear = current.isoWeekYear;
    }

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
      isoWeek,
      isoWeekYear,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching loyalty leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty leaderboard" }, { status: 500 });
  }
}
