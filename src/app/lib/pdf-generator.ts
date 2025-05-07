import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quotation, Invoice } from "@/app/types";
import { getGeneralInfo } from "@/app/lib/api";

// Extend jsPDF type to include autoTable properties
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: { finalY: number };
}

interface GeneralInfo {
  siteName: string;
  address: string;
  mobileNumber1: string;
  mobileNumber2?: string;
  logoUrl?: string;
}

interface TotalsData {
  subtotal?: number;
  discount?: number;
  grandTotal?: number; // Changed to optional to match Quotation/Invoice types
  totalPayments?: number;
  amountDue?: number;
}

// Common PDF styling constants
const COLORS = {
  primary: "#4f46e5", // Indigo
  secondary: "#6b7280", // Gray
  accent: "#f59e0b", // Amber
  success: "#10b981", // Emerald
  danger: "#ef4444", // Red
  text: "#1f2937", // Dark gray
  lightText: "#6b7280", // Medium gray
  background: "#ffffff", // White
  lightBackground: "#f9fafb", // Light gray
  border: "#e5e7eb", // Light border
};

const FONTS = {
  heading: "helvetica",
  body: "helvetica",
};

// Helper function to add logo
async function addLogo(doc: ExtendedJsPDF, logoUrl: string, x: number, y: number, width: number, height: number) {
  if (!logoUrl) return;

  try {
    // Create a new image element
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Wait for the image to load
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => {
        console.error("Error loading logo:", e);
        reject(e);
      };
      // Add timestamp to prevent caching issues
      img.src = `${logoUrl}?t=${new Date().getTime()}`;
    });

    // Add the image to the PDF
    doc.addImage(img, "PNG", x, y, width, height);
  } catch (error) {
    console.error("Failed to add logo to PDF:", error);
  }
}

// Helper function to add header with business info
async function addHeader(doc: ExtendedJsPDF, generalInfo: GeneralInfo, title: string, number: string, status?: string) {
  // Add logo if available
  if (generalInfo.logoUrl) {
    await addLogo(doc, generalInfo.logoUrl, 14, 15, 40, 40);
  }

  // Add business info
  doc.setFontSize(20);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text(generalInfo.siteName, 60, 25);

  doc.setFontSize(10);
  doc.setFont(FONTS.body, "normal");
  doc.setTextColor(COLORS.secondary);

  // Format address with line breaks
  const addressLines = generalInfo.address.split("\n");
  addressLines.forEach((line: string, index: number) => {
    doc.text(line, 60, 35 + index * 5);
  });

  // Add contact info
  const lastAddressY = 35 + addressLines.length * 5;
  doc.text(
    `Phone: ${generalInfo.mobileNumber1}${generalInfo.mobileNumber2 ? `, ${generalInfo.mobileNumber2}` : ""}`,
    60,
    lastAddressY + 5,
  );

  // Add document title
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 70, doc.internal.pageSize.width, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(FONTS.heading, "bold");
  doc.text(`${title} #${number}`, doc.internal.pageSize.width / 2, 80, { align: "center" });

  // Add status if provided
  if (status) {
    const statusText = status.toUpperCase();
    const statusColor = status === "accepted" ? COLORS.success : status === "rejected" ? COLORS.danger : COLORS.accent;

    doc.setTextColor(statusColor);
    doc.setFontSize(12);
    doc.setFont(FONTS.heading, "bold");
    doc.text(statusText, 195, 35, { align: "right" });
  }

  // Reset text color
  doc.setTextColor(COLORS.text);
}

// Helper function to add client info
function addClientInfo(doc: ExtendedJsPDF, clientName: string, clientAddress: string, clientNumber: string, startY: number) {
  doc.setFillColor(COLORS.lightBackground);
  doc.rect(14, startY, doc.internal.pageSize.width - 28, 40, "F");

  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Client Information", 20, startY + 10);

  doc.setFontSize(10);
  doc.setFont(FONTS.body, "normal");
  doc.setTextColor(COLORS.text);

  doc.text(`Name: ${clientName}`, 20, startY + 20);

  // Format address with line breaks
  const addressLines = clientAddress.split("\n");
  addressLines.forEach((line: string, index: number) => {
    doc.text(`Address: ${index === 0 ? line : line}`, 20, startY + 30 + index * 5);
  });

  doc.text(`Phone: ${clientNumber}`, 20, startY + 30 + addressLines.length * 5);
}

