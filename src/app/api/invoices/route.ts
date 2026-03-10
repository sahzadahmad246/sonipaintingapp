import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { handleError } from "@/lib/errorHandler";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Parse query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = (url.searchParams.get("search") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const sort = url.searchParams.get("sort") === "oldest" ? 1 : -1;
    const skip = (page - 1) * limit;
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const clauses: Record<string, unknown>[] = [];

    if (search) {
      const searchRegex = new RegExp(escapedSearch, "i");
      clauses.push({
        $or: [
          { clientName: searchRegex },
          { invoiceId: searchRegex },
          { clientAddress: searchRegex },
          { clientNumber: searchRegex },
        ],
      });
    }

    if (status === "paid") {
      clauses.push({
        $expr: {
          $lte: [{ $ifNull: ["$amountDue", 0] }, 0],
        },
      });
    } else if (status === "partially-paid") {
      clauses.push({
        $expr: {
          $and: [
            { $gt: [{ $ifNull: ["$amountDue", 0] }, 0] },
            { $lt: [{ $ifNull: ["$amountDue", 0] }, { $ifNull: ["$grandTotal", 0] }] },
          ],
        },
      });
    } else if (status === "unpaid") {
      clauses.push({
        $expr: {
          $gte: [{ $ifNull: ["$amountDue", 0] }, { $ifNull: ["$grandTotal", 0] }],
        },
      });
    }

    const query = clauses.length > 0 ? { $and: clauses } : {};

    // Fetch invoices with pagination
    const invoices = await Invoice.find(query)
      .sort({ createdAt: sort })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get total count for pagination
    const total = await Invoice.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Sanitize paymentHistory (ensure it's an array)
    const sanitizedInvoices = invoices.map((invoice) => ({
      ...invoice,
      paymentHistory: Array.isArray(invoice.paymentHistory) ? invoice.paymentHistory : [],
    }));

    return NextResponse.json({
      invoices: sanitizedInvoices,
      total,
      page,
      pages,
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch invoices");
  }
}
