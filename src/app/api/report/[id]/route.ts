import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import EmployeeReport from "@/models/EmployeeReport";

// GET - Get report info (without sensitive data) for displaying verification page
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const report = await EmployeeReport.findOne({ reportId: id });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 }
            );
        }

        // Return only basic info (not the actual report data)
        return NextResponse.json({
            success: true,
            report: {
                reportId: report.reportId,
                staffName: report.staffName,
                month: report.month,
                year: report.year,
                // Show first 4 digits as hint (not last 4 - that would reveal the answer!)
                phoneHint: report.staffMobile.replace(/^\+91/, "").slice(0, 4),
            },
        });
    } catch (error) {
        console.error("Error fetching report:", error);
        return NextResponse.json(
            { error: "Failed to fetch report" },
            { status: 500 }
        );
    }
}

// POST - Verify phone and return full report
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { lastFourDigits } = await request.json();

        if (!lastFourDigits || lastFourDigits.length !== 4) {
            return NextResponse.json(
                { error: "Please enter 4 digits" },
                { status: 400 }
            );
        }

        const report = await EmployeeReport.findOne({ reportId: id });

        if (!report) {
            return NextResponse.json(
                { error: "Report not found" },
                { status: 404 }
            );
        }

        // Check if last 4 digits match
        const actualLastFour = report.staffMobile.slice(-4);
        if (lastFourDigits !== actualLastFour) {
            return NextResponse.json(
                { error: "Incorrect phone number" },
                { status: 401 }
            );
        }

        // Update viewedAt timestamp
        if (!report.viewedAt) {
            report.viewedAt = new Date();
            await report.save();
        }

        // Return full report data
        return NextResponse.json({
            success: true,
            verified: true,
            report: {
                reportId: report.reportId,
                staffName: report.staffName,
                month: report.month,
                year: report.year,
                totalHajiri: report.totalHajiri,
                dailyRate: report.dailyRate,
                earnings: report.earnings,
                advance: report.advance,
                netPayable: report.netPayable,
                attendanceRecords: report.attendanceRecords,
                sentAt: report.sentAt,
            },
        });
    } catch (error) {
        console.error("Error verifying report:", error);
        return NextResponse.json(
            { error: "Failed to verify" },
            { status: 500 }
        );
    }
}
