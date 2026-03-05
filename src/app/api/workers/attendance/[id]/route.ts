import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import WorkerAttendance from "@/models/WorkerAttendance";
import Worker from "@/models/Worker";
import { getAdminSession } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

function toDayRange(dateInput: Date | string) {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isValidUnits(value: number) {
  return [0.5, 1, 1.5, 2].includes(value);
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const units = Number(body?.units);
    const note = typeof body?.note === "string" ? body.note : "";

    if (!isValidUnits(units)) {
      return NextResponse.json({ error: "units must be one of 0.5, 1, 1.5, 2" }, { status: 400 });
    }

    await dbConnect();

    const existingEntry = await WorkerAttendance.findById(id);
    if (!existingEntry) {
      return NextResponse.json({ error: "Attendance entry not found" }, { status: 404 });
    }

    const worker = await Worker.findById(existingEntry.workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Worker not found or inactive" }, { status: 404 });
    }

    const day = toDayRange(existingEntry.date);
    const totals = await WorkerAttendance.aggregate([
      {
        $match: {
          _id: { $ne: existingEntry._id },
          workerId: existingEntry.workerId,
          date: { $gte: day.start, $lte: day.end },
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$units" },
        },
      },
    ]);

    const existingUnitsExcludingCurrent = totals[0]?.totalUnits || 0;
    if (existingUnitsExcludingCurrent + units > 2) {
      return NextResponse.json(
        { error: "Total units for this worker on this date cannot exceed 2" },
        { status: 400 }
      );
    }

    existingEntry.units = units;
    existingEntry.note = note;
    await existingEntry.save();
    await existingEntry.populate("workerId", "workerCode name mobile dailyWage status");

    return NextResponse.json({ attendance: existingEntry });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const attendance = await WorkerAttendance.findByIdAndDelete(id);
    if (!attendance) {
      return NextResponse.json({ error: "Attendance entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ error: "Failed to delete attendance" }, { status: 500 });
  }
}
