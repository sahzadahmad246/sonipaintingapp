import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Project from "@/models/Project";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT - Update attendance entry
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { projectId, hajiriCount, advancePayment, notes } = body;

        const updateData: Record<string, unknown> = {};

        if (hajiriCount !== undefined && hajiriCount >= 0) {
            updateData.hajiriCount = hajiriCount;
        }
        if (advancePayment !== undefined && advancePayment >= 0) {
            updateData.advancePayment = advancePayment;
        }
        if (notes !== undefined) {
            updateData.notes = notes.trim() || undefined;
        }

        // Update project info if projectId changed
        if (projectId !== undefined) {
            if (projectId) {
                const project = await Project.findById(projectId).lean() as {
                    projectId: string;
                    clientName: string;
                    clientAddress: string;
                } | null;
                if (project) {
                    updateData.projectId = projectId;
                    updateData.projectInfo = {
                        projectId: project.projectId,
                        clientName: project.clientName,
                        clientAddress: project.clientAddress,
                    };
                }
            } else {
                updateData.projectId = undefined;
                updateData.projectInfo = undefined;
            }
        }

        const attendance = await Attendance.findByIdAndUpdate(id, updateData, { new: true })
            .populate("staffId", "name staffId dailyRate mobile")
            .lean();

        if (!attendance) {
            return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
        }

        return NextResponse.json(attendance);
    } catch (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json(
            { error: "Failed to update attendance" },
            { status: 500 }
        );
    }
}

// DELETE - Remove attendance entry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const attendance = await Attendance.findByIdAndDelete(id);

        if (!attendance) {
            return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Attendance deleted successfully" });
    } catch (error) {
        console.error("Error deleting attendance:", error);
        return NextResponse.json(
            { error: "Failed to delete attendance" },
            { status: 500 }
        );
    }
}
