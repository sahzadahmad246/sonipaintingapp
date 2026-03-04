// API endpoint for sending employee monthly attendance report via WhatsApp
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Attendance from "@/models/Attendance";
import EmployeeReport from "@/models/EmployeeReport";
import { sendEmployeeReportWhatsApp } from "@/lib/employee-report-whatsapp";

interface AttendanceRecord {
    date: string;
    hajiriCount: number;
    advancePayment: number;
    projectInfo?: {
        projectId: string;
        clientName: string;
        clientAddress: string;
    };
    notes?: string;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { staffId, staffName, mobile, month, year, dailyRate } = body;

        if (!staffId || mobile === undefined || month === undefined || year === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: staffId, mobile, month, year" },
                { status: 400 }
            );
        }

        // Fetch staff details
        const staffDoc = await Staff.findById(staffId);
        if (!staffDoc) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        // Fetch attendance for the month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const attendanceRecords = await Attendance.find({
            staffId: staffId,
            date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 });

        const attendance: AttendanceRecord[] = attendanceRecords.map((record) => ({
            date: record.date.toISOString(),
            hajiriCount: record.hajiriCount,
            advancePayment: record.advancePayment || 0,
            projectInfo: record.projectInfo,
            notes: record.notes,
        }));

        // Calculate totals
        const actualDailyRate = dailyRate || staffDoc.dailyRate;
        const totalHajiri = attendance.reduce((sum, r) => sum + r.hajiriCount, 0);
        const totalEarnings = totalHajiri * actualDailyRate;
        const totalAdvance = attendance.reduce((sum, r) => sum + r.advancePayment, 0);
        const netPayable = totalEarnings - totalAdvance;

        // Get month name
        const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", {
            month: "long",
        });

        // Save report to database
        const employeeReport = new EmployeeReport({
            staffId: staffDoc._id,
            staffCode: staffDoc.staffId,  // Display ID like "STF0001"
            staffName: staffName || staffDoc.name,
            staffMobile: mobile,
            month: monthName,
            monthNumber: month + 1, // 1-indexed
            year: year,
            totalHajiri: totalHajiri,
            dailyRate: actualDailyRate,
            earnings: totalEarnings,
            advance: totalAdvance,
            netPayable: netPayable,
            attendanceRecords: attendanceRecords.map((record) => ({
                date: record.date,
                hajiriCount: record.hajiriCount,
                advancePayment: record.advancePayment || 0,
                projectName: record.projectInfo?.clientName,
            })),
            sentAt: new Date(),
        });

        await employeeReport.save();
        console.log("Report saved to database:", employeeReport.reportId);

        // Build report URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.zycrainterior.com";
        const reportUrl = `${baseUrl}/report/${employeeReport.reportId}`;

        console.log("Report URL:", reportUrl);

        // Send via WhatsApp with report link
        const whatsappResult = await sendEmployeeReportWhatsApp({
            to: mobile,
            pdfUrl: reportUrl, // Now sending report page URL instead of Cloudinary URL
            staffName: staffName || staffDoc.name,
            month: `${monthName} ${year}`,
            totalHajiri,
            earnings: totalEarnings,
            advance: totalAdvance,
            netPayable,
        });

        if (!whatsappResult.success) {
            return NextResponse.json(
                {
                    error: whatsappResult.error || "Failed to send WhatsApp message",
                    reportId: employeeReport.reportId,
                    reportUrl: reportUrl,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: whatsappResult.messageId,
            reportId: employeeReport.reportId,
            reportUrl: reportUrl,
        });
    } catch (error) {
        console.error("Error in send-report API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
