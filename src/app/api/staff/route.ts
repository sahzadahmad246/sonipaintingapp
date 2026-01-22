import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Generate unique staff ID
async function generateStaffId(): Promise<string> {
    const count = await Staff.countDocuments();
    const id = `STF${String(count + 1).padStart(4, "0")}`;
    return id;
}

// GET - List all staff
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // active, inactive, or null for all
        const search = searchParams.get("search");

        const query: Record<string, unknown> = {};

        if (status && (status === "active" || status === "inactive")) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { staffId: { $regex: search, $options: "i" } },
            ];
        }

        const staff = await Staff.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ staff });
    } catch (error) {
        console.error("Error fetching staff:", error);
        return NextResponse.json(
            { error: "Failed to fetch staff" },
            { status: 500 }
        );
    }
}

// POST - Add new staff member
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, mobile, dailyRate, joiningDate, address, emergencyContact, notes } = body;

        // Validation
        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (!mobile || mobile.trim() === "") {
            return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
        }

        if (!dailyRate || dailyRate <= 0) {
            return NextResponse.json({ error: "Daily rate must be greater than 0" }, { status: 400 });
        }

        const staffId = await generateStaffId();

        const staff = await Staff.create({
            staffId,
            name: name.trim(),
            mobile: mobile.trim(),
            dailyRate,
            joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
            address: address?.trim() || undefined,
            emergencyContact: emergencyContact?.trim() || undefined,
            notes: notes?.trim() || undefined,
        });

        return NextResponse.json(staff, { status: 201 });
    } catch (error) {
        console.error("Error creating staff:", error);
        return NextResponse.json(
            { error: "Failed to create staff" },
            { status: 500 }
        );
    }
}
