import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { generateProjectId } from "@/lib/generateProjectId";
import { generateInvoiceId } from "@/lib/generateInvoiceId";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { createQuotationSchema, updateQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary";
import { generateQuotationNumber } from "@/lib/generateQuotationNumber";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = sanitizeInput(await request.json());
    const parsed = createQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();

    const quotationNumber = await generateQuotationNumber();
    const quotationData: Partial<IQuotation> = {
      quotationNumber,
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      clientNumber: parsed.data.clientNumber,
      date: new Date(parsed.data.date),
      items: parsed.data.items,
      subtotal: parsed.data.subtotal,
      discount: parsed.data.discount,
      grandTotal: parsed.data.grandTotal,
      terms: parsed.data.terms || [],
      note: parsed.data.note,
      createdBy: session.user.id,
      isAccepted: "pending",
    };

    const quotation = await Quotation.create(quotationData);

    await AuditLog.create({
      action: "create_quotation",
      userId: session.user.id,
      details: { quotationNumber, clientName: parsed.data.clientName },
    });

    const itemDetails = quotation.items
      .map((item: IQuotation["items"][number], index: number) => {
        const area = item.area ? `Area: ${item.area} sq.ft` : "";
        const rate = item.rate ? `Rate: ₹${item.rate.toFixed(2)}` : "";
        const total = item.total ? `Total: ₹${item.total.toFixed(2)}` : `Total: ₹${item.rate.toFixed(2)}`;
        return `${index + 1}. ${item.description}${area ? `, ${area}` : ""}${rate ? `, ${rate}` : ""}, ${total}`;
      })
      .join("; ");
    const discountText = quotation.discount > 0 ? `, Discount: ₹${quotation.discount.toFixed(2)}ball` : "";
    const whatsappMessage = `Dear ${quotation.clientName}, your Quotation #${quotationNumber} has been created. Items: ${itemDetails}. Subtotal: ₹${quotation.subtotal?.toFixed(2) || "0.00"}${discountText}, Grand Total: ₹${quotation.grandTotal?.toFixed(2) || "0.00"}. View details: ${process.env.NEXT_PUBLIC_FRONTEND_URL}/quotations/${quotationNumber}`;

    try {
      await sendNotification({
        to: quotation.clientNumber,
        message: whatsappMessage,
      });
    } catch {
      return NextResponse.json({
        quotation,
        warning: "Quotation created, but failed to send notification",
      }, { status: 201 });
    }

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: unknown) {
    return handleError(error, "Failed to create quotation");
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    await dbConnect();
    const quotations = await Quotation.find({ createdBy: session.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Quotation.countDocuments({ createdBy: session.user.id });

    return NextResponse.json({
      quotations,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch quotations");
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
    const data = sanitizeInput(await request.json());
    const parsed = updateQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();

    const existingQuotation = await Quotation.findOne({ quotationNumber }).session(session);
    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const updateData: Partial<IQuotation> = {};
    let isStatusUpdate = false;

    // Safely handle data properties
    if (parsed.data) {
      if (parsed.data.clientName !== undefined) updateData.clientName = parsed.data.clientName;
      if (parsed.data.clientAddress !== undefined) updateData.clientAddress = parsed.data.clientAddress;
      if (parsed.data.clientNumber !== undefined) updateData.clientNumber = parsed.data.clientNumber;
      if (parsed.data.date !== undefined) updateData.date = parsed.data.date ? new Date(parsed.data.date) : existingQuotation.date;
      if (parsed.data.items !== undefined) updateData.items = parsed.data.items;
      if (parsed.data.subtotal !== undefined) updateData.subtotal = parsed.data.subtotal;
      if (parsed.data.discount !== undefined) updateData.discount = parsed.data.discount;
      if (parsed.data.grandTotal !== undefined) updateData.grandTotal = parsed.data.grandTotal;
      if (parsed.data.terms !== undefined) updateData.terms = parsed.data.terms;
      if (parsed.data.note !== undefined) updateData.note = parsed.data.note;
      if (parsed.data.isAccepted !== undefined) {
        updateData.isAccepted = parsed.data.isAccepted;
        isStatusUpdate = true;
      } else if (existingQuotation.isAccepted !== "pending") {
        updateData.isAccepted = "pending";
      }
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

    if (parsed.data?.isAccepted === "accepted") {
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
          const total = item.total ? `Total: ₹${item.total.toFixed(2)}` : `Total:₹${item.rate.toFixed(2)}`;
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