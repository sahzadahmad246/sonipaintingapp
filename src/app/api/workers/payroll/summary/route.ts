import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerAttendance from "@/models/WorkerAttendance";
import WorkerAdvance from "@/models/WorkerAdvance";
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

    const [attendanceAgg, advancesAgg, attendanceEntries, advances] = await Promise.all([
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
    ]);

    const totalUnits = attendanceAgg[0]?.totalUnits || 0;
    const attendanceDays = attendanceAgg[0]?.dayKeys?.length || 0;
    const grossWage = totalUnits * (worker.dailyWage || 0);
    const totalAdvance = advancesAgg[0]?.totalAdvance || 0;
    const netPayable = grossWage - totalAdvance;

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
      attendanceEntries,
      advances,
    });
  } catch (error) {
    console.error("Error generating payroll summary:", error);
    return NextResponse.json({ error: "Failed to generate payroll summary" }, { status: 500 });
  }
}
