import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

export async function GET() {
  try {
    const session = await getWorkerSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const worker = await Worker.findById(session.workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      worker: {
        id: worker._id,
        workerCode: worker.workerCode,
        name: worker.name,
        mobile: worker.mobile,
        dailyWage: worker.dailyWage,
        defaultShiftUnits: worker.defaultShiftUnits,
        isProfileCompleted: worker.isProfileCompleted,
        address: worker.address || "",
        emergencyContact: worker.emergencyContact || "",
      },
    });
  } catch (error) {
    console.error("Error fetching worker session:", error);
    return NextResponse.json({ error: "Failed to fetch worker session" }, { status: 500 });
  }
}
