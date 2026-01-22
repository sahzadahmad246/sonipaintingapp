import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Staff from "@/models/Staff";
import Project from "@/models/Project";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List attendance records
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const staffId = searchParams.get("staffId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const date = searchParams.get("date"); // Single date filter

        const query: Record<string, unknown> = {};

        if (staffId) {
            query.staffId = staffId;
        }

        if (date) {
            // Filter for a specific date
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            query.date = { $gte: dayStart, $lte: dayEnd };
        } else if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                (query.date as Record<string, Date>).$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                (query.date as Record<string, Date>).$lte = end;
            }
        }

        const attendance = await Attendance.find(query)
            .populate("staffId", "name staffId dailyRate mobile")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return NextResponse.json({ attendance });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance" },
            { status: 500 }
        );
    }
}

// POST - Mark attendance
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { staffId, projectId, date, hajiriCount, advancePayment, notes } = body;

        // Validation
        if (!staffId) {
            return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
        }

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        if (hajiriCount === undefined || hajiriCount < 0) {
            return NextResponse.json({ error: "Valid hajiri count is required" }, { status: 400 });
        }

        // Verify staff exists
        const staff = await Staff.findById(staffId);
        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        // Get project info if projectId provided
        let projectInfo = undefined;
        if (projectId) {
            const project = await Project.findById(projectId).lean() as {
                projectId: string;
                clientName: string;
                clientAddress: string;
            } | null;
            if (project) {
                projectInfo = {
                    projectId: project.projectId,
                    clientName: project.clientName,
                    clientAddress: project.clientAddress,
                };
            }
        }

        const attendance = await Attendance.create({
            staffId,
            projectId: projectId || undefined,
            projectInfo,
            date: new Date(date),
            hajiriCount,
            advancePayment: advancePayment || 0,
            notes: notes?.trim() || undefined,
            createdBy: session.user?.email || "admin",
        });

        // Populate staff info for response
        await attendance.populate("staffId", "name staffId dailyRate mobile");

        return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance" },
            { status: 500 }
        );
    }
}
