import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Staff from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Monthly summary for staff
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const staffId = searchParams.get("staffId");
        const month = searchParams.get("month"); // Format: YYYY-MM
        const year = searchParams.get("year");

        if (!staffId) {
            return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
        }

        // Get staff info
        const staff = await Staff.findById(staffId).lean() as {
            _id: unknown;
            staffId: string;
            name: string;
            dailyRate: number;
        } | null;
        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        // Determine date range
        let startDate: Date;
        let endDate: Date;

        if (month) {
            // Parse YYYY-MM format
            const [y, m] = month.split("-").map(Number);
            startDate = new Date(y, m - 1, 1);
            endDate = new Date(y, m, 0, 23, 59, 59, 999); // Last day of month
        } else if (year) {
            startDate = new Date(parseInt(year), 0, 1);
            endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
        } else {
            // Default to current month
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        // Aggregate attendance data
        const aggregation = await Attendance.aggregate([
            {
                $match: {
                    staffId: staff._id,
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    totalHajiri: { $sum: "$hajiriCount" },
                    totalAdvance: { $sum: "$advancePayment" },
                    daysWorked: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } },
                    entries: { $sum: 1 },
                },
            },
        ]);

        const result = aggregation[0] || {
            totalHajiri: 0,
            totalAdvance: 0,
            daysWorked: [],
            entries: 0,
        };

        const dailyRate = staff.dailyRate;
        const grossEarnings = result.totalHajiri * dailyRate;
        const netPayable = grossEarnings - result.totalAdvance;

        // Get detailed attendance records for the period
        const attendanceRecords = await Attendance.find({
            staffId: staff._id,
            date: { $gte: startDate, $lte: endDate },
        })
            .sort({ date: -1 })
            .lean();

        return NextResponse.json({
            staff: {
                _id: staff._id,
                staffId: staff.staffId,
                name: staff.name,
                dailyRate,
            },
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            summary: {
                totalHajiri: result.totalHajiri,
                uniqueDaysWorked: result.daysWorked.length,
                totalEntries: result.entries,
                grossEarnings,
                totalAdvance: result.totalAdvance,
                netPayable,
            },
            attendanceRecords,
        });
    } catch (error) {
        console.error("Error fetching attendance summary:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance summary" },
            { status: 500 }
        );
    }
}
