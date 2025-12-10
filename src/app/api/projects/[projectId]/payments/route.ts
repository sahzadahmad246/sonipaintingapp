import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import { sendNotification } from "@/lib/notifications";
import mongoose from "mongoose";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;
    const body = await request.json();
    const { amount, date, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const project = await Project.findOne({ projectId }).session(session);
    if (!project) {
        await session.abortTransaction();
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const newPayment = {
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      note: note || "Advance Payment",
    };

    project.paymentHistory.push(newPayment);
    project.lastUpdated = new Date();

    const currentTotalPayments = project.paymentHistory.reduce(
        (sum: number, payment: { amount: number }) => sum + payment.amount,
        0
    );
    
    project.amountDue = (project.grandTotal || 0) - currentTotalPayments;
    
    // Update status if fully paid
    if (project.amountDue <= 0) {
        project.status = "completed";
    }

    if (currentTotalPayments > project.grandTotal) {
         // Should we allow overpayment? For now, let's allow it but maybe warn? 
         // The original code in the other route errored. Let's error here too to be safe.
         await session.abortTransaction();
         return NextResponse.json({ error: "Total payments exceed grand total" }, { status: 400 });
    }

    await project.save({ session });

    // Sync Invoice
    const invoice = await Invoice.findOne({ projectId }).session(session);
    if (invoice) {
      invoice.paymentHistory = project.paymentHistory;
      invoice.amountDue = project.amountDue;
      invoice.lastUpdated = new Date();
      await invoice.save({ session });
    }

    // Audit Log
    await AuditLog.create(
      [
        {
          action: "add_project_payment",
          userId: authSession.user.id,
          details: { projectId, amount, note },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Notification (After commit)
    const invoiceUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/invoice/${invoice?.invoiceId || projectId}?token=${invoice?.accessToken || ""}`;
    const templateVariables: Record<string, string> = {
        "1": project.clientName, // Dear {{1}}
        "2": Number(amount).toFixed(2), // Payment amount {{2}}
        "3": project.quotationNumber || projectId, // Quotation #{{3}}
        "4": (project.amountDue || 0).toFixed(2), // Amount Due {{4}}
        "5": invoiceUrl, // View invoice {{5}}
    };
    const whatsappMessage = `Dear ${project.clientName}, we have received a payment of ₹${Number(amount).toFixed(2)} towards Quotation #${project.quotationNumber || projectId}. Amount Due: ₹${(project.amountDue || 0).toFixed(2)}. View invoice: ${invoiceUrl}`;

    try {
        await sendNotification({
          to: project.clientNumber,
          message: whatsappMessage,
          action: "payment_received",
          templateVariables,
        });
    } catch (whatsappError) {
        console.error(`WhatsApp Error for project ${projectId}:`, whatsappError);
        // Don't fail the request if notification fails, just log it.
    }

    return NextResponse.json(project);

  } catch (error: unknown) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    return handleError(error, "Failed to add payment");
  } finally {
    session.endSession();
  }
}
