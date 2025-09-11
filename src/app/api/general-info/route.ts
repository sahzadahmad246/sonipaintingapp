import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import GeneralInfo, { IGeneralInfo } from "@/models/GeneralInfo";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateGeneralInfoSchema } from "@/lib/validators";
import { cacheManager, CacheKeys, CacheTTL } from "@/lib/cache";
import { apiRateLimiter } from "@/lib/rateLimiter";
import cloudinary from "@/lib/cloudinary";

// Define Cloudinary upload result type
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await apiRateLimiter(request);
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse;
    }

    // Try to get from cache first
    const cached = await cacheManager.get(CacheKeys.GENERAL_INFO);
    if (cached) {
      return NextResponse.json(cached);
    }

    await dbConnect();
    const generalInfo = await GeneralInfo.findOne();
    if (!generalInfo) {
      return NextResponse.json({ error: "General info not found" }, { status: 404 });
    }

    // Cache the result
    await cacheManager.set(CacheKeys.GENERAL_INFO, generalInfo, {
      ttl: CacheTTL.LONG,
      tags: ["general_info"],
    });

    return NextResponse.json(generalInfo);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch general info");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File;
    const data = {
      siteName: sanitizeInput(formData.get("siteName") as string),
      gstNumber: sanitizeInput(formData.get("gstNumber") as string),
      gstPercent: Number(formData.get("gstPercent")),
      termsAndConditions: formData.get("termsAndConditions")
        ? JSON.parse(formData.get("termsAndConditions") as string)
        : [],
      mobileNumber1: sanitizeInput(formData.get("mobileNumber1") as string),
      mobileNumber2: sanitizeInput(formData.get("mobileNumber2") as string),
      address: sanitizeInput(formData.get("address") as string),
    };

    const parsed = updateGeneralInfoSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();
    const existingInfo = await GeneralInfo.findOne();

    let logoUrl = existingInfo?.logoUrl;
    let publicId = existingInfo?.publicId;

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload new logo to Cloudinary
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "general_info" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as CloudinaryUploadResult);
          }
        );
        uploadStream.end(buffer);
      });

      logoUrl = result.secure_url;
      publicId = result.public_id;

      // Delete previous logo from Cloudinary if it exists
      if (existingInfo?.publicId) {
        await cloudinary.uploader.destroy(existingInfo.publicId);
      }
    }

    const updateData: Partial<IGeneralInfo> = {
      logoUrl,
      publicId,
      siteName: parsed.data.siteName,
      gstNumber: parsed.data.gstNumber,
      termsAndConditions: parsed.data.termsAndConditions,
      mobileNumber1: parsed.data.mobileNumber1,
      mobileNumber2: parsed.data.mobileNumber2,
      address: parsed.data.address,
      lastUpdated: new Date(),
    };

    const generalInfo = await GeneralInfo.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      action: "update_general_info",
      userId: session.user.id,
      details: { changes: Object.keys(updateData), publicId: publicId || null },
    });

    // Invalidate cache
    await cacheManager.delete(CacheKeys.GENERAL_INFO);
    return NextResponse.json(generalInfo);
  } catch (error: unknown) {
    return handleError(error, "Failed to update general info");
  }
}