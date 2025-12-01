// generate-pdf.ts - PDF generation utilities
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quotation, Invoice, Project } from "@/app/types";

// Extend jsPDF type to include lastAutoTable
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
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

// Common function to add company header to PDF
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

// Function to generate and download the quotation PDF
export const generateQuotationPDF = (quotation: Quotation) => {
  const doc = new jsPDF() as ExtendedJsPDF;

  // Add company header
  addCompanyHeader(doc);

  // Quotation title with professional styling
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204); // Blue color for title
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", 105, 50, { align: "center" });

  // Blue line below title
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Quotation details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Format date
  const formattedDate = new Date(quotation.date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Left column - with better label styling
  doc.setFont("helvetica", "bold");
  doc.text("Quotation No:", 20, 65);
  doc.text("Client Name:", 20, 72);
  doc.text("Address:", 20, 79);

  // Left column - values
  doc.setFont("helvetica", "normal");
  const labelWidth = 30; // Width allocated for labels
  doc.text(`#${quotation.quotationNumber}`, 20 + labelWidth, 65);
  doc.text(`${quotation.clientName}`, 20 + labelWidth, 72);
  doc.text(`${quotation.clientAddress}`, 20 + labelWidth, 79);

  // Right column - with better label styling
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 140, 65);
  doc.text("Client No:", 140, 72);

  // Right column - values with dynamic positioning
  doc.setFont("helvetica", "normal");
  const rightLabelWidth = 25; // Width allocated for right labels
  doc.text(`${formattedDate}`, 140 + rightLabelWidth, 65);
  doc.text(`${quotation.clientNumber}`, 140 + rightLabelWidth, 72);

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, 85, 190, 85);

  // Items table
  const tableColumn = ["#", "Description", "Area (sq.ft)", "Rate", "Total"];
  const tableRows =
    quotation.items?.map((item, index) => {
      const description = item.note
        ? `${item.description} (${item.note})`
        : `${item.description}`;

      return [
        index + 1,
        description,
        item.area || "-",
        formatCurrency(item.rate || 0),
        formatCurrency(item.total ?? (item.rate || 0)),
      ];
    }) || [];

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 90,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && typeof data.cell.raw === "string") {
        data.cell.text = [data.cell.raw]; // Assign as string array
      }
    },
  });

  // Get the last Y position after the table
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if totals section will fit on current page
  const totalsHeight = (quotation.discount ?? 0) > 0 ? 30 : 23;
  if (finalY + totalsHeight > 220) {
    doc.addPage();
    finalY = 20;
  }

  // Add totals with better alignment and styling
  const totalLabelX = 140;
  const totalValueX = 190;

  // Create a box for totals with dynamic height
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(
    totalLabelX - 5,
    finalY - 5,
    totalValueX - totalLabelX + 10,
    totalsHeight,
    2,
    2,
    "FD"
  );

  let currentTotalY = finalY;
  if (quotation.subtotal) {
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", totalLabelX, currentTotalY);
    doc.text(formatCurrency(quotation.subtotal), totalValueX, currentTotalY, {
      align: "right",
    });
    currentTotalY += 7;
  }

  // Only show discount if defined and greater than 0
  if ((quotation.discount ?? 0) > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Discount:", totalLabelX, currentTotalY);
    doc.text(formatCurrency(quotation.discount!), totalValueX, currentTotalY, {
      align: "right",
    });
    currentTotalY += 7;
  }

  if (quotation.grandTotal) {
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(
      totalLabelX - 5,
      currentTotalY - 2,
      totalValueX + 5,
      currentTotalY - 2
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Grand Total: ", totalLabelX, currentTotalY + 4);
    doc.text(
      formatCurrency(quotation.grandTotal),
      totalValueX,
      currentTotalY + 4,
      {
        align: "right",
      }
    );
    doc.setTextColor(0, 0, 0);
  }

  // Start position for additional content
  let currentY = finalY + totalsHeight + 10;

  // Add note if exists
  if (quotation.note) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Additional Notes", 20, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Add a light background for the notes section
    const splitNote = doc.splitTextToSize(quotation.note, 170);
    const noteHeight = splitNote.length * 6;

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, currentY - 5, 170, noteHeight + 10, 2, 2, "FD");

    doc.text(splitNote, 25, currentY);
    currentY += noteHeight + 15;
  }

  // Add terms and conditions
  if (quotation.terms && quotation.terms.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Terms & Conditions", 20, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    quotation.terms.forEach((term, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text("Terms & Conditions (continued)", 20, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
      }

      const splitTerm = doc.splitTextToSize(`${index + 1}. ${term}`, 170);
      doc.text(splitTerm, 20, currentY);
      currentY += splitTerm.length * 6 + 4;
    });

    currentY += 10;
  }

  // Add site images
  if (quotation.siteImages && quotation.siteImages.length > 0) {
    if (currentY > 180) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Site Images", 20, currentY);
    currentY += 10;
    doc.setTextColor(0, 0, 0);

    const imagesPerRow = 2;
    const imageWidth = 80;
    const imageHeight = 60;

    for (let i = 0; i < quotation.siteImages.length; i++) {
      const row = Math.floor(i / imagesPerRow);
      const col = i % imagesPerRow;

      const x = 20 + col * (imageWidth + 10);
      const y = currentY + row * (imageHeight + 20);

      if (y > 250) {
        doc.addPage();
        currentY = 20;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 102, 204);
        doc.text("Site Images (continued)", 20, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 10;
        i--;
        continue;
      }

      // Add a border and shadow effect for images
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(
        x - 1,
        y - 1,
        imageWidth + 2,
        imageHeight + 2,
        2,
        2,
        "FD"
      );

      if (quotation.siteImages[i].url) {
        try {
          doc.addImage(
            quotation.siteImages[i].url,
            "JPEG",
            x,
            y,
            imageWidth,
            imageHeight
          );
        } catch {
          doc.setFontSize(8);
          doc.text(
            "Image not available",
            x + imageWidth / 2,
            y + imageHeight / 2,
            { align: "center" }
          );
        }
      } else {
        // Placeholder rectangle
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, imageWidth, imageHeight, "F");
      }

      // Add image description if available
      const description = quotation.siteImages[i].description;
      if (description) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const splitDesc = doc.splitTextToSize(description, imageWidth);
        doc.text(splitDesc, x + imageWidth / 2, y + imageHeight + 5, {
          align: "center",
        });
      }
    }

    // Update currentY after images
    currentY +=
      Math.ceil(quotation.siteImages.length / imagesPerRow) *
        (imageHeight + 20) +
      10;
  }

  // Add footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Add a footer background
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 280, 210, 20, "F");

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    doc.text("Soni Painting - Professional Painting Services", 105, 295, {
      align: "center",
    });
  }

  // Save the PDF
  doc.save(`Quotation_${quotation.quotationNumber}.pdf`);
};

