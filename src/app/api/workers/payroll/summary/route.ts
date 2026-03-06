import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerAttendance from "@/models/WorkerAttendance";
import WorkerAdvance from "@/models/WorkerAdvance";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import WorkerLoyaltyWeeklyPayout from "@/models/WorkerLoyaltyWeeklyPayout";
import { getAdminSession } from "@/lib/admin-auth";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

function getMonthRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthNumber) ||
    year < 2000 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  const start = new Date(year, monthNumber - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, monthNumber, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekRange(date: Date) {
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const adminSession = await getAdminSession();
    const workerSession = adminSession ? null : await getWorkerSessionFromCookie();

    if (!adminSession && !workerSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const workerIdFromQuery = searchParams.get("workerId") || "";
    const month = searchParams.get("month");

    const workerId = workerSession ? workerSession.workerId : workerIdFromQuery;
    if (!workerId) {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    const monthRange = getMonthRange(
      month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    );

    if (!monthRange) {
      return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const [attendanceAgg, advancesAgg, loyaltyAgg, weeklyLoyaltyAgg, attendanceEntries, advances, loyaltyEntries] = await Promise.all([
      WorkerAttendance.aggregate([
        {
          $match: {
            workerId: worker._id,
            date: { $gte: monthRange.start, $lte: monthRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$units" },
            dayKeys: {
              $addToSet: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
            },
          },
        },
      ]),
      WorkerAdvance.aggregate([
        {
          $match: {
            workerId: worker._id,
            date: { $gte: monthRange.start, $lte: monthRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalAdvance: { $sum: "$amount" },
          },
        },
      ]),
      WorkerLoyaltyEntry.aggregate([
        {
          $match: {
            workerId: worker._id,
            date: { $gte: monthRange.start, $lte: monthRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
            earnedPoints: {
              $sum: {
                $cond: [{ $gt: ["$points", 0] }, "$points", 0],
              },
            },
            deductedPoints: {
              $sum: {
                $cond: [{ $lt: ["$points", 0] }, "$points", 0],
              },
            },
          },
        },
      ]),
      WorkerLoyaltyEntry.aggregate([
        {
          $match: {
            workerId: worker._id,
            date: { $gte: monthRange.start, $lte: monthRange.end },
          },
        },
        {
          $group: {
            _id: {
              isoWeekYear: { $isoWeekYear: "$date" },
              isoWeek: { $isoWeek: "$date" },
            },
            totalPoints: { $sum: "$points" },
            earnedPoints: {
              $sum: {
                $cond: [{ $gt: ["$points", 0] }, "$points", 0],
              },
            },
            deductedPoints: {
              $sum: {
                $cond: [{ $lt: ["$points", 0] }, "$points", 0],
              },
            },
            firstDate: { $min: "$date" },
            lastDate: { $max: "$date" },
          },
        },
        { $sort: { "_id.isoWeekYear": 1, "_id.isoWeek": 1 } },
      ]),
      WorkerAttendance.find({
        workerId: worker._id,
        date: { $gte: monthRange.start, $lte: monthRange.end },
      })
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      WorkerAdvance.find({
        workerId: worker._id,
        date: { $gte: monthRange.start, $lte: monthRange.end },
      })
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      WorkerLoyaltyEntry.find({
        workerId: worker._id,
        date: { $gte: monthRange.start, $lte: monthRange.end },
      })
        .sort({ date: -1, createdAt: -1 })
        .lean(),
    ]);

    const totalUnits = attendanceAgg[0]?.totalUnits || 0;
    const attendanceDays = attendanceAgg[0]?.dayKeys?.length || 0;
    const grossWage = totalUnits * (worker.dailyWage || 0);
    const totalAdvance = advancesAgg[0]?.totalAdvance || 0;
    const netPayable = grossWage - totalAdvance;
    const totalPoints = loyaltyAgg[0]?.totalPoints || 0;
    const earnedPoints = loyaltyAgg[0]?.earnedPoints || 0;
    const deductedPoints = Math.abs(loyaltyAgg[0]?.deductedPoints || 0);
    const pointsRupees = totalPoints;

    const weekKeys = weeklyLoyaltyAgg.map((week) => ({
      isoWeekYear: week._id.isoWeekYear,
      isoWeek: week._id.isoWeek,
    }));
    const payoutRecords = weekKeys.length
      ? await WorkerLoyaltyWeeklyPayout.find({
          workerId: worker._id,
          $or: weekKeys,
        }).lean()
      : [];
    const payoutMap = new Map(
      payoutRecords.map((payout) => [`${payout.isoWeekYear}-${payout.isoWeek}`, payout])
    );

    const weeklyPayouts = weeklyLoyaltyAgg.map((week) => {
      const { weekStart, weekEnd } = getWeekRange(new Date(week.firstDate));
      const netPoints = week.totalPoints || 0;
      const key = `${week._id.isoWeekYear}-${week._id.isoWeek}`;
      const payoutRecord = payoutMap.get(key);
      return {
        isoWeekYear: week._id.isoWeekYear,
        isoWeek: week._id.isoWeek,
        weekStart,
        weekEnd,
        earnedPoints: week.earnedPoints || 0,
        deductedPoints: Math.abs(week.deductedPoints || 0),
        netPoints,
        weeklyPayoutRupees: Math.max(0, netPoints),
        payoutStatus: payoutRecord?.status || "pending",
        paidAt: payoutRecord?.paidAt || null,
        payoutRecordId: payoutRecord?._id || null,
      };
    });

    return NextResponse.json({
      worker: {
        id: worker._id,
        workerCode: worker.workerCode,
        name: worker.name,
        mobile: worker.mobile,
        dailyWage: worker.dailyWage,
      },
      period: {
        month: month || `${monthRange.start.getFullYear()}-${String(monthRange.start.getMonth() + 1).padStart(2, "0")}`,
        startDate: monthRange.start,
        endDate: monthRange.end,
      },
      summary: {
        totalUnits,
        attendanceDays,
        grossWage,
        totalAdvance,
        netPayable,
      },
      loyalty: {
        rules: {
          dailyMaxEarnPoints: 100,
          pointValueInRupees: 1,
          weeklyPayoutSeparateFromWages: true,
        },
        totalPoints,
        earnedPoints,
        deductedPoints,
        pointsRupees,
        weeklyPayouts,
      },
      attendanceEntries,
      advances,
      loyaltyEntries,
    });
  } catch (error) {
    console.error("Error generating payroll summary:", error);
    return NextResponse.json({ error: "Failed to generate payroll summary" }, { status: 500 });
  }
}
