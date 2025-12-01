import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation from "@/models/Quotation";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const [
      totalQuotations,
      pendingQuotations,
      acceptedQuotations,
      rejectedQuotations,
      totalProjects,
      totalInvoices,
    ] = await Promise.all([
      Quotation.countDocuments({}),
      Quotation.countDocuments({ isAccepted: "pending" }),
      Quotation.countDocuments({ isAccepted: "accepted" }),
      Quotation.countDocuments({ isAccepted: "rejected" }),
      Project.countDocuments({}),
      Invoice.countDocuments({}),
    ]);

    return NextResponse.json({
      quotations: {
        total: totalQuotations,
        pending: pendingQuotations,
        accepted: acceptedQuotations,
        rejected: rejectedQuotations,
      },
      projects: {
        total: totalProjects,
      },
      invoices: {
        total: totalInvoices,
      },
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch dashboard stats");
  }
}
