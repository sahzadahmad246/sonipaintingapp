import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const sort = searchParams.get("sort") === "oldest" ? 1 : -1;
    const query: Record<string, unknown> = {};

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { clientName: searchRegex },
        { projectId: searchRegex },
        { clientAddress: searchRegex },
        { clientNumber: searchRegex },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    await dbConnect();
    const projects = await Project.find(query)
      .sort({ createdAt: sort })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    const total = await Project.countDocuments(query);

    return NextResponse.json({
      projects,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch projects");
  }
}
