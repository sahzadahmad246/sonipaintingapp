import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";

import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";

import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { createQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";

import { generateQuotationNumber } from "@/lib/generateQuotationNumber";

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
      updateHistory: [], // Initialize empty updateHistory
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
        const total = item.total
          ? `Total: ₹${item.total.toFixed(2)}`
          : `Total: ₹${item.rate.toFixed(2)}`;
        return `${index + 1}. ${item.description}${area ? `, ${area}` : ""}${
          rate ? `, ${rate}` : ""
        }, ${total}`;
      })
      .join("; ");
    const discountText =
      quotation.discount > 0
        ? `, Discount: ₹${quotation.discount.toFixed(2)}`
        : "";
    const whatsappMessage = `Dear ${
      quotation.clientName
    }, your Quotation #${quotationNumber} has been created. Items: ${itemDetails}. Subtotal: ₹${
      quotation.subtotal?.toFixed(2) || "0.00"
    }${discountText}, Grand Total: ₹${
      quotation.grandTotal?.toFixed(2) || "0.00"
    }. View details: ${
      process.env.NEXT_PUBLIC_FRONTEND_URL
    }/quotations/${quotationNumber}`;

    try {
      await sendNotification({
        to: quotation.clientNumber,
        message: whatsappMessage,
      });
    } catch {
      return NextResponse.json(
        {
          quotation,
          warning: "Quotation created, but failed to send notification",
        },
        { status: 201 }
      );
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
    const total = await Quotation.countDocuments({
      createdBy: session.user.id,
    });

    return NextResponse.json({
      quotations,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to create quotation");
  }
}