// Function to generate and download the invoice PDF
export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF() as ExtendedJsPDF;

  // Add company header
  addCompanyHeader(doc);

  // Invoice title
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204); // Blue color for title
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 105, 50, { align: "center" });

  // Blue line below title
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Invoice details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Format date
  const formattedDate = new Date(invoice.date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Left column - with better label styling
  doc.setFont("helvetica", "bold");
  doc.text("Invoice No:", 20, 65);
  doc.text("Client Name:", 20, 72);
  doc.text("Address:", 20, 79);

  // Left column - values
  doc.setFont("helvetica", "normal");
  const labelWidth = 30; // Width allocated for labels
  doc.text(`#${invoice.invoiceId}`, 20 + labelWidth, 65);
  doc.text(`${invoice.clientName}`, 20 + labelWidth, 72);
  doc.text(`${invoice.clientAddress}`, 20 + labelWidth, 79);

  // Right column - with better label styling
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 140, 65);
  doc.text("Client No:", 140, 72);
  doc.text("Payment Status:", 140, 79);

  // Right column - values with dynamic positioning
  doc.setFont("helvetica", "normal");
  const rightLabelWidth = 25; // Width allocated for right labels
  doc.text(`${formattedDate}`, 140 + rightLabelWidth, 65);
  doc.text(`${invoice.clientNumber}`, 140 + rightLabelWidth, 72);

  // Payment status
  let paymentStatus = "Unpaid";
  if (invoice.amountDue <= 0) {
    paymentStatus = "Paid";
  } else if (invoice.amountDue < invoice.grandTotal) {
    paymentStatus = "Partially Paid";
  }
  doc.text(`${paymentStatus}`, 150 + rightLabelWidth, 79);

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, 85, 190, 85);

  // Items table
  const tableColumn = ["#", "Description", "Area (sq.ft)", "Rate", "Total"];
  const tableRows =
    invoice.items.map((item, index) => {
      const description = item.note
        ? `${item.description} (${item.note})`
        : `${item.description}`;

      return [
        index + 1,
        description,
        item.area || "-",
        formatCurrency(item.rate || 0),
        formatCurrency(
          item.total ??
            ((item.area && item.rate ? item.area * item.rate : item.rate) || 0)
        ),
      ];
    }) || [];

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 90,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && typeof data.cell.raw === "string") {
        data.cell.text = [data.cell.raw]; // Assign as string array
      }
    },
  });

  // Get the last Y position after the table
  let finalY = doc.lastAutoTable.finalY + 10;

  // Add extra work if available
  if (invoice.extraWork && invoice.extraWork.length > 0) {
    if (finalY > 220) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Extra Work", 20, finalY);
    finalY += 5;
    doc.setTextColor(0, 0, 0);

    const extraWorkColumns = ["#", "Description", "Total"];
    const extraWorkRows = invoice.extraWork.map((ew, index) => {
      const description = ew.note
        ? `${ew.description} (${ew.note})`
        : `${ew.description}`;

      return [index + 1, description, formatCurrency(ew.total || 0)];
    });

    autoTable(doc, {
      head: [extraWorkColumns],
      body: extraWorkRows,
      startY: finalY,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 35, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && typeof data.cell.raw === "string") {
          data.cell.text = [data.cell.raw]; // Assign as string array
        }
      },
    });

    finalY = doc.lastAutoTable.finalY + 10;
  }

  // Check if totals section will fit on current page
  const totalsHeight =
    (invoice.discount ?? 0) > 0
      ? paymentStatus === "Paid"
        ? 37
        : 44
      : paymentStatus === "Paid"
      ? 30
      : 37;
  if (finalY + totalsHeight > 220) {
    doc.addPage();
    finalY = 20;
  }

  // Add totals with better styling
  const totalLabelX = 140;
  const totalValueX = 190;

  // Create totals box with dynamic height
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(
    totalLabelX - 5,
    finalY - 5,
    totalValueX - totalLabelX + 10,
    totalsHeight,
    2,
    2,
    "FD"
  );

  let currentTotalY = finalY;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalLabelX, currentTotalY);
  doc.text(formatCurrency(invoice.subtotal), totalValueX, currentTotalY, {
    align: "right",
  });
  currentTotalY += 7;

  // Only show discount if defined and greater than 0
  if ((invoice.discount ?? 0) > 0) {
    doc.text("Discount:", totalLabelX, currentTotalY);
    doc.text(formatCurrency(invoice.discount!), totalValueX, currentTotalY, {
      align: "right",
    });
    currentTotalY += 7;
  }

  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(
    totalLabelX - 5,
    currentTotalY - 2,
    totalValueX + 5,
    currentTotalY - 2
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 204);
  doc.text("Grand Total: ", totalLabelX, currentTotalY + 4);
  doc.text(formatCurrency(invoice.grandTotal), totalValueX, currentTotalY + 4, {
    align: "right",
  });

  // Calculate total advance for use in totals section or payment history
  const totalAdvance =
    invoice.paymentHistory?.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    ) || 0;

  currentTotalY += 11;
  // Show Advance only if not Paid
  if (paymentStatus !== "Paid") {
    doc.setTextColor(0, 128, 0); // Green for advance
    doc.setFont("helvetica", "bold");
    doc.text("Advance:", totalLabelX, currentTotalY);
    doc.text(formatCurrency(totalAdvance), totalValueX, currentTotalY, {
      align: "right",
    });
    currentTotalY += 7;
  }

  doc.setTextColor(220, 53, 69); // Red for amount due
  doc.setFont("helvetica", "bold");
  doc.text("Amount Due:", totalLabelX, currentTotalY);
  doc.text(formatCurrency(invoice.amountDue), totalValueX, currentTotalY, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Start position for additional content
  let currentY = finalY + totalsHeight + 10;

  // Add payment history if available
  if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Payment History", 20, currentY);
    doc.setTextColor(0, 0, 0);

    // Display "Fully Paid" or "Total Advance" based on payment status
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const statusText =
      paymentStatus === "Paid"
        ? "Fully Paid"
        : `Total Advance: ${formatCurrency(totalAdvance)}`;
    doc.text(statusText, 100, currentY);
    currentY += 5;

    const paymentColumns = ["Date", "Amount", "Note"];
    const paymentRows = invoice.paymentHistory.map((payment) => [
      new Date(payment.date).toLocaleDateString(),
      formatCurrency(payment.amount),
      payment.note || "-",
    ]);

    autoTable(doc, {
      head: [paymentColumns],
      body: paymentRows,
      startY: currentY,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: "auto" },
      },
    });

    currentY = doc.lastAutoTable.finalY + 15;
  }

  // Add note if exists
  if (invoice.note) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Additional Notes", 20, currentY);
    currentY += 8;
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Add a light background for the notes section
    const splitNote = doc.splitTextToSize(invoice.note, 170);
    const noteHeight = splitNote.length * 6;

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, currentY - 5, 170, noteHeight + 10, 2, 2, "FD");

    doc.text(splitNote, 25, currentY);
    currentY += noteHeight + 15;
  }

  // Add terms and conditions
  if (invoice.terms && invoice.terms.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Terms & Conditions", 20, currentY);
    currentY += 8;
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    invoice.terms.forEach((term, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text("Terms & Conditions (continued)", 20, currentY);
        currentY += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }

      const splitTerm = doc.splitTextToSize(`${index + 1}. ${term}`, 170);
      doc.text(splitTerm, 20, currentY);
      currentY += splitTerm.length * 6 + 4;
    });
  }

  // Add footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Add a footer background
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 280, 210, 20, "F");

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    doc.text("Soni Painting - Professional Painting Services", 105, 295, {
      align: "center",
    });
  }

  // Save the PDF
  doc.save(`Invoice_${invoice.invoiceId}.pdf`);
};

