import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get single staff
export async function GET(
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

        const staff = await Staff.findById(id).lean();

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        return NextResponse.json(staff);
    } catch (error) {
        console.error("Error fetching staff:", error);
        return NextResponse.json(
            { error: "Failed to fetch staff" },
            { status: 500 }
        );
    }
}

// PUT - Update staff
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
        const { name, mobile, dailyRate, status, address, emergencyContact, notes } = body;

        const updateData: Record<string, unknown> = {};

        if (name) updateData.name = name.trim();
        if (mobile) updateData.mobile = mobile.trim();
        if (dailyRate !== undefined && dailyRate > 0) updateData.dailyRate = dailyRate;
        if (status && (status === "active" || status === "inactive")) updateData.status = status;
        if (address !== undefined) updateData.address = address.trim() || undefined;
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact.trim() || undefined;
        if (notes !== undefined) updateData.notes = notes.trim() || undefined;

        const staff = await Staff.findByIdAndUpdate(id, updateData, { new: true }).lean();

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        return NextResponse.json(staff);
    } catch (error) {
        console.error("Error updating staff:", error);
        return NextResponse.json(
            { error: "Failed to update staff" },
            { status: 500 }
        );
    }
}

// DELETE - Soft delete (set status to inactive)
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

        const staff = await Staff.findByIdAndUpdate(
            id,
            { status: "inactive" },
            { new: true }
        ).lean();

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Staff marked as inactive", staff });
    } catch (error) {
        console.error("Error deleting staff:", error);
        return NextResponse.json(
            { error: "Failed to delete staff" },
            { status: 500 }
        );
    }
}
