// generate-employee-report-pdf.ts - Employee Monthly Attendance Report PDF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include lastAutoTable
interface ExtendedJsPDF extends jsPDF {
    lastAutoTable: {
        finalY: number;
    };
}

export interface AttendanceRecord {
    date: string;
    hajiriCount: number;
    advancePayment: number;
    projectInfo?: {
        projectId: string;
        clientName: string;
        clientAddress: string;
    };
    projectName?: string;
    notes?: string;
}

export interface StaffInfo {
    staffId: string;
    name: string;
    mobile: string;
    dailyRate: number;
}

export interface MonthlyReportData {
    staff: StaffInfo;
    month: number; // 0-indexed
    year: number;
    attendance: AttendanceRecord[];
}

// Interface for saved report data (from EmployeeReport model)
export interface SavedReportData {
    staffId: string;
    staffName: string;
    month: string; // "January 2026"
    year: number;
    totalHajiri: number;
    dailyRate: number;
    earnings: number;
    advance: number;
    netPayable: number;
    attendanceRecords: {
        date: Date | string;
        hajiriCount: number;
        advancePayment: number;
        projectName?: string;
    }[];
}

// Helper function to format currency with Rs.
const formatCurrency = (amount: number): string => {
    try {
        return `Rs. ${amount.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        })}`;
    } catch {
        return `Rs. ${amount.toFixed(2)}`;
    }
};

// Common function to add company header to PDF (matches existing quotation/invoice style)
const addCompanyHeader = (doc: jsPDF) => {
    try {
        doc.addImage("/logo.png", "PNG", 20, 15, 25, 25);
    } catch {
        // Fallback: create a blue diamond shape
        doc.setFillColor(41, 128, 185);
        doc.rect(20, 15, 10, 10, "F");
        doc.setFillColor(52, 152, 219);
        doc.rect(25, 20, 10, 10, "F");
    }

    // Company name and details
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

    // Contact information
    doc.text("9022846640", 190, 20, { align: "right" });
    doc.text("8452085416", 190, 27, { align: "right" });
};

// Get month name
const getMonthName = (month: number, year: number): string => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

// Format date for display
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        weekday: "short",
    });
};

/**
 * Generate Employee Monthly Attendance Report PDF
 * Returns PDF as base64 string for upload, or triggers download if returnBase64 is false
 */
export const generateEmployeeReportPDF = (
    data: MonthlyReportData,
    options: { returnBase64?: boolean; download?: boolean } = {}
): string | void => {
    const { staff, month, year, attendance } = data;
    const { returnBase64 = true, download = false } = options;

    const doc = new jsPDF() as ExtendedJsPDF;

    // Add company header
    addCompanyHeader(doc);

    // Report title
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE ATTENDANCE REPORT", 105, 50, { align: "center" });

    // Blue line below title
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Employee details section
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Left column - labels
    doc.setFont("helvetica", "bold");
    doc.text("Employee Name:", 20, 65);
    doc.text("Employee ID:", 20, 72);
    doc.text("Mobile:", 20, 79);

    // Left column - values
    doc.setFont("helvetica", "normal");
    const labelWidth = 35;
    doc.text(staff.name, 20 + labelWidth, 65);
    doc.text(staff.staffId, 20 + labelWidth, 72);
    doc.text(staff.mobile, 20 + labelWidth, 79);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.text("Report Period:", 130, 65);
    doc.text("Daily Rate:", 130, 72);

    doc.setFont("helvetica", "normal");
    doc.text(getMonthName(month, year), 165, 65);
    doc.text(formatCurrency(staff.dailyRate), 165, 72);

    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(20, 85, 190, 85);

    // Sort attendance by date
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
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        columnStyles: {
            0: { cellWidth: 35 }, // Date
            1: { cellWidth: 18, halign: "center" }, // Hajiri
            2: { cellWidth: 35 }, // Project
            3: { cellWidth: 30, halign: "right" }, // Earnings
            4: { cellWidth: 25, halign: "right" }, // Advance
            5: { cellWidth: "auto" }, // Notes
        },
    });

    // Calculate totals
    const totalHajiri = attendance.reduce((sum, r) => sum + r.hajiriCount, 0);
    const totalEarnings = totalHajiri * staff.dailyRate;
    const totalAdvance = attendance.reduce((sum, r) => sum + r.advancePayment, 0);
    const netPayable = totalEarnings - totalAdvance;

    // Get position after table
    let finalY = doc.lastAutoTable.finalY + 15;

    // Check if summary fits on current page
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

    // Summary box
    const summaryBoxHeight = 50;
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, finalY - 5, 170, summaryBoxHeight, 2, 2, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Summary items
    const summaryX1 = 30;
    const summaryX2 = 110;
    const valueX1 = 70;
    const valueX2 = 160;

    // Row 1
    doc.setFont("helvetica", "bold");
    doc.text("Total Hajiri:", summaryX1, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(totalHajiri.toString(), valueX1, finalY + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Working Days:", summaryX2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(attendance.length.toString(), valueX2, finalY + 5);

    // Row 2
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

    // Row 3 - Net Payable (highlighted)
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

    // Advance details section (if any advances taken)
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

        const advanceColumns = ["Date", "Amount", "Notes"];
        const advanceRows = advanceRecords.map((r) => [
            formatDate(r.date),
            formatCurrency(r.advancePayment),
            r.notes || "-",
        ]);

        autoTable(doc, {
            head: [advanceColumns],
            body: advanceRows,
            startY: finalY,
            theme: "grid",
            headStyles: {
                fillColor: [220, 53, 69],
                textColor: [255, 255, 255],
                fontStyle: "bold",
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 40, halign: "right" },
                2: { cellWidth: "auto" },
            },
        });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer background
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

    // Return or download based on options
    if (download) {
        const fileName = `${staff.name.replace(/\s+/g, "_")}_${getMonthName(month, year).replace(/\s+/g, "_")}_Report.pdf`;
        doc.save(fileName);
        return;
    }

    if (returnBase64) {
        // Return as base64 data URI for upload
        return doc.output("datauristring");
    }
};