// Helper function to add items table
function addItemsTable(doc: ExtendedJsPDF, items: Quotation["items"] | Invoice["items"], startY: number, title = "Items") {
  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text(title, 14, startY);

  const tableHeaders = [["Description", "Area (sq.ft)", "Rate (₹)", "Total (₹)"]];
  const tableData = items.map((item) => [
    item.description + (item.note ? `\n${item.note}` : ""),
    item.area?.toString() || "-",
    `₹${item.rate?.toFixed(2)}`,
    `₹${(item.total ?? (item.area && item.rate ? item.area * item.rate : item.rate)).toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: startY + 5,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      lineColor: COLORS.border,
      lineWidth: 0.1,
      font: FONTS.body,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: COLORS.lightBackground,
    },
  });
}

// Helper function to add extra work table (for invoices)
function addExtraWorkTable(doc: ExtendedJsPDF, extraWork: Invoice["extraWork"], startY: number) {
  if (!extraWork || extraWork.length === 0) return startY;

  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Extra Work", 14, startY);

  const tableHeaders = [["Description", "Total (₹)"]];
  const tableData = extraWork.map((item) => [
    item.description + (item.note ? `\n${item.note}` : ""),
    `₹${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: startY + 5,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      lineColor: COLORS.border,
      lineWidth: 0.1,
      font: FONTS.body,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: COLORS.lightBackground,
    },
  });

  return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : startY + 10;
}

// Helper function to add payment history table (for invoices)
function addPaymentHistoryTable(doc: ExtendedJsPDF, payments: Invoice["paymentHistory"], startY: number) {
  if (!payments || payments.length === 0) return startY;

  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Payment History", 14, startY);

  const tableHeaders = [["Date", "Amount (₹)", "Note"]];
  const tableData = payments.map((payment) => [
    new Date(payment.date).toLocaleDateString(),
    `₹${payment.amount.toFixed(2)}`,
    payment.note || "-",
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: startY + 5,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      lineColor: COLORS.border,
      lineWidth: 0.1,
      font: FONTS.body,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 40, halign: "left" },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: "auto", halign: "left" },
    },
    alternateRowStyles: {
      fillColor: COLORS.lightBackground,
    },
  });

  return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : startY + 10;
}

// Helper function to add totals
function addTotals(doc: ExtendedJsPDF, data: TotalsData, startY: number, isInvoice = false) {
  const totalsWidth = 80;
  const totalsX = doc.internal.pageSize.width - 14 - totalsWidth;

  doc.setFillColor(COLORS.lightBackground);

  let currentY = startY;
  const lineHeight = 8;
  const padding = 5;

  // Calculate height needed for the totals box
  let boxHeight = 2 * padding;
  if (data.subtotal !== undefined) boxHeight += lineHeight;
  boxHeight += lineHeight; // For discount
  if (isInvoice && data.totalPayments !== undefined) boxHeight += lineHeight;
  boxHeight += lineHeight; // For grand total
  if (isInvoice && data.amountDue !== undefined) boxHeight += lineHeight;

  // Draw totals box
  doc.rect(totalsX, currentY, totalsWidth, boxHeight, "F");

  currentY += padding;

  // Add subtotal if available
  if (data.subtotal !== undefined) {
    doc.setFontSize(10);
    doc.setFont(FONTS.body, "normal");
    doc.setTextColor(COLORS.text);
    doc.text("Subtotal:", totalsX + 5, currentY);
    doc.text(`₹${data.subtotal.toFixed(2)}`, totalsX + totalsWidth - 5, currentY, { align: "right" });
    currentY += lineHeight;
  }

  // Add discount
  doc.setFontSize(10);
  doc.setFont(FONTS.body, "normal");
  doc.setTextColor(COLORS.text);
  doc.text("Discount:", totalsX + 5, currentY);
  doc.text(`₹${data.discount?.toFixed(2) || "0.00"}`, totalsX + totalsWidth - 5, currentY, { align: "right" });
  currentY += lineHeight;

  // Add total payments for invoices
  if (isInvoice && data.totalPayments !== undefined) {
    doc.setFontSize(10);
    doc.setFont(FONTS.body, "normal");
    doc.setTextColor(COLORS.text);
    doc.text("Total Payments:", totalsX + 5, currentY);
    doc.text(`₹${data.totalPayments.toFixed(2)}`, totalsX + totalsWidth - 5, currentY, { align: "right" });
    currentY += lineHeight;
  }

  // Add grand total
  doc.setFontSize(10);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Grand Total:", totalsX + 5, currentY);
  doc.text(`₹${(data.grandTotal ?? 0).toFixed(2)}`, totalsX + totalsWidth - 5, currentY, { align: "right" });
  currentY += lineHeight;

  // Add amount due for invoices
  if (isInvoice && data.amountDue !== undefined) {
    doc.setFontSize(10);
    doc.setFont(FONTS.heading, "bold");
    doc.setTextColor(COLORS.danger);
    doc.text("Amount Due:", totalsX + 5, currentY);
    doc.text(`₹${data.amountDue.toFixed(2)}`, totalsX + totalsWidth - 5, currentY, { align: "right" });
    currentY += lineHeight;
  }

  return currentY + padding;
}

