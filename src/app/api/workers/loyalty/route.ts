import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import WorkerLoyaltyEntry from "@/models/WorkerLoyaltyEntry";
import { getAdminSession } from "@/lib/admin-auth";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

const DAILY_MAX_EARN_POINTS = 100;

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
    const workerIdFromQuery = searchParams.get("workerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: Record<string, unknown> = {};

    if (workerSession) {
      query.workerId = workerSession.workerId;
    } else if (workerIdFromQuery) {
      query.workerId = workerIdFromQuery;
    }

    if (startDate || endDate) {
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

    const entries = await WorkerLoyaltyEntry.find(query)
      .populate("workerId", "workerCode name mobile")
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      rules: {
        dailyMaxEarnPoints: DAILY_MAX_EARN_POINTS,
        pointValueInRupees: 1,
      },
      entries,
    });
  } catch (error) {
    console.error("Error fetching loyalty entries:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const workerId = body?.workerId;
    const entryType = body?.entryType;
    const pointsInput = Number(body?.points);
    const dateInput = body?.date;
    const category = typeof body?.category === "string" ? body.category.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!workerId || typeof workerId !== "string") {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    if (!entryType || !["credit", "debit"].includes(entryType)) {
      return NextResponse.json({ error: "entryType must be credit or debit" }, { status: 400 });
    }

    if (Number.isNaN(pointsInput) || pointsInput <= 0 || !Number.isInteger(pointsInput)) {
      return NextResponse.json({ error: "points must be a positive whole number" }, { status: 400 });
    }

    if (!dateInput || typeof dateInput !== "string") {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }
    if (imageUrl) {
      try {
        // Validate that evidence image URL is a valid URL before storing.
        new URL(imageUrl);
      } catch {
        return NextResponse.json({ error: "imageUrl must be a valid URL" }, { status: 400 });
      }
    }

    const dayRange = toDayRange(dateInput);
    if (!dayRange) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    await dbConnect();

    const worker = await Worker.findById(workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Worker not found or inactive" }, { status: 404 });
    }

    if (entryType === "credit") {
      const dailyEarn = await WorkerLoyaltyEntry.aggregate([
        {
          $match: {
            workerId: worker._id,
            date: { $gte: dayRange.start, $lte: dayRange.end },
            entryType: "credit",
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: "$points" },
          },
        },
      ]);

      const alreadyEarned = dailyEarn[0]?.totalEarned || 0;
      if (alreadyEarned + pointsInput > DAILY_MAX_EARN_POINTS) {
        return NextResponse.json(
          {
            error: `Daily earn limit exceeded. Max earn is ${DAILY_MAX_EARN_POINTS} points/day`,
            alreadyEarned,
            requested: pointsInput,
          },
          { status: 400 }
        );
      }
    }

    // Prevent accidental duplicate submissions in a short time window.
    const duplicateWindowStart = new Date(Date.now() - 2 * 60 * 1000);
    const existingDuplicate = await WorkerLoyaltyEntry.findOne({
      workerId,
      entryType,
      points: entryType === "credit" ? pointsInput : -pointsInput,
      category,
      reason,
      date: dayRange.start,
      createdAt: { $gte: duplicateWindowStart },
    }).lean();
    if (existingDuplicate) {
      return NextResponse.json(
        { error: "Duplicate loyalty entry detected. Please refresh and verify." },
        { status: 409 }
      );
    }

    const signedPoints = entryType === "credit" ? pointsInput : -pointsInput;

    const entry = await WorkerLoyaltyEntry.create({
      workerId,
      entryType,
      points: signedPoints,
      category,
      reason,
      note,
      imageUrl: imageUrl || undefined,
      date: dayRange.start,
      awardedBy: adminSession.user.id,
    });

    await entry.populate("workerId", "workerCode name mobile");

    return NextResponse.json({
      rules: {
        dailyMaxEarnPoints: DAILY_MAX_EARN_POINTS,
        pointValueInRupees: 1,
      },
      entry,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating loyalty entry:", error);
    return NextResponse.json({ error: "Failed to create loyalty entry" }, { status: 500 });
  }
}
