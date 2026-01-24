// API endpoint for sending employee monthly attendance report via WhatsApp
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Attendance from "@/models/Attendance";
import cloudinary from "@/lib/cloudinary";
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

// Server-side PDF generation using jsPDF
async function generatePDFBuffer(
    staff: {
        staffId: string;
        name: string;
        mobile: string;
        dailyRate: number;
    },
    month: number,
    year: number,
    attendance: AttendanceRecord[]
): Promise<Buffer> {
    // Dynamic import for server-side usage
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default;

    interface ExtendedJsPDF extends InstanceType<typeof jsPDF> {
        lastAutoTable: { finalY: number };
    }

    const doc = new jsPDF() as ExtendedJsPDF;

    // Helper functions
    const formatCurrency = (amount: number): string => {
        return `Rs. ${amount.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        })}`;
    };

    const getMonthName = (m: number, y: number): string => {
        const date = new Date(y, m, 1);
        return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            weekday: "short",
        });
    };

    // Company header
    doc.setFillColor(41, 128, 185);
    doc.rect(20, 15, 10, 10, "F");
    doc.setFillColor(52, 152, 219);
    doc.rect(25, 20, 10, 10, "F");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Soni Painting", 50, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
        "Hiranandani Estate, Patlipada, Ghodbunder Road Thane West- 400607",
        50,
        32
    );
    doc.text("9022846640", 190, 20, { align: "right" });
    doc.text("8452085416", 190, 27, { align: "right" });

    // Report title
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE ATTENDANCE REPORT", 105, 50, { align: "center" });

    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Employee details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "bold");
    doc.text("Employee Name:", 20, 65);
    doc.text("Employee ID:", 20, 72);
    doc.text("Mobile:", 20, 79);

    doc.setFont("helvetica", "normal");
    doc.text(staff.name, 55, 65);
    doc.text(staff.staffId, 55, 72);
    doc.text(staff.mobile, 55, 79);

    doc.setFont("helvetica", "bold");
    doc.text("Report Period:", 130, 65);
    doc.text("Daily Rate:", 130, 72);

    doc.setFont("helvetica", "normal");
    doc.text(getMonthName(month, year), 165, 65);
    doc.text(formatCurrency(staff.dailyRate), 165, 72);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(20, 85, 190, 85);

    // Sort attendance
    const sortedAttendance = [...attendance].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Attendance table
    const tableColumn = ["Date", "Hajiri", "Project", "Earnings", "Advance", "Notes"];
    const tableRows = sortedAttendance.map((record) => [
        formatDate(record.date),
        record.hajiriCount.toString(),
        record.projectInfo?.clientName || "-",
        formatCurrency(record.hajiriCount * staff.dailyRate),
        record.advancePayment > 0 ? formatCurrency(record.advancePayment) : "-",
        record.notes || "-",
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 90,
        theme: "grid",
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 18, halign: "center" },
            2: { cellWidth: 35 },
            3: { cellWidth: 30, halign: "right" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: "auto" },
        },
    });

    // Calculate totals
    const totalHajiri = attendance.reduce((sum, r) => sum + r.hajiriCount, 0);
    const totalEarnings = totalHajiri * staff.dailyRate;
    const totalAdvance = attendance.reduce((sum, r) => sum + r.advancePayment, 0);
    const netPayable = totalEarnings - totalAdvance;

    let finalY = doc.lastAutoTable.finalY + 15;

    if (finalY > 240) {
        doc.addPage();
        finalY = 20;
    }

    // Summary section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("MONTHLY SUMMARY", 20, finalY);
    finalY += 10;

    const summaryBoxHeight = 50;
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, finalY - 5, 170, summaryBoxHeight, 2, 2, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const summaryX1 = 30, summaryX2 = 110;
    const valueX1 = 70, valueX2 = 160;

    doc.setFont("helvetica", "bold");
    doc.text("Total Hajiri:", summaryX1, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(totalHajiri.toString(), valueX1, finalY + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Working Days:", summaryX2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(attendance.length.toString(), valueX2, finalY + 5);

    finalY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total Earnings:", summaryX1, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0);
    doc.text(formatCurrency(totalEarnings), valueX1, finalY + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Total Advance:", summaryX2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 53, 69);
    doc.text(formatCurrency(totalAdvance), valueX2, finalY + 5);

    finalY += 15;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(25, finalY, 185, finalY);

    finalY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("NET PAYABLE:", summaryX1, finalY);
    doc.text(formatCurrency(netPayable), valueX2, finalY, { align: "right" });

    // Advance details
    const advanceRecords = sortedAttendance.filter((r) => r.advancePayment > 0);
    if (advanceRecords.length > 0) {
        finalY += summaryBoxHeight - 25;

        if (finalY > 240) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text("ADVANCE PAYMENTS", 20, finalY);
        finalY += 5;

        autoTable(doc, {
            head: [["Date", "Amount", "Notes"]],
            body: advanceRecords.map((r) => [
                formatDate(r.date),
                formatCurrency(r.advancePayment),
                r.notes || "-",
            ]),
            startY: finalY,
            theme: "grid",
            headStyles: {
                fillColor: [220, 53, 69],
                textColor: [255, 255, 255],
                fontStyle: "bold",
            },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 40, halign: "right" },
                2: { cellWidth: "auto" },
            },
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 280, 210, 20, "F");

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: "center" });
        doc.text(
            `Generated on: ${new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })}`,
            105,
            292,
            { align: "center" }
        );
    }

    // Convert to buffer
    const pdfOutput = doc.output("arraybuffer");
    return Buffer.from(pdfOutput);
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

        // Generate PDF
        const pdfBuffer = await generatePDFBuffer(
            {
                staffId: staffDoc.staffId,
                name: staffName || staffDoc.name,
                mobile: mobile,
                dailyRate: dailyRate || staffDoc.dailyRate,
            },
            month,
            year,
            attendance
        );

        // Upload to Cloudinary
        const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
        }).replace(/\s+/g, "_");

        const fileName = `employee_reports/${staffDoc.staffId}_${monthName}`;

        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "raw",
                    public_id: fileName,
                    format: "pdf",
                    overwrite: true,
                    access_mode: "public",
                    type: "upload",
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result as { secure_url: string });
                }
            );

            uploadStream.end(pdfBuffer);
        });

        console.log("PDF uploaded to Cloudinary:", uploadResult.secure_url);

        // Calculate totals for WhatsApp message
        const totalHajiri = attendance.reduce((sum, r) => sum + r.hajiriCount, 0);
        const totalEarnings = totalHajiri * (dailyRate || staffDoc.dailyRate);
        const totalAdvance = attendance.reduce((sum, r) => sum + r.advancePayment, 0);
        const netPayable = totalEarnings - totalAdvance;

        // Send via WhatsApp
        const whatsappResult = await sendEmployeeReportWhatsApp({
            to: mobile,
            pdfUrl: uploadResult.secure_url,
            staffName: staffName || staffDoc.name,
            month: monthName.replace(/_/g, " "),
            totalHajiri,
            earnings: totalEarnings,
            advance: totalAdvance,
            netPayable,
        });

        if (!whatsappResult.success) {
            return NextResponse.json(
                {
                    error: whatsappResult.error || "Failed to send WhatsApp message",
                    pdfUrl: uploadResult.secure_url,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: whatsappResult.messageId,
            pdfUrl: uploadResult.secure_url,
        });
    } catch (error) {
        console.error("Error in send-report API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
