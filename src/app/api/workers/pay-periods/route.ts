import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerAttendance from "@/models/WorkerAttendance";
import WorkerAdvance from "@/models/WorkerAdvance";
import WorkerPayPeriod from "@/models/WorkerPayPeriod";
import { getAdminSession } from "@/lib/admin-auth";
import { sendNotification } from "@/lib/notifications";

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function getRecordId(value: unknown) {
  if (isRecord(value) && value._id !== undefined && value._id !== null) return String(value._id);
  if (value !== undefined && value !== null) return String(value);
  return "";
}

function collectEntryIds(periods: unknown[], field: "attendanceEntryIds" | "advanceEntryIds") {
  return periods.flatMap((period) => {
    if (!isRecord(period) || !Array.isArray(period[field])) return [];
    return period[field].map(getRecordId).filter(Boolean);
  });
}

function toDayStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDayEnd(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatPeriodLabel(startDate: Date, endDate: Date) {
  const sameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth();
  if (sameMonth && startDate.getDate() === 1 && endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()) {
    return startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return `${startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

async function getCurrentRange(workerId: string, endDateInput?: string) {
  const lastPaid = await WorkerPayPeriod.findOne({ workerId }).sort({ endDate: -1 }).lean() as { endDate?: Date } | null;
  const endDate = endDateInput ? new Date(endDateInput) : new Date();
  if (Number.isNaN(endDate.getTime())) return null;
  const startDate = lastPaid?.endDate
    ? toDayStart(new Date(lastPaid.endDate))
    : toDayStart(new Date(endDate.getFullYear(), endDate.getMonth(), 1));
  if (lastPaid?.endDate) startDate.setDate(startDate.getDate() + 1);

  return { startDate, endDate: toDayEnd(endDate), lastPaid };
}

function snapshotAttendanceEntries(entries: unknown[]) {
  return entries.map((entry) => ({
    _id: isRecord(entry) ? entry._id : undefined,
    date: isRecord(entry) ? entry.date : undefined,
    units: isRecord(entry) ? entry.units : undefined,
    note: isRecord(entry) ? entry.note : undefined,
    projectId: isRecord(entry) && isRecord(entry.projectId)
      ? {
          _id: entry.projectId._id,
          projectId: entry.projectId.projectId,
          clientName: entry.projectId.clientName,
          clientAddress: entry.projectId.clientAddress,
          status: entry.projectId.status,
        }
      : null,
  }));
}

function snapshotAdvanceEntries(entries: unknown[]) {
  return entries.map((entry) => ({
    _id: isRecord(entry) ? entry._id : undefined,
    date: isRecord(entry) ? entry.date : undefined,
    amount: isRecord(entry) ? entry.amount : undefined,
    note: isRecord(entry) ? entry.note : undefined,
  }));
}

function normalizePaidPeriod(period: unknown) {
  if (!isRecord(period)) return period;

  const populatedAttendance = Array.isArray(period.attendanceEntryIds)
    ? period.attendanceEntryIds.filter((entry) => isRecord(entry) && entry.date)
    : [];
  const populatedAdvances = Array.isArray(period.advanceEntryIds)
    ? period.advanceEntryIds.filter((entry) => isRecord(entry) && entry.date)
    : [];

  return {
    ...period,
    attendanceEntries:
      Array.isArray(period.attendanceSnapshot) && period.attendanceSnapshot.length > 0
        ? period.attendanceSnapshot
        : populatedAttendance,
    advances:
      Array.isArray(period.advanceSnapshot) && period.advanceSnapshot.length > 0
        ? period.advanceSnapshot
        : populatedAdvances,
  };
}

async function buildPeriodSummary(worker: { _id: unknown; dailyWage?: number }, startDate: Date, endDate: Date) {
  const [attendanceEntries, advances] = await Promise.all([
    WorkerAttendance.find({
      workerId: worker._id,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("projectId", "projectId clientName clientAddress status")
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    WorkerAdvance.find({
      workerId: worker._id,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
  ]);

  const summary = summarizeEntries(worker, attendanceEntries, advances);

  return {
    startDate,
    endDate,
    attendanceEntries,
    advances,
    summary,
  };
}

function summarizeEntries(worker: { dailyWage?: number }, attendanceEntries: unknown[], advances: unknown[]) {
  const totalUnits = attendanceEntries.reduce<number>((sum, entry) => {
    if (!isRecord(entry)) return sum;
    return sum + Number(entry.units || 0);
  }, 0);
  const attendanceDays = new Set(
    attendanceEntries
      .map((entry) => (isRecord(entry) ? entry.date : null))
      .filter(Boolean)
      .map((date) => new Date(String(date)).toISOString().slice(0, 10))
  ).size;
  const totalAdvance = advances.reduce<number>((sum, entry) => {
    if (!isRecord(entry)) return sum;
    return sum + Number(entry.amount || 0);
  }, 0);
  const grossWage = totalUnits * Number(worker.dailyWage || 0);

  return {
    totalUnits,
    attendanceDays,
    grossWage,
    totalAdvance,
    netPayable: grossWage - totalAdvance,
  };
}

async function buildPastUnpaidSummary(
  worker: { _id: unknown; dailyWage?: number },
  periods: unknown[],
  endDate: Date
) {
  const paidAttendanceIds = collectEntryIds(periods, "attendanceEntryIds");
  const paidAdvanceIds = collectEntryIds(periods, "advanceEntryIds");

  const attendanceQuery: Record<string, unknown> = {
    workerId: worker._id,
    date: { $lte: toDayEnd(new Date(endDate)) },
  };
  const advanceQuery: Record<string, unknown> = {
    workerId: worker._id,
    date: { $lte: toDayEnd(new Date(endDate)) },
  };

  if (paidAttendanceIds.length > 0) attendanceQuery._id = { $nin: paidAttendanceIds };
  if (paidAdvanceIds.length > 0) advanceQuery._id = { $nin: paidAdvanceIds };

  const [attendanceEntries, advances] = await Promise.all([
    WorkerAttendance.find(attendanceQuery)
      .populate("projectId", "projectId clientName clientAddress status")
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    WorkerAdvance.find(advanceQuery)
      .sort({ date: -1, createdAt: -1 })
      .lean(),
  ]);

  const summary = summarizeEntries(worker, attendanceEntries, advances);
  if (summary.totalUnits === 0 && summary.totalAdvance === 0) return null;

  return {
    id: "past-unpaid",
    status: "past_unpaid",
    startDate: attendanceEntries.concat(advances).reduce<Date | null>((oldest, entry) => {
      if (!isRecord(entry) || !entry.date) return oldest;
      const date = new Date(String(entry.date));
      if (Number.isNaN(date.getTime())) return oldest;
      return !oldest || date < oldest ? date : oldest;
    }, null) || toDayStart(new Date(endDate)),
    endDate,
    ...summary,
    summary,
    attendanceEntries,
    advances,
  };
}

async function sendPayPeriodReport({
  worker,
  payPeriod,
  periodLabel,
}: {
  worker: { _id?: unknown; name?: string; workerCode?: string; mobile?: string };
  payPeriod: {
    _id: unknown;
    totalUnits?: number;
    grossWage?: number;
    totalAdvance?: number;
    netPayable?: number;
  };
  periodLabel: string;
}) {
  if (!worker.mobile) {
    return { reportSent: false, reportError: "Worker mobile number is missing" };
  }

  const reportUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.sonipainting.com"}/worker/report/${payPeriod._id}`;
  const workerName = worker.name || worker.workerCode || "Worker";
  const grossWage = Math.round(Number(payPeriod.grossWage || 0));
  const totalAdvance = Math.round(Number(payPeriod.totalAdvance || 0));
  const netPayable = Math.round(Number(payPeriod.netPayable || 0));
  const message = [
    `Hello ${workerName}, your attendance report for ${periodLabel} is ready.`,
    "",
    `Total Hajiri: ${payPeriod.totalUnits || 0}`,
    `Earnings: Rs.${grossWage.toLocaleString("en-IN")}`,
    `Advance: Rs.${totalAdvance.toLocaleString("en-IN")}`,
    `Net Payable: Rs.${netPayable.toLocaleString("en-IN")}`,
    "",
    `Download Report: ${reportUrl}`,
    "",
    "- Soni Painting",
  ].join("\n");

  try {
    const reportSent = await sendNotification({
      to: worker.mobile,
      message,
      action: "payroll_paid",
      debounceSeconds: 1,
      templateVariables: {
        "1": workerName,
        "2": periodLabel,
        "3": String(payPeriod.totalUnits || 0),
        "4": `Rs.${grossWage.toLocaleString("en-IN")}`,
        "5": `Rs.${totalAdvance.toLocaleString("en-IN")}`,
        "6": `Rs.${netPayable.toLocaleString("en-IN")}`,
        "7": reportUrl,
      },
    });
    return { reportSent, reportError: "" };
  } catch (error) {
    return {
      reportSent: false,
      reportError: error instanceof Error ? error.message : "Failed to send WhatsApp report",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const workerId = req.nextUrl.searchParams.get("workerId") || "";
    const endDateInput = req.nextUrl.searchParams.get("endDate") || undefined;
    if (!workerId) return NextResponse.json({ error: "workerId is required" }, { status: 400 });

    const worker = await Worker.findById(workerId).lean() as { _id: unknown; dailyWage?: number } | null;
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    const currentRange = await getCurrentRange(workerId, endDateInput);
    if (!currentRange) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });

    const hasCurrentUnpaidDays = currentRange.startDate <= currentRange.endDate;

    const [periods, current] = await Promise.all([
      WorkerPayPeriod.find({ workerId })
        .sort({ endDate: -1 })
        .populate({
          path: "attendanceEntryIds",
          populate: { path: "projectId", select: "projectId clientName clientAddress status" },
        })
        .populate("advanceEntryIds")
        .lean(),
      hasCurrentUnpaidDays ? buildPeriodSummary(worker, currentRange.startDate, currentRange.endDate) : Promise.resolve(null),
    ]);
    const pastUnpaid = currentRange.lastPaid?.endDate
      ? await buildPastUnpaidSummary(worker, periods, new Date(currentRange.lastPaid.endDate))
      : null;

    return NextResponse.json({
      current: current
        ? {
            id: "current",
            status: "current",
            startDate: currentRange.startDate,
            endDate: currentRange.endDate,
            ...current.summary,
            attendanceEntries: current.attendanceEntries,
            advances: current.advances,
          }
        : null,
      pastUnpaid,
      periods: periods.map(normalizePaidPeriod),
    });
  } catch (error) {
    console.error("Error loading worker pay periods:", error);
    return NextResponse.json({ error: "Failed to load pay periods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const payPeriodId = typeof body?.payPeriodId === "string" ? body.payPeriodId : "";

    if (action === "resend_report") {
      if (!payPeriodId) return NextResponse.json({ error: "payPeriodId is required" }, { status: 400 });

      await dbConnect();
      const payPeriod = await WorkerPayPeriod.findById(payPeriodId).populate("workerId", "name workerCode mobile").lean();
      if (!payPeriod || !isRecord(payPeriod)) {
        return NextResponse.json({ error: "Pay period not found" }, { status: 404 });
      }
      const worker = isRecord(payPeriod.workerId) ? payPeriod.workerId : {};
      const periodLabel = formatPeriodLabel(new Date(String(payPeriod.startDate)), new Date(String(payPeriod.endDate)));
      const result = await sendPayPeriodReport({
        worker,
        payPeriod: {
          _id: payPeriod._id,
          totalUnits: Number(payPeriod.totalUnits || 0),
          grossWage: Number(payPeriod.grossWage || 0),
          totalAdvance: Number(payPeriod.totalAdvance || 0),
          netPayable: Number(payPeriod.netPayable || 0),
        },
        periodLabel,
      });

      if (result.reportSent) {
        await WorkerPayPeriod.findByIdAndUpdate(payPeriodId, {
          reportSentAt: new Date(),
          $unset: { reportError: "" },
        });
      } else if (result.reportError) {
        await WorkerPayPeriod.findByIdAndUpdate(payPeriodId, { reportError: result.reportError });
      }

      return NextResponse.json(result);
    }

    const workerId = typeof body?.workerId === "string" ? body.workerId : "";
    const endDateInput = typeof body?.endDate === "string" ? body.endDate : undefined;
    const payPeriodType = body?.payPeriodType === "past_unpaid" ? "past_unpaid" : "current";
    const sendReport = body?.sendReport !== false;
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!workerId) return NextResponse.json({ error: "workerId is required" }, { status: 400 });

    await dbConnect();

    const worker = await Worker.findById(workerId);
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    const currentRange = await getCurrentRange(workerId, endDateInput);
    if (!currentRange) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });

    const paidPeriods = await WorkerPayPeriod.find({ workerId }).sort({ endDate: -1 }).lean();
    const periodData =
      payPeriodType === "past_unpaid" && currentRange.lastPaid?.endDate
        ? await buildPastUnpaidSummary(worker, paidPeriods, new Date(currentRange.lastPaid.endDate))
        : await buildPeriodSummary(worker, currentRange.startDate, currentRange.endDate);

    if (payPeriodType === "current" && currentRange.startDate > currentRange.endDate) {
      return NextResponse.json({ error: "No unpaid days available for this worker" }, { status: 400 });
    }

    if (!periodData || (periodData.summary.totalUnits === 0 && periodData.summary.totalAdvance === 0)) {
      return NextResponse.json({ error: "No unpaid attendance or advances found" }, { status: 400 });
    }

    const periodStartDate = toDayStart(new Date(periodData.startDate));
    const periodEndDate = toDayEnd(new Date(periodData.endDate));
    const attendanceSnapshot = snapshotAttendanceEntries(periodData.attendanceEntries);
    const advanceSnapshot = snapshotAdvanceEntries(periodData.advances);

    const payPeriod = await WorkerPayPeriod.findOneAndUpdate(
      { workerId, startDate: periodStartDate, endDate: periodEndDate },
      {
        workerId,
        startDate: periodStartDate,
        endDate: periodEndDate,
        totalUnits: periodData.summary.totalUnits,
        attendanceDays: periodData.summary.attendanceDays,
        grossWage: periodData.summary.grossWage,
        totalAdvance: periodData.summary.totalAdvance,
        netPayable: periodData.summary.netPayable,
        dailyWage: worker.dailyWage || 0,
        attendanceEntryIds: periodData.attendanceEntries.map((entry) => entry._id),
        advanceEntryIds: periodData.advances.map((entry) => entry._id),
        attendanceSnapshot,
        advanceSnapshot,
        status: "paid",
        paidAt: new Date(),
        markedBy: session.user.id,
        note,
      },
      { upsert: true, new: true }
    );

    let reportSent = false;
    let reportError = "";
    if (sendReport && worker.mobile) {
      const periodLabel = formatPeriodLabel(periodStartDate, periodEndDate);
      const result = await sendPayPeriodReport({
        worker,
        payPeriod: {
          _id: payPeriod._id,
          totalUnits: periodData.summary.totalUnits,
          grossWage: periodData.summary.grossWage,
          totalAdvance: periodData.summary.totalAdvance,
          netPayable: periodData.summary.netPayable,
        },
        periodLabel,
      });
      reportSent = result.reportSent;
      reportError = result.reportError;
      if (reportSent) {
        payPeriod.reportSentAt = new Date();
        payPeriod.reportError = undefined;
        await payPeriod.save();
      } else if (reportError) {
        payPeriod.reportError = reportError;
        await payPeriod.save();
      }
    }

    return NextResponse.json({ payPeriod, reportSent, reportError });
  } catch (error) {
    console.error("Error marking worker pay period paid:", error);
    return NextResponse.json({ error: "Failed to mark pay period paid" }, { status: 500 });
  }
}
