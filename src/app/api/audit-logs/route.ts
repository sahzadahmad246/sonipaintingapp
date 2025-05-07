// src/app/api/audit-logs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";

export async function GET(request: Request) {
  try {
    // Check authentication (require admin role)
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Fetch audit logs with pagination
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get total count for pagination
    const total = await AuditLog.countDocuments();
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      logs,
      total,
      pages,
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch audit logs");
  }
}