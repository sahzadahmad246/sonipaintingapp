import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import EmployeeReport from "@/models/EmployeeReport";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

interface ExtendedJsPDF extends InstanceType<typeof jsPDF> {
    lastAutoTable: { finalY: number };
}

// Helper functions
const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    })}`;
};

const formatDate = (dateStr: string | Date): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        weekday: "short",
    });
};

// POST - Generate and return PDF (requires verification)
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
                { error: "Verification required" },
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

        // Verify phone number
        const actualLastFour = report.staffMobile.slice(-4);
        if (lastFourDigits !== actualLastFour) {
            return NextResponse.json(
                { error: "Verification failed" },
                { status: 401 }
            );
        }

        // Generate PDF using same approach as admin page
        const doc = new jsPDF() as ExtendedJsPDF;

        // Try to load logo
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.png");
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
            doc.addImage(logoBase64, "PNG", 20, 15, 25, 25);
        } catch {
            // Fallback: create blue squares
            doc.setFillColor(41, 128, 185);
            doc.rect(20, 15, 10, 10, "F");
            doc.setFillColor(52, 152, 219);
            doc.rect(25, 20, 10, 10, "F");
        }

        // Company header
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
        doc.text(report.staffName, 55, 65);
        doc.text(report.staffCode || report.staffId.toString(), 55, 72);
        doc.text(report.staffMobile, 55, 79);

        doc.setFont("helvetica", "bold");
        doc.text("Report Period:", 130, 65);
        doc.text("Daily Rate:", 130, 72);

        doc.setFont("helvetica", "normal");
        doc.text(`${report.month} ${report.year}`, 165, 65);
        doc.text(formatCurrency(report.dailyRate), 165, 72);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(20, 85, 190, 85);

        // Attendance table (if records exist)
        if (report.attendanceRecords && report.attendanceRecords.length > 0) {
            const sortedRecords = [...report.attendanceRecords].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            const tableColumn = ["Date", "Hajiri", "Project", "Earnings", "Advance"];
            const tableRows = sortedRecords.map((record) => [
                formatDate(record.date),
                record.hajiriCount.toString(),
                record.projectName || "-",
                formatCurrency(record.hajiriCount * report.dailyRate),
                record.advancePayment > 0 ? formatCurrency(record.advancePayment) : "-",
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 90,
                theme: "grid",
                margin: { left: 20, right: 20 },
                tableWidth: "auto",
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 9,
                    halign: "center",
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    halign: "center",
                },
                columnStyles: {
                    0: { cellWidth: 40, halign: "center" },  // Date
                    1: { cellWidth: 25, halign: "center" },  // Hajiri
                    2: { cellWidth: 50, halign: "center" },  // Project
                    3: { cellWidth: 35, halign: "center" },  // Earnings
                    4: { cellWidth: 35, halign: "center" },  // Advance
                },
            });
        }

        // Get position after table
        let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 95;

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
        doc.text(report.totalHajiri.toString(), valueX1, finalY + 5);

        doc.setFont("helvetica", "bold");
        doc.text("Working Days:", summaryX2, finalY + 5);
        doc.setFont("helvetica", "normal");
        doc.text((report.attendanceRecords?.length || 0).toString(), valueX2, finalY + 5);

        finalY += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Total Earnings:", summaryX1, finalY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 128, 0);
        doc.text(formatCurrency(report.earnings), valueX1, finalY + 5);

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Total Advance:", summaryX2, finalY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 53, 69);
        doc.text(formatCurrency(report.advance), valueX2, finalY + 5);

        finalY += 15;
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(0.5);
        doc.line(25, finalY, 185, finalY);

        finalY += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text("NET PAYABLE:", summaryX1, finalY);
        doc.text(formatCurrency(report.netPayable), valueX2, finalY, { align: "right" });

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
                })}`,
                105,
                292,
                { align: "center" }
            );
        }

        // Return PDF
        const pdfBuffer = doc.output("arraybuffer");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${report.staffName.replace(/\s+/g, "_")}_${report.month}_${report.year}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
