import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Portfolio from "@/models/Portfolio";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { createPortfolioSchema, deletePortfolioSchema } from "@/lib/validators";

// Define Cloudinary upload result type
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    await dbConnect();
    const portfolio = await Portfolio.find()
      .sort({ uploadedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Portfolio.countDocuments();

    return NextResponse.json({
      portfolio,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch portfolio");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;
    const title = sanitizeInput(formData.get("title") as string);
    const description = sanitizeInput(formData.get("description") as string);

    const parsed = createPortfolioSchema.safeParse({ title, description });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "portfolio" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      );
      uploadStream.end(buffer);
    });

    await dbConnect();
    const portfolio = await Portfolio.create({
      imageUrl: result.secure_url,
      publicId: result.public_id,
      title: parsed.data.title,
      description: parsed.data.description,
      uploadedAt: new Date(),
    });

    await AuditLog.create({
      action: "upload_portfolio",
      userId: session.user.id,
      details: { publicId: result.public_id, title: parsed.data.title },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error: unknown) {
    return handleError(error, "Failed to upload portfolio image");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = sanitizeInput(await request.json());
    const parsed = deletePortfolioSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();
    const portfolio = await Portfolio.findOneAndDelete({ publicId: parsed.data.publicId });

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio image not found" }, { status: 404 });
    }

    await cloudinary.uploader.destroy(parsed.data.publicId);

    await AuditLog.create({
      action: "delete_portfolio",
      userId: session.user.id,
      details: { publicId: parsed.data.publicId },
    });

    return NextResponse.json({ message: "Portfolio image deleted" });
  } catch (error: unknown) {
    return handleError(error, "Failed to delete portfolio image");
  }
}