// Helper function to add terms and conditions
function addTermsAndConditions(doc: ExtendedJsPDF, terms: string[], startY: number) {
  if (!terms || terms.length === 0) return startY;

  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Terms & Conditions", 14, startY);

  doc.setFontSize(10);
  doc.setFont(FONTS.body, "normal");
  doc.setTextColor(COLORS.text);

  let currentY = startY + 10;
  terms.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 14, currentY);
    currentY += 6;
  });

  return currentY + 5;
}

// Helper function to add notes
function addNotes(doc: ExtendedJsPDF, note: string, startY: number) {
  if (!note) return startY;

  doc.setFontSize(12);
  doc.setFont(FONTS.heading, "bold");
  doc.setTextColor(COLORS.primary);
  doc.text("Additional Notes", 14, startY);

  doc.setFontSize(10);
  doc.setFont(FONTS.body, "normal");
  doc.setTextColor(COLORS.text);

  // Split long notes into multiple lines
  const splitNote = doc.splitTextToSize(note, 180);
  doc.text(splitNote, 14, startY + 10);

  return startY + 10 + splitNote.length * 5 + 5;
}

// Helper function to add footer
function addFooter(doc: ExtendedJsPDF) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Add footer line
    doc.setDrawColor(COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(14, 280, doc.internal.pageSize.width - 14, 280);

    // Add footer text
    doc.setFontSize(8);
    doc.setFont(FONTS.body, "italic");
    doc.setTextColor(COLORS.secondary);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 285);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 14, 285, { align: "right" });
  }
}

// Main function to generate quotation PDF
export async function generateQuotationPDF(quotation: Quotation): Promise<string> {
  // Get general info for contractor details
  const generalInfo = await getGeneralInfo();

  // Create new PDF document
  const doc = new jsPDF() as ExtendedJsPDF;

  // Set document properties
  doc.setProperties({
    title: `Quotation #${quotation.quotationNumber}`,
    subject: "Painting Quotation",
    author: generalInfo.siteName,
    creator: generalInfo.siteName,
  });

  // Add header with business info
  await addHeader(doc, generalInfo, "QUOTATION", quotation.quotationNumber, quotation.isAccepted);

  // Add client info
  addClientInfo(doc, quotation.clientName, quotation.clientAddress, quotation.clientNumber, 95);

  // Add items table
  addItemsTable(doc, quotation.items || [], 145, "Quotation Items");

  // Get the Y position after the table
  const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 145 + 10;

  // Add totals
  const totalsEndY = addTotals(doc, {
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    grandTotal: quotation.grandTotal,
  }, finalY);

  // Add terms and conditions
  const termsEndY = addTermsAndConditions(doc, quotation.terms || [], totalsEndY + 10);

  // Add notes if available
  if (quotation.note) {
    addNotes(doc, quotation.note, termsEndY + 5);
  }

  // Add footer
  addFooter(doc);

  // Return the PDF as a data URL
  return doc.output("dataurlstring");
}

// Main function to generate invoice PDF
export async function generateInvoicePDF(invoice: Invoice): Promise<string> {
  // Get general info for contractor details
  const generalInfo = await getGeneralInfo();

  // Create new PDF document
  const doc = new jsPDF() as ExtendedJsPDF;

  // Set document properties
  doc.setProperties({
    title: `Invoice #${invoice.invoiceId}`,
    subject: "Painting Invoice",
    author: generalInfo.siteName,
    creator: generalInfo.siteName,
  });

  // Add header with business info
  await addHeader(doc, generalInfo, "INVOICE", invoice.invoiceId);

  // Add client info
  addClientInfo(doc, invoice.clientName, invoice.clientAddress, invoice.clientNumber, 95);

  // Add items table
  addItemsTable(doc, invoice.items, 145, "Invoice Items");

  // Get the Y position after the table
  let currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 145 + 10;

  // Add extra work table if available
  if (invoice.extraWork && invoice.extraWork.length > 0) {
    currentY = addExtraWorkTable(doc, invoice.extraWork, currentY + 5);
  }

  // Add totals
  const totalsEndY = addTotals(
    doc,
    {
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      grandTotal: invoice.grandTotal,
      totalPayments: invoice.totalPayments || invoice.paymentHistory.reduce((sum, p) => sum + p.amount, 0),
      amountDue: invoice.amountDue,
    },
    currentY,
    true,
  );

  // Add payment history if available
  let paymentHistoryEndY = totalsEndY;
  if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
    paymentHistoryEndY = addPaymentHistoryTable(doc, invoice.paymentHistory, totalsEndY + 10);
  }

  // Add terms and conditions
  const termsEndY = addTermsAndConditions(doc, invoice.terms || [], paymentHistoryEndY + 10);

  // Add notes if available
  if (invoice.note) {
    addNotes(doc, invoice.note, termsEndY + 5);
  }

  // Add footer
  addFooter(doc);

  // Return the PDF as a data URL
  return doc.output("dataurlstring");
}