import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import { updateReviewSchema } from "@/lib/validators";
import { z } from "zod";

// Verify review schema
const verifyReviewSchema = z.object({
  verificationCode: z.string().length(6, "Verification code must be 6 digits"),
});

// GET - Fetch single review
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    // Check if admin is requesting
    const session = await getServerSession(authOptions);
    const isAdmin = session && session.user.role === "admin";
    
    await dbConnect();
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    
    // Non-admin users can only see approved and verified reviews
    if (!isAdmin && (review.status !== "approved" || !review.isVerified)) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    
    return NextResponse.json(review);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch review");
  }
}

// PUT - Update review (admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await context.params;
    const body = await request.json();
    
    // Validate input
    const validatedData = updateReviewSchema.parse(body);
    
    await dbConnect();
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    
    // Update review
    const updateData: Record<string, unknown> = { ...validatedData };
    
    // If status is being changed, set moderation info
    if (validatedData.status && validatedData.status !== review.status) {
      updateData.moderatedAt = new Date();
      updateData.moderatedBy = session.user.id;
    }
    
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json(updatedReview);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }
    return handleError(error, "Failed to update review");
  }
}

// POST - Verify review
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    const body = await request.json();
    
    // Validate input
    const validatedData = verifyReviewSchema.parse(body);
    
    await dbConnect();
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    
    if (review.isVerified) {
      return NextResponse.json({ error: "Review is already verified" }, { status: 400 });
    }
    
    if (review.verificationCode !== validatedData.verificationCode) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }
    
    // Verify the review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        isVerified: true,
        verifiedAt: new Date(),
        verificationCode: undefined, // Remove verification code
      },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      message: "Review verified successfully!",
      review: updatedReview,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }
    return handleError(error, "Failed to verify review");
  }
}

// DELETE - Delete review (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await context.params;
    
    await dbConnect();
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    
    await Review.findByIdAndDelete(reviewId);
    
    return NextResponse.json({ message: "Review deleted successfully" });
  } catch (error: unknown) {
    return handleError(error, "Failed to delete review");
  }
}