/**
 * Generate PDF as Blob for upload
 */
export const generateEmployeeReportBlob = (data: MonthlyReportData): Blob => {
    // Call the main function to generate base64 PDF
    const base64 = generateEmployeeReportPDF(data, { returnBase64: true }) as string;

    // Convert data URI to Blob
    const base64Data = base64.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "application/pdf" });
};

/**
 * Generate PDF from saved report data (from database)
 * Returns ArrayBuffer for API response
 */
export const generatePDFFromSavedReport = (data: SavedReportData): ArrayBuffer => {
    const doc = new jsPDF() as ExtendedJsPDF;

    // Add company header
    addCompanyHeader(doc);

    // Report title
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE ATTENDANCE REPORT", 105, 50, { align: "center" });

    // Blue line below title
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Employee details section
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Left column - labels
    doc.setFont("helvetica", "bold");
    doc.text("Employee Name:", 20, 65);
    doc.text("Employee ID:", 20, 72);

    // Left column - values
    doc.setFont("helvetica", "normal");
    const labelWidth = 35;
    doc.text(data.staffName, 20 + labelWidth, 65);
    doc.text(data.staffId, 20 + labelWidth, 72);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.text("Report Period:", 130, 65);
    doc.text("Daily Rate:", 130, 72);

    doc.setFont("helvetica", "normal");
    doc.text(`${data.month} ${data.year}`, 165, 65);
    doc.text(formatCurrency(data.dailyRate), 165, 72);

    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(20, 85, 190, 85);

    // Attendance table (if records exist)
    if (data.attendanceRecords && data.attendanceRecords.length > 0) {
        const sortedRecords = [...data.attendanceRecords].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const tableColumn = ["Date", "Hajiri", "Project", "Earnings", "Advance"];
        const tableRows = sortedRecords.map((record) => [
            new Date(record.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                weekday: "short",
            }),
            record.hajiriCount.toString(),
            record.projectName || "-",
            formatCurrency(record.hajiriCount * data.dailyRate),
            record.advancePayment > 0 ? formatCurrency(record.advancePayment) : "-",
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
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });
    }

    // Get position after table
    let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 95;

    // Summary section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("MONTHLY SUMMARY", 20, finalY);
    finalY += 10;

    // Summary box
    const summaryBoxHeight = 50;
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, finalY - 5, 170, summaryBoxHeight, 2, 2, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const summaryX1 = 30;
    const summaryX2 = 110;
    const valueX1 = 70;
    const valueX2 = 160;

    // Row 1
    doc.setFont("helvetica", "bold");
    doc.text("Total Hajiri:", summaryX1, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(data.totalHajiri.toString(), valueX1, finalY + 5);

    // Row 2
    finalY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total Earnings:", summaryX1, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0);
    doc.text(formatCurrency(data.earnings), valueX1, finalY + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Total Advance:", summaryX2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 53, 69);
    doc.text(formatCurrency(data.advance), valueX2, finalY + 5);

    // Row 3 - Net Payable
    finalY += 15;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(25, finalY, 185, finalY);

    finalY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("NET PAYABLE:", summaryX1, finalY);
    doc.text(formatCurrency(data.netPayable), valueX2, finalY, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
        `Generated on: ${new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        })}`,
        105,
        285,
        { align: "center" }
    );

    // Return as ArrayBuffer
    return doc.output("arraybuffer");
};