console.log("PDF generating module ready!");

// Function to generate and download the project PDF
export const generateProjectPDF = (project: Project) => {
  const doc = new jsPDF() as ExtendedJsPDF;

  // Add company header
  addCompanyHeader(doc);

  // Project title
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204); // Blue color for title
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT REPORT", 105, 50, { align: "center" });

  // Blue line below title
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Project details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Format date
  const formattedDate = new Date(project.date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("Project ID:", 20, 65);
  doc.text("Client Name:", 20, 72);
  doc.text("Address:", 20, 79);

  // Left column - values
  doc.setFont("helvetica", "normal");
  const labelWidth = 30;
  doc.text(`#${project.projectId}`, 20 + labelWidth, 65);
  doc.text(`${project.clientName}`, 20 + labelWidth, 72);
  doc.text(`${project.clientAddress}`, 20 + labelWidth, 79);

  // Right column
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 140, 65);
  doc.text("Client No:", 140, 72);
  doc.text("Status:", 140, 79);

  // Right column - values
  doc.setFont("helvetica", "normal");
  const rightLabelWidth = 25;
  doc.text(`${formattedDate}`, 140 + rightLabelWidth, 65);
  doc.text(`${project.clientNumber}`, 140 + rightLabelWidth, 72);
  
  // Status with color
  const status = project.status === "completed" ? "Completed" : "In Progress";
  doc.text(status, 140 + rightLabelWidth, 79);

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, 85, 190, 85);

  // Items table
  const tableColumn = ["#", "Description", "Area (sq.ft)", "Rate", "Total"];
  const tableRows =
    project.items?.map((item, index) => {
      const description = item.note
        ? `${item.description} (${item.note})`
        : `${item.description}`;

      return [
        index + 1,
        description,
        item.area || "-",
        formatCurrency(item.rate || 0),
        formatCurrency(
          item.total ??
            ((item.area && item.rate ? item.area * item.rate : item.rate) || 0)
        ),
      ];
    }) || [];

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 90,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && typeof data.cell.raw === "string") {
        data.cell.text = [data.cell.raw];
      }
    },
  });

  // Get the last Y position after the table
  let finalY = doc.lastAutoTable.finalY + 10;

  // Add extra work if available
  if (project.extraWork && project.extraWork.length > 0) {
    if (finalY > 220) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Extra Work", 20, finalY);
    finalY += 5;
    doc.setTextColor(0, 0, 0);

    const extraWorkColumns = ["#", "Description", "Total"];
    const extraWorkRows = project.extraWork.map((ew, index) => {
      const description = ew.note
        ? `${ew.description} (${ew.note})`
        : `${ew.description}`;

      return [index + 1, description, formatCurrency(ew.total || 0)];
    });

    autoTable(doc, {
      head: [extraWorkColumns],
      body: extraWorkRows,
      startY: finalY,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 35, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && typeof data.cell.raw === "string") {
          data.cell.text = [data.cell.raw];
        }
      },
    });

    finalY = doc.lastAutoTable.finalY + 10;
  }

  // Check if totals section will fit on current page
  const totalsHeight = (project.discount ?? 0) > 0 ? 37 : 30;
  if (finalY + totalsHeight > 220) {
    doc.addPage();
    finalY = 20;
  }

  // Add totals
  const totalLabelX = 140;
  const totalValueX = 190;

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(
    totalLabelX - 5,
    finalY - 5,
    totalValueX - totalLabelX + 10,
    totalsHeight,
    2,
    2,
    "FD"
  );

  let currentTotalY = finalY;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalLabelX, currentTotalY);
  doc.text(formatCurrency(project.subtotal || 0), totalValueX, currentTotalY, {
    align: "right",
  });
  currentTotalY += 7;

  if ((project.discount ?? 0) > 0) {
    doc.text("Discount:", totalLabelX, currentTotalY);
    doc.text(formatCurrency(project.discount), totalValueX, currentTotalY, {
      align: "right",
    });
    currentTotalY += 7;
  }

  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(
    totalLabelX - 5,
    currentTotalY - 2,
    totalValueX + 5,
    currentTotalY - 2
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 204);
  doc.text("Grand Total: ", totalLabelX, currentTotalY + 4);
  doc.text(formatCurrency(project.grandTotal || 0), totalValueX, currentTotalY + 4, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  currentTotalY += 11;

  // Calculate total paid
  const totalPaid = project.paymentHistory?.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  ) || 0;
  const amountDue = (project.grandTotal || 0) - totalPaid;

  doc.setTextColor(0, 128, 0); // Green for paid
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid:", totalLabelX, currentTotalY);
  doc.text(formatCurrency(totalPaid), totalValueX, currentTotalY, {
    align: "right",
  });
  currentTotalY += 7;

  doc.setTextColor(220, 53, 69); // Red for due
  doc.text("Balance Due:", totalLabelX, currentTotalY);
  doc.text(formatCurrency(amountDue), totalValueX, currentTotalY, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Start position for additional content
  let currentY = finalY + totalsHeight + 10;

  // Add payment history
  if (project.paymentHistory && project.paymentHistory.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Payment History", 20, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 5;

    const paymentColumns = ["Date", "Method", "Note", "Amount"];
    const paymentRows = project.paymentHistory.map((payment) => [
      new Date(payment.date).toLocaleDateString(),
      payment.method || "-",
      payment.note || "-",
      formatCurrency(Number(payment.amount)),
    ]);

    autoTable(doc, {
      head: [paymentColumns],
      body: paymentRows,
      startY: currentY,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 30, halign: "right" },
      },
    });

    currentY = doc.lastAutoTable.finalY + 15;
  }

  // Add notes
  if (project.note) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Notes", 20, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const splitNote = doc.splitTextToSize(project.note, 170);
    const noteHeight = splitNote.length * 6;

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(20, currentY - 5, 170, noteHeight + 10, 2, 2, "FD");

    doc.text(splitNote, 25, currentY);
    currentY += noteHeight + 15;
  }

  // Add site images
  if (project.siteImages && project.siteImages.length > 0) {
    if (currentY > 180) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text("Site Images", 20, currentY);
    currentY += 10;
    doc.setTextColor(0, 0, 0);

    const imagesPerRow = 2;
    const imageWidth = 80;
    const imageHeight = 60;

    for (let i = 0; i < project.siteImages.length; i++) {
      const row = Math.floor(i / imagesPerRow);
      const col = i % imagesPerRow;

      const x = 20 + col * (imageWidth + 10);
      const y = currentY + row * (imageHeight + 20);

      if (y > 250) {
        doc.addPage();
        currentY = 20;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 102, 204);
        doc.text("Site Images (continued)", 20, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 10;
        i--;
        continue;
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(
        x - 1,
        y - 1,
        imageWidth + 2,
        imageHeight + 2,
        2,
        2,
        "FD"
      );

      if (project.siteImages[i].url) {
        try {
          doc.addImage(
            project.siteImages[i].url,
            "JPEG",
            x,
            y,
            imageWidth,
            imageHeight
          );
        } catch {
          doc.setFontSize(8);
          doc.text(
            "Image not available",
            x + imageWidth / 2,
            y + imageHeight / 2,
            { align: "center" }
          );
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, imageWidth, imageHeight, "F");
      }
    }
  }

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 280, 210, 20, "F");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    doc.text("Soni Painting - Professional Painting Services", 105, 295, {
      align: "center",
    });
  }

  doc.save(`Project_${project.projectId}.pdf`);
};
