import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerAdvance from "@/models/WorkerAdvance";
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

    const advances = await WorkerAdvance.find(query)
      .populate("workerId", "workerCode name mobile dailyWage status")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ advances });
  } catch (error) {
    console.error("Error fetching advances:", error);
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const workerId = body?.workerId;
    const dateInput = body?.date;
    const amount = Number(body?.amount);
    const note = typeof body?.note === "string" ? body.note : "";

    if (!workerId || typeof workerId !== "string") {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    if (!dateInput || typeof dateInput !== "string") {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
    }

    const range = toDayRange(dateInput);
    if (!range) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    await dbConnect();

    const worker = await Worker.findById(workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Worker not found or inactive" }, { status: 404 });
    }

    const advance = await WorkerAdvance.create({
      workerId,
      date: range.start,
      amount,
      note,
      paidBy: session.user.id,
    });

    await advance.populate("workerId", "workerCode name mobile dailyWage status");

    return NextResponse.json({ advance }, { status: 201 });
  } catch (error) {
    console.error("Error adding advance:", error);
    return NextResponse.json({ error: "Failed to add advance" }, { status: 500 });
  }
}
