import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Worker from "@/models/Worker";
import { getWorkerSessionFromCookie } from "@/lib/worker-auth";

export async function GET() {
  try {
    const session = await getWorkerSessionFromCookie();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const worker = await Worker.findById(session.workerId);
    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ worker });
  } catch (error) {
    console.error("Error fetching worker profile:", error);
    return NextResponse.json({ error: "Failed to fetch worker profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getWorkerSessionFromCookie();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const emergencyContact =
      typeof body?.emergencyContact === "string" ? body.emergencyContact.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await dbConnect();

    const worker = await Worker.findByIdAndUpdate(
      session.workerId,
      {
        name,
        address,
        emergencyContact,
        isProfileCompleted: true,
      },
      { new: true }
    );

    if (!worker || worker.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ worker });
  } catch (error) {
    console.error("Error updating worker profile:", error);
    return NextResponse.json({ error: "Failed to update worker profile" }, { status: 500 });
  }
}
