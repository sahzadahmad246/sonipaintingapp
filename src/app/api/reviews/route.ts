import { NextRequest, NextResponse } from "next/server";
import { reviewSchema } from "@/lib/validators";
import { reviewRateLimiter } from "@/lib/rateLimiter";
import { handleError } from "@/lib/errorHandler";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// POST - Submit review
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await reviewRateLimiter(request);
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse;
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = reviewSchema.parse(body);
    
    await dbConnect();
    
    // Check if user has already reviewed this service type
    const existingReview = await Review.findOne({
      phone: validatedData.phone,
      serviceType: validatedData.serviceType,
      status: { $in: ["pending", "approved"] }
    });
    
    if (existingReview) {
      return NextResponse.json(
        { error: "You have already submitted a review for this service type." },
        { status: 409 }
      );
    }
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create review record
    const review = await Review.create({
      ...validatedData,
      status: "pending",
      isVerified: false,
      verificationCode,
    });
    
    // TODO: Send SMS with verification code
    // TODO: Implement SMS service integration
    
    return NextResponse.json(
      { 
        message: "Review submitted successfully! Please verify your mobile number to publish your review.",
        reviewId: review._id,
        verificationRequired: true,
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
    return handleError(error, "Failed to submit review");
  }
}

// GET - Fetch reviews (public and admin)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const serviceType = url.searchParams.get("serviceType");
    const status = url.searchParams.get("status") || "approved"; // Default to approved for public
    const skip = (page - 1) * limit;
    
    // Check if admin is requesting
    const session = await getServerSession(authOptions);
    const isAdmin = session && session.user.role === "admin";
    
    await dbConnect();
    
    // Build query
    const query: Record<string, string | boolean> = {};
    if (serviceType) {
      query.serviceType = serviceType;
    }
    
    // Non-admin users can only see approved reviews
    if (!isAdmin) {
      query.status = "approved";
      query.isVerified = true;
    } else {
      query.status = status;
    }
    
    // Fetch reviews with pagination
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Get total count
    const total = await Review.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get statistics (admin only)
    let statistics = null;
    if (isAdmin) {
      const stats = await Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
            },
          }
        }
      ]);
      
      const serviceTypeStats = await Review.aggregate([
        {
          $group: {
            _id: "$serviceType",
            count: { $sum: 1 },
            averageRating: { $avg: "$rating" }
          }
        }
      ]);
      
      statistics = {
        ...stats[0],
        serviceTypeStats,
      };
    }
    
    return NextResponse.json({
      reviews,
      total,
      pages,
      currentPage: page,
      statistics,
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch reviews");
  }
}