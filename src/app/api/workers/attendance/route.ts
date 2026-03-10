import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerAttendance from "@/models/WorkerAttendance";
import Project from "@/models/Project";
import { getAdminSession } from "@/lib/admin-auth";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

function toDayRange(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isValidUnits(value: number) {
  return [0.5, 1, 1.5, 2].includes(value);
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
    const workerId = searchParams.get("workerId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: Record<string, unknown> = {};

    if (workerSession) {
      query.workerId = workerSession.workerId;
    } else if (workerId) {
      query.workerId = workerId;
    }

    if (date) {
      const range = toDayRange(date);
      if (!range) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      query.date = { $gte: range.start, $lte: range.end };
    } else if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
        }
        start.setHours(0, 0, 0, 0);
        dateQuery.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
        }
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.date = dateQuery;
    }

    const attendance = await WorkerAttendance.find(query)
      .populate("workerId", "workerCode name mobile dailyWage status")
      .populate("projectId", "projectId clientName clientAddress status")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const workerId = body?.workerId;
    const projectId = typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : undefined;
    const dateInput = body?.date;
    const units = Number(body?.units);
    const note = typeof body?.note === "string" ? body.note : "";

    if (!workerId || typeof workerId !== "string") {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    if (!dateInput || typeof dateInput !== "string") {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    if (!isValidUnits(units)) {
      return NextResponse.json({ error: "units must be one of 0.5, 1, 1.5, 2" }, { status: 400 });
    }

    const range = toDayRange(dateInput);
    if (!range) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    await dbConnect();

    const worker = await Worker.findById(workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Worker not found or inactive" }, { status: 404 });
    }

    if (projectId) {
      const project = await Project.findOne({ _id: projectId, status: "ongoing" }).select("_id").lean();
      if (!project) {
        return NextResponse.json({ error: "Selected project not found or inactive" }, { status: 404 });
      }
    }

    const totals = await WorkerAttendance.aggregate([
      {
        $match: {
          workerId: worker._id,
          date: { $gte: range.start, $lte: range.end },
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$units" },
        },
      },
    ]);

    const existingUnits = totals[0]?.totalUnits || 0;

    const duplicateQuery: Record<string, unknown> = {
      workerId: worker._id,
      date: { $gte: range.start, $lte: range.end },
    };

    if (projectId) {
      duplicateQuery.projectId = projectId;
    } else {
      duplicateQuery.$or = [{ projectId: { $exists: false } }, { projectId: null }];
    }

    const existingEntry = await WorkerAttendance.findOne(duplicateQuery).lean();
    if (existingEntry) {
      return NextResponse.json(
        { error: projectId ? "Attendance is already linked to this project for that date" : "Attendance without a project already exists for that date" },
        { status: 409 }
      );
    }

    if (existingUnits + units > 2) {
      return NextResponse.json(
        { error: "Total units for this worker on this date cannot exceed 2" },
        { status: 400 }
      );
    }

    const attendance = await WorkerAttendance.create({
      workerId,
      projectId,
      date: range.start,
      units,
      note,
      markedBy: session.user.id,
    });

    await attendance.populate("workerId", "workerCode name mobile dailyWage status");
    await attendance.populate("projectId", "projectId clientName clientAddress status");

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
