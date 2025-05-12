import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateInvoiceSchema } from "@/lib/validators";

// Define the type for updateData based on the Invoice model
interface UpdateInvoiceData {
  clientName?: string;
  clientAddress?: string;
  clientNumber?: string;
  date?: Date;
  items?: {
    description: string;
    area?: number;
    rate: number;
    total?: number;
    note?: string;
  }[];
  extraWork?: {
    description: string;
    total: number;
    note?: string;
  }[];
  subtotal?: number;
  discount?: number;
  grandTotal?: number;
  paymentHistory?: {
    amount: number;
    date?: Date;
    note?: string;
  }[];
  amountDue?: number;
  lastUpdated?: Date;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;
    
    await dbConnect();
    const invoice = await Invoice.findOne({ invoiceId });
    
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch invoice");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await context.params;
    const rawData = sanitizeInput(await request.json());
    const parsed = updateInvoiceSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Use parsed.data to ensure type safety
    const data = parsed.data;

    await dbConnect();

    const updateData: UpdateInvoiceData = {};
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
    if (data.clientNumber !== undefined) updateData.clientNumber = data.clientNumber;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : undefined;
    if (data.items !== undefined) {
      updateData.items = data.items.map(item => ({
        ...item,
        area: item.area === null ? undefined : item.area,
        total: item.total === null ? undefined : item.total,
      }));
    }
    if (data.extraWork !== undefined) updateData.extraWork = data.extraWork;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.grandTotal !== undefined) updateData.grandTotal = data.grandTotal;
    if (data.paymentHistory !== undefined) {
      updateData.paymentHistory = data.paymentHistory.map(payment => ({
        ...payment,
        date: payment.date ? new Date(payment.date) : new Date(),
      }));
    }
    if (data.amountDue !== undefined) updateData.amountDue = data.amountDue;
    updateData.lastUpdated = new Date();

    const invoice = await Invoice.findOneAndUpdate(
      { invoiceId },
      { $set: updateData },
      { new: true }
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await AuditLog.create({
      action: "update_invoice",
      userId: session.user.id,
      details: { invoiceId, changes: Object.keys(updateData) },
    });

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    return handleError(error, "Failed to update invoice");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await context.params;
    await dbConnect();
    const invoice = await Invoice.findOneAndDelete({ invoiceId });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await AuditLog.create({
      action: "delete_invoice",
      userId: session.user.id,
      details: { invoiceId },
    });

    return NextResponse.json({ message: "Invoice deleted" });
  } catch (error: unknown) {
    return handleError(error, "Failed to delete invoice");
  }
}