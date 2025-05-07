import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";
import Project, { IProject } from "@/models/Project";
import Invoice, { IInvoice } from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { generateProjectId } from "@/lib/generateProjectId";
import { generateInvoiceId } from "@/lib/generateInvoiceId";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
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
    if (!session.user.id) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
    }

    const { quotationNumber } = await context.params;
    await dbConnect();

    const quotation = await Quotation.findOne({ quotationNumber, createdBy: session.user.id });
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
    if (!authSession.user.id) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
    }

    const { quotationNumber } = await context.params;
    const data = sanitizeInput(await request.json());
    const parsed = updateQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();

    const existingQuotation = await Quotation.findOne({ quotationNumber, createdBy: authSession.user.id }).session(session);
    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const updateData: Partial<IQuotation> = {};
    let isStatusUpdate = false;
    const changedFields: string[] = [];

    // Helper function to format item details
    const formatItem = (item: IQuotation["items"][number]): string => {
      const parts: string[] = [`${item.description}`];
      if (item.area != null) parts.push(`area ${item.area} m`);
      parts.push(`rate ${item.rate}`);
      if (item.total != null) parts.push(`total ${item.total}`);
      if (item.note) parts.push(`note: ${item.note}`);
      return parts.join(", ");
    };

    // Detect changes
    if (parsed.data) {
      if (
        parsed.data.clientName !== undefined &&
        parsed.data.clientName !== existingQuotation.clientName
      ) {
        updateData.clientName = parsed.data.clientName;
        changedFields.push(`Client name changed from "${existingQuotation.clientName}" to "${parsed.data.clientName}"`);
      }
      if (
        parsed.data.clientAddress !== undefined &&
        parsed.data.clientAddress !== existingQuotation.clientAddress
      ) {
        updateData.clientAddress = parsed.data.clientAddress;
        changedFields.push(`Client address changed from "${existingQuotation.clientAddress}" to "${parsed.data.clientAddress}"`);
      }
      if (
        parsed.data.clientNumber !== undefined &&
        parsed.data.clientNumber !== existingQuotation.clientNumber
      ) {
        updateData.clientNumber = parsed.data.clientNumber;
        changedFields.push(`Client number changed from "${existingQuotation.clientNumber}" to "${parsed.data.clientNumber}"`);
      }
      if (
        parsed.data.date !== undefined &&
        new Date(parsed.data.date).toISOString() !== new Date(existingQuotation.date).toISOString()
      ) {
        updateData.date = new Date(parsed.data.date);
        changedFields.push(`Date changed from "${existingQuotation.date.toISOString()}" to "${parsed.data.date}"`);
      }
      if (parsed.data.items !== undefined) {
        const oldItems: IQuotation["items"] = existingQuotation.items || [];
        const newItems: IQuotation["items"] = parsed.data.items || [];
        const addedItems = newItems.filter(
          (newItem: IQuotation["items"][number]) => !oldItems.some(
            (oldItem: IQuotation["items"][number]) => 
              oldItem.description === newItem.description &&
              (oldItem.area ?? null) === (newItem.area ?? null) &&
              oldItem.rate === newItem.rate &&
              (oldItem.total ?? null) === (newItem.total ?? null) &&
              (oldItem.note ?? '') === (newItem.note ?? '')
          )
        );
        const removedItems = oldItems.filter(
          (oldItem: IQuotation["items"][number]) => !newItems.some(
            (newItem: IQuotation["items"][number]) => 
              newItem.description === oldItem.description &&
              (newItem.area ?? null) === (oldItem.area ?? null) &&
              newItem.rate === oldItem.rate &&
              (newItem.total ?? null) === (newItem.total ?? null) &&
              (newItem.note ?? '') === (newItem.note ?? '')
          )
        );
        if (addedItems.length > 0 || removedItems.length > 0) {
          updateData.items = newItems;
          addedItems.forEach((item: IQuotation["items"][number]) => {
            changedFields.push(`New item added: ${formatItem(item)}`);
          });
          removedItems.forEach((item: IQuotation["items"][number]) => {
            changedFields.push(`Item removed: ${formatItem(item)}`);
          });
        }
      }
      if (
        parsed.data.subtotal !== undefined &&
        parsed.data.subtotal !== existingQuotation.subtotal
      ) {
        updateData.subtotal = parsed.data.subtotal;
        changedFields.push(`Subtotal changed from ${existingQuotation.subtotal || 0} to ${parsed.data.subtotal}`);
      }
      if (
        parsed.data.discount !== undefined &&
        parsed.data.discount !== existingQuotation.discount
      ) {
        updateData.discount = parsed.data.discount;
        changedFields.push(`Discount changed from ${existingQuotation.discount || 0} to ${parsed.data.discount}`);
      }
      if (
        parsed.data.grandTotal !== undefined &&
        parsed.data.grandTotal !== existingQuotation.grandTotal
      ) {
        updateData.grandTotal = parsed.data.grandTotal;
        changedFields.push(`Grand total changed from ${existingQuotation.grandTotal || 0} to ${parsed.data.grandTotal}`);
      }
      if (parsed.data.terms !== undefined) {
        const oldTerms: string[] = existingQuotation.terms || [];
        const newTerms: string[] = parsed.data.terms || [];
        const addedTerms = newTerms.filter((term: string) => !oldTerms.includes(term));
        const removedTerms = oldTerms.filter((term: string) => !newTerms.includes(term));
        if (addedTerms.length > 0 || removedTerms.length > 0) {
          updateData.terms = newTerms;
          addedTerms.forEach((term: string) => {
            changedFields.push(`Term added: "${term}"`);
          });
          removedTerms.forEach((term: string) => {
            changedFields.push(`Term removed: "${term}"`);
          });
        }
      }
      if (
        parsed.data.note !== undefined &&
        parsed.data.note !== existingQuotation.note
      ) {
        updateData.note = parsed.data.note;
        changedFields.push(`Note changed from "${existingQuotation.note || ''}" to "${parsed.data.note}"`);
      }
      if (
        parsed.data.isAccepted !== undefined &&
        parsed.data.isAccepted !== existingQuotation.isAccepted
      ) {
        updateData.isAccepted = parsed.data.isAccepted;
        isStatusUpdate = true;
        changedFields.push(`Status changed from "${existingQuotation.isAccepted}" to "${parsed.data.isAccepted}"`);
      } else if (existingQuotation.isAccepted !== "pending" && changedFields.length > 0) {
        updateData.isAccepted = "pending";
        changedFields.push(`Status changed from "${existingQuotation.isAccepted}" to "pending"`);
      }
    }
    updateData.lastUpdated = new Date();

    // Log changed fields for debugging
    console.log("Changed fields:", changedFields);

    // Only add to updateHistory if there are actual changes
    if (changedFields.length > 0) {
      updateData.updateHistory = [
        ...(existingQuotation.updateHistory || []),
        {
          updatedAt: new Date(),
          updatedBy: authSession.user.id,
          changes: changedFields,
        },
      ];
    }

    // Log updateData for debugging
    console.log("Update data:", JSON.stringify(updateData, null, 2));

    const updatedQuotation = await Quotation.findOneAndUpdate(
      { quotationNumber, createdBy: authSession.user.id },
      { $set: updateData },
      { new: true, session }
    );

    if (!updatedQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Update Project and Invoice if quotation is accepted
    if (parsed.data?.isAccepted === "accepted") {
      const existingProject = await Project.findOne({ quotationNumber, createdBy: authSession.user.id }).session(session);
      if (existingProject) {
        const projectUpdate: Partial<IProject> = {
          clientName: updatedQuotation.clientName,
          clientAddress: updatedQuotation.clientAddress,
          clientNumber: updatedQuotation.clientNumber,
          date: updatedQuotation.date,
          items: updatedQuotation.items,
          subtotal: updatedQuotation.subtotal,
          discount: updatedQuotation.discount,
          grandTotal: updatedQuotation.grandTotal,
          amountDue: updatedQuotation.grandTotal || 0,
          terms: updatedQuotation.terms,
          note: updatedQuotation.note,
          lastUpdated: new Date(),
          status: "ongoing",
          updateHistory: [
            ...(existingProject.updateHistory || []),
            {
              updatedAt: new Date(),
              updatedBy: authSession.user.id,
              changes: ["clientName", "clientAddress", "clientNumber", "date", "items", "subtotal", "discount", "grandTotal", "amountDue", "terms", "note", "status"],
            },
          ],
        };
        const updatedProject = await Project.findOneAndUpdate(
          { quotationNumber, createdBy: authSession.user.id },
          { $set: projectUpdate },
          { new: true, session }
        );
        if (!updatedProject) {
          throw new Error(`Failed to update project for quotation ${quotationNumber}`);
        }
        console.log(`Project updated for quotation ${quotationNumber}`);

        const invoice = await Invoice.findOne({ quotationNumber, projectId: existingProject.projectId }).session(session);
        if (invoice) {
          const totalPayments = existingProject.paymentHistory?.reduce(
            (sum: number, payment: { amount: number }) => sum + payment.amount,
            0
          ) || 0;
          const invoiceUpdate: Partial<IInvoice> = {
            clientName: updatedQuotation.clientName,
            clientAddress: updatedQuotation.clientAddress,
            clientNumber: updatedQuotation.clientNumber,
            date: updatedQuotation.date,
            items: updatedQuotation.items,
            subtotal: updatedQuotation.subtotal || 0,
            discount: updatedQuotation.discount || 0,
            grandTotal: updatedQuotation.grandTotal || 0,
            amountDue: (updatedQuotation.grandTotal || 0) - totalPayments,
            lastUpdated: new Date(),
            terms: updatedQuotation.terms,
          };
          const updatedInvoice = await Invoice.findOneAndUpdate(
            { quotationNumber, projectId: existingProject.projectId },
            { $set: invoiceUpdate },
            { new: true, session }
          );
          if (!updatedInvoice) {
            throw new Error(`Failed to update invoice for quotation ${quotationNumber}`);
          }
          console.log(`Invoice updated for quotation ${quotationNumber}`);
        }
      } else {
        const projectId = await generateProjectId();
        const projectData: Partial<IProject> = {
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
          amountDue: updatedQuotation.grandTotal || 0,
          paymentHistory: [],
          siteImages: [],
          terms: updatedQuotation.terms,
          note: updatedQuotation.note,
          createdAt: new Date(),
          createdBy: authSession.user.id,
          status: "ongoing",
          updateHistory: [{
            updatedAt: new Date(),
            updatedBy: authSession.user.id,
            changes: ["Project created"],
          }],
        };
        const newProject = await Project.create([projectData], { session });
        if (!newProject || newProject.length === 0) {
          throw new Error(`Failed to create project for quotation ${quotationNumber}`);
        }
        console.log(`Project ${projectId} created for quotation ${quotationNumber}`);

        const invoiceId = await generateInvoiceId();
        const invoiceData: Partial<IInvoice> = {
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
          amountDue: updatedQuotation.grandTotal || 0,
          paymentHistory: [],
          accessToken: randomBytes(16).toString("hex"),
          createdAt: new Date(),
          terms: updatedQuotation.terms,
        };
        const newInvoice = await Invoice.create([invoiceData], { session });
        if (!newInvoice || newInvoice.length === 0) {
          throw new Error(`Failed to create invoice for quotation ${quotationNumber}`);
        }
        console.log(`Invoice ${invoiceId} created for quotation ${quotationNumber}`);
      }
    }

    await AuditLog.create(
      [{
        action: isStatusUpdate ? "update_quotation_status" : "update_quotation",
        userId: authSession.user.id,
        details: { quotationNumber, changes: changedFields },
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
      console.log(`WhatsApp notification sent for quotation ${quotationNumber}`);
    } catch (error: unknown) {
      console.error(`Failed to send WhatsApp notification for quotation ${quotationNumber}:`, error);
      return NextResponse.json({
        quotation: updatedQuotation,
        warning: "Quotation updated, but failed to send notification",
      });
    }

    return NextResponse.json(updatedQuotation);
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("PUT /api/quotations/[quotationNumber] error:", error);
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
    if (!authSession.user.id) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
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

    const project = await Project.findOneAndDelete({ quotationNumber, createdBy: authSession.user.id }, { session });
    if (project) {
      for (const image of project.siteImages) {
        await cloudinary.uploader.destroy(image.publicId);
      }
      await Invoice.findOneAndDelete({ projectId: project.projectId, quotationNumber }, { session });
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
    console.error("DELETE /api/quotations/[quotationNumber] error:", error);
    return handleError(error, "Failed to delete quotation");
  } finally {
    session.endSession();
  }
}