import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import { generateProjectId } from "@/lib/generateProjectId";
import { generateInvoiceId } from "@/lib/generateInvoiceId";
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary";
import { randomBytes } from "crypto";

export async function GET(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationNumber } = await context.params;
    await dbConnect();

    const quotation = await Quotation.findOne({
      quotationNumber,
      createdBy: session.user.id,
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(quotation);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch quotation");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationNumber } = await context.params;
    const rawData = sanitizeInput(await request.json());
    const parsed = updateQuotationSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Use parsed.data instead of rawData
    const data = parsed.data;

    await dbConnect();

    const existingQuotation = await Quotation.findOne({ quotationNumber }).session(session);
    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const updateData: Partial<IQuotation> = {};
    let isStatusUpdate = false;
    let isFinancialUpdate = false;

    // Track financial fields for status reset
    if (data.items !== undefined) {
      // Transform items to allow null as per IQuotation
      updateData.items = data.items.map(item => ({
        ...item,
        area: item.area === undefined ? null : item.area,
        total: item.total === undefined ? null : item.total,
      }));
      isFinancialUpdate = true;
    }
    if (data.subtotal !== undefined) {
      updateData.subtotal = data.subtotal;
      isFinancialUpdate = true;
    }
    if (data.discount !== undefined) {
      updateData.discount = data.discount;
      isFinancialUpdate = true;
    }
    if (data.grandTotal !== undefined) {
      updateData.grandTotal = data.grandTotal;
      isFinancialUpdate = true;
    }

    // Non-financial fields
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
    if (data.clientNumber !== undefined) updateData.clientNumber = data.clientNumber;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : existingQuotation.date;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.note !== undefined) updateData.note = data.note;

    // Handle isAccepted status
    if (data.isAccepted !== undefined) {
      updateData.isAccepted = data.isAccepted;
      isStatusUpdate = true;
    } else if (isFinancialUpdate) {
      // Reset to pending if financial fields are updated
      updateData.isAccepted = "pending";
    }

    updateData.lastUpdated = new Date();

    const updatedQuotation = await Quotation.findOneAndUpdate(
      { quotationNumber, createdBy: authSession.user.id },
      { $set: updateData },
      { new: true, session }
    );

    if (!updatedQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (data.isAccepted === "accepted") {
      const existingProject = await Project.findOne({ quotationNumber }).session(session);
      if (!existingProject) {
        const projectId = await generateProjectId();
        await Project.create(
          [{
            projectId,
            quotationNumber,
            clientName: updatedQuotation.clientName,
            clientAddress: updatedQuotation.clientAddress,
            clientNumber: updatedQuotation.clientNumber,
            date: updatedQuotation.date,
            items: updatedQuotation.items,
            extraWork: [],
            subtotal: updatedQuotation.subtotal,
            discount: updatedQuotation.discount,
            grandTotal: updatedQuotation.grandTotal,
            paymentHistory: [],
            siteImages: [],
            createdAt: new Date(),
          }],
          { session }
        );

        const invoiceId = await generateInvoiceId();
        await Invoice.create(
          [{
            invoiceId,
            projectId,
            quotationNumber,
            clientName: updatedQuotation.clientName,
            clientAddress: updatedQuotation.clientAddress,
            clientNumber: updatedQuotation.clientNumber,
            date: updatedQuotation.date,
            items: updatedQuotation.items,
            extraWork: [],
            subtotal: updatedQuotation.subtotal || 0,
            discount: updatedQuotation.discount || 0,
            grandTotal: updatedQuotation.grandTotal || 0,
            paymentHistory: [],
            amountDue: updatedQuotation.grandTotal || 0,
            accessToken: randomBytes(16).toString("hex"),
            createdAt: new Date(),
          }],
          { session }
        );
        console.log(`Project ${projectId} and Invoice ${invoiceId} created for quotation ${quotationNumber}`);
      }
    }

    await AuditLog.create(
      [{
        action: isStatusUpdate ? "update_quotation_status" : "update_quotation",
        userId: authSession.user.id,
        details: { quotationNumber, changes: Object.keys(updateData) },
        createdAt: new Date(),
      }],
      { session }
    );

    await session.commitTransaction();

    const quotationUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/quotations/${quotationNumber}`;
    let whatsappMessage: string;

    if (isStatusUpdate) {
      const statusText = updatedQuotation.isAccepted === "accepted" ? "accepted" : "rejected";
      whatsappMessage = `Dear ${updatedQuotation.clientName}, you have ${statusText} Quotation #${quotationNumber}. Thank you! View details: ${quotationUrl}`;
    } else {
      const itemDetails = updatedQuotation.items
        .map((item: IQuotation["items"][number], index: number) => {
          const area = item.area ? `Area: ${item.area} sq.ft` : "";
          const rate = item.rate ? `Rate: ₹${item.rate.toFixed(2)}` : "";
          const total = item.total ? `Total: ₹${item.total.toFixed(2)}` : `Total: ₹${item.rate.toFixed(2)}`;
          return `${index + 1}. ${item.description}${area ? `, ${area}` : ""}${rate ? `, ${rate}` : ""}, ${total}`;
        })
        .join("; ");
      const discountText = updatedQuotation.discount > 0 ? `, Discount: ₹${updatedQuotation.discount.toFixed(2)}` : "";
      whatsappMessage = `Dear ${updatedQuotation.clientName}, your Quotation #${quotationNumber} has been updated. Items: ${itemDetails}. Subtotal: ₹${updatedQuotation.subtotal?.toFixed(2) || "0.00"}${discountText}, Grand Total: ₹${updatedQuotation.grandTotal?.toFixed(2) || "0.00"}. You can now accept or reject it again. View details: ${quotationUrl}`;
    }

    try {
      await sendNotification({
        to: updatedQuotation.clientNumber,
        message: whatsappMessage,
      });
    } catch {
      return NextResponse.json({
        quotation: updatedQuotation,
        warning: "Quotation updated, but failed to send notification",
      });
    }

    return NextResponse.json(updatedQuotation);
  } catch (error: unknown) {
    await session.abortTransaction();
    return handleError(error, "Failed to update quotation");
  } finally {
    session.endSession();
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationNumber } = await context.params;
    await dbConnect();
    const quotation = await Quotation.findOneAndDelete(
      { quotationNumber, createdBy: authSession.user.id },
      { session }
    );

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const project = await Project.findOneAndDelete({ quotationNumber }, { session });
    if (project) {
      for (const image of project.siteImages) {
        await cloudinary.uploader.destroy(image.publicId);
      }
      await Invoice.findOneAndDelete({ projectId: project.projectId }, { session });
    }

    await AuditLog.create(
      [{
        action: "delete_quotation",
        userId: authSession.user.id,
        details: { quotationNumber },
        createdAt: new Date(),
      }],
      { session }
    );

    await session.commitTransaction();
    return NextResponse.json({ message: "Quotation, project, and invoice deleted" });
  } catch (error: unknown) {
    await session.abortTransaction();
    return handleError(error, "Failed to delete quotation");
  } finally {
    session.endSession();
  }
}