import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerPayPeriod from "@/models/WorkerPayPeriod";

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function lastFourDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(-4);
}

function normalizeAttendance(entries: unknown[]) {
  return entries.map((entry) => {
    const item = isRecord(entry) ? entry : {};
    const project = isRecord(item.projectId) ? item.projectId : null;
    return {
      _id: String(item._id || ""),
      date: item.date,
      units: Number(item.units || 0),
      note: typeof item.note === "string" ? item.note : "",
      project: project
        ? {
            clientName: String(project.clientName || ""),
            clientAddress: String(project.clientAddress || ""),
            projectId: String(project.projectId || ""),
          }
        : null,
    };
  });
}

function normalizeAdvances(entries: unknown[]) {
  return entries.map((entry) => {
    const item = isRecord(entry) ? entry : {};
    return {
      _id: String(item._id || ""),
      date: item.date,
      amount: Number(item.amount || 0),
      note: typeof item.note === "string" ? item.note : "",
    };
  });
}

function getPopulatedRows(period: RecordLike) {
  const attendanceSnapshot = Array.isArray(period.attendanceSnapshot) ? period.attendanceSnapshot : [];
  const advanceSnapshot = Array.isArray(period.advanceSnapshot) ? period.advanceSnapshot : [];
  const attendanceEntryIds = Array.isArray(period.attendanceEntryIds)
    ? period.attendanceEntryIds.filter((entry) => isRecord(entry) && entry.date)
    : [];
  const advanceEntryIds = Array.isArray(period.advanceEntryIds)
    ? period.advanceEntryIds.filter((entry) => isRecord(entry) && entry.date)
    : [];

  return {
    attendance: normalizeAttendance(attendanceSnapshot.length > 0 ? attendanceSnapshot : attendanceEntryIds),
    advances: normalizeAdvances(advanceSnapshot.length > 0 ? advanceSnapshot : advanceEntryIds),
  };
}

async function loadPayPeriod(id: string) {
  await dbConnect();
  return WorkerPayPeriod.findById(id)
    .populate("workerId", "workerCode name mobile dailyWage")
    .populate({
      path: "attendanceEntryIds",
      populate: { path: "projectId", select: "projectId clientName clientAddress" },
    })
    .populate("advanceEntryIds")
    .lean();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const period = await loadPayPeriod(id);
    if (!period || !isRecord(period)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const worker = isRecord(period.workerId) ? period.workerId : {};
    return NextResponse.json({
      report: {
        id: String(period._id || id),
        workerName: String(worker.name || worker.workerCode || "Worker"),
        workerCode: String(worker.workerCode || ""),
        startDate: period.startDate,
        endDate: period.endDate,
        totalUnits: Number(period.totalUnits || 0),
        grossWage: Number(period.grossWage || 0),
        totalAdvance: Number(period.totalAdvance || 0),
        netPayable: Number(period.netPayable || 0),
      },
    });
  } catch (error) {
    console.error("Error loading public worker report:", error);
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const inputLast4 = lastFourDigits(body?.last4);

    if (inputLast4.length !== 4) {
      return NextResponse.json({ error: "Enter the last 4 digits of your mobile number" }, { status: 400 });
    }

    const period = await loadPayPeriod(id);
    if (!period || !isRecord(period)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const worker = isRecord(period.workerId) ? period.workerId : {};
    if (lastFourDigits(worker.mobile) !== inputLast4) {
      return NextResponse.json({ error: "Mobile digits do not match this report" }, { status: 403 });
    }

    const rows = getPopulatedRows(period);
    return NextResponse.json({
      report: {
        id: String(period._id || id),
        worker: {
          name: String(worker.name || worker.workerCode || "Worker"),
          workerCode: String(worker.workerCode || ""),
          dailyWage: Number(worker.dailyWage || period.dailyWage || 0),
        },
        startDate: period.startDate,
        endDate: period.endDate,
        paidAt: period.paidAt,
        totalUnits: Number(period.totalUnits || 0),
        attendanceDays: Number(period.attendanceDays || 0),
        grossWage: Number(period.grossWage || 0),
        totalAdvance: Number(period.totalAdvance || 0),
        netPayable: Number(period.netPayable || 0),
        attendance: rows.attendance,
        advances: rows.advances,
      },
    });
  } catch (error) {
    console.error("Error verifying public worker report:", error);
    return NextResponse.json({ error: "Failed to verify report" }, { status: 500 });
  }
}
