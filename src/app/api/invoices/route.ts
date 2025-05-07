import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { handleError } from "@/lib/errorHandler";

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Fetch invoices with pagination
    const invoices = await Invoice.find()
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get total count for pagination
    const total = await Invoice.countDocuments();
    const pages = Math.ceil(total / limit);

    // Sanitize paymentHistory (ensure it's an array)
    const sanitizedInvoices = invoices.map((invoice) => ({
      ...invoice,
      paymentHistory: Array.isArray(invoice.paymentHistory) ? invoice.paymentHistory : [],
    }));

    return NextResponse.json({
      invoices: sanitizedInvoices,
      total,
      pages,
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch invoices");
  }
}