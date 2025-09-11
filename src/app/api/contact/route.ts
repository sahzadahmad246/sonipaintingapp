import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validators";
import { contactFormRateLimiter } from "@/lib/rateLimiter";
import { handleError } from "@/lib/errorHandler";
import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// POST - Submit contact form
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await contactFormRateLimiter(request);
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse;
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = contactFormSchema.parse(body);
    
    await dbConnect();
    
    // Check for duplicate submissions (same email and message in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingContact = await Contact.findOne({
      email: validatedData.email,
      message: validatedData.message,
      createdAt: { $gte: oneHourAgo }
    });
    
    if (existingContact) {
      return NextResponse.json(
        { error: "Duplicate submission detected. Please wait before submitting again." },
        { status: 429 }
      );
    }
    
    // Create contact record
    const contact = await Contact.create({
      ...validatedData,
      status: "new",
    });
    
    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user
    
    return NextResponse.json(
      { 
        message: "Your message has been sent successfully! We'll get back to you soon.",
        id: contact._id 
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }
    return handleError(error, "Failed to submit contact form");
  }
}

// GET - Fetch contact messages (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const status = url.searchParams.get("status") || "all";
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, string> = {};
    if (status !== "all") {
      query.status = status;
    }
    
    // Fetch contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Get total count
    const total = await Contact.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get status counts
    const statusCounts = await Contact.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      contacts,
      total,
      pages,
      currentPage: page,
      statusCounts: {
        new: statusCountsMap.new || 0,
        read: statusCountsMap.read || 0,
        replied: statusCountsMap.replied || 0,
        archived: statusCountsMap.archived || 0,
        total: total,
      },
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch contact messages");
  }
}
