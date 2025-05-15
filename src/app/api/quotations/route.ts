import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { createQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import { generateQuotationNumber } from "@/lib/generateQuotationNumber";
import cloudinary from "@/lib/cloudinary";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

interface UpdateQuotationData extends Partial<IQuotation> {
  existingImages?: { url: string; publicId: string; description?: string }[];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      console.log("Unauthorized access attempt", { user: session?.user });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    console.log("Received FormData entries:", [...formData.entries()]);

    const sanitizeToString = (value: FormDataEntryValue | null): string | undefined => {
      if (value == null || value instanceof File) return undefined;
      const sanitized = sanitizeInput(value);
      console.log(`Sanitizing input: ${value} -> ${sanitized}`);
      return typeof sanitized === "string" ? sanitized : undefined;
    };

    const data: UpdateQuotationData = {
      clientName: sanitizeToString(formData.get("clientName")),
      clientAddress: sanitizeToString(formData.get("clientAddress")),
      clientNumber: sanitizeToString(formData.get("clientNumber")),
      date: sanitizeToString(formData.get("date")) ? new Date(sanitizeToString(formData.get("date"))!) : undefined,
      discount: formData.get("discount") ? Number(formData.get("discount")) || 0 : undefined,
      note: sanitizeToString(formData.get("note")),
      subtotal: formData.get("subtotal") ? Number(formData.get("subtotal")) || 0 : undefined,
      grandTotal: formData.get("grandTotal") ? Number(formData.get("grandTotal")) || 0 : undefined,
    };

    console.log("Parsed data (before items and existingImages):", data);

    try {
      data.items = formData.get("items") ? JSON.parse(sanitizeToString(formData.get("items")) ?? "[]") : undefined;
      data.existingImages = formData.get("existingImages")
        ? JSON.parse(sanitizeToString(formData.get("existingImages")) ?? "[]")
        : [];
      console.log("Parsed items:", data.items);
      console.log("Parsed existingImages:", data.existingImages);
    } catch (error: unknown) {
      console.error("JSON parsing error:", error);
      return NextResponse.json(
        { error: "Invalid JSON in items or existingImages" },
        { status: 400 }
      );
    }

    data.terms = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("terms[")) {
        const sanitizedTerm = sanitizeToString(value);
        if (sanitizedTerm) {
          data.terms.push(sanitizedTerm);
        }
      }
    }
    if (data.terms.length === 0) {
      data.terms = undefined;
    }
    console.log("Parsed terms:", data.terms);

    const siteImages: { url: string; publicId: string; description?: string }[] = data.existingImages || [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("siteImages[") && !key.includes(".description")) {
        const file = value as File;
        console.log(`Processing siteImage: ${key}`, { name: file.name, size: file.size, type: file.type });
        if (file && file.size > 0) {
          const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
          if (!allowedTypes.includes(file.type)) {
            console.log(`Invalid file type for ${key}: ${file.type}`);
            continue;
          }
          if (file.size > 5 * 1024 * 1024) {
            console.log(`File too large for ${key}: ${file.size} bytes`);
            continue;
          }

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          try {
            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "quotations" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result as CloudinaryUploadResult);
                }
              );
              uploadStream.end(buffer);
            });
            console.log("Cloudinary upload result:", result);

            const descriptionKey = `${key}.description`;
            const description = sanitizeToString(formData.get(descriptionKey));
            console.log(`Sanitized description for ${descriptionKey}:`, description);

            siteImages.push({
              url: result.secure_url,
              publicId: result.public_id,
              description,
            });
          } catch (uploadError: unknown) {
            console.error(`Cloudinary upload failed for ${key}:`, uploadError);
            continue;
          }
        } else {
          console.log(`Skipping empty or invalid file for ${key}`);
        }
      }
    }
    data.siteImages = siteImages.length > 0 ? siteImages : undefined;
    console.log("Final siteImages:", data.siteImages);

    const parsed = createQuotationSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.errors);
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }
    console.log("Validated data:", parsed.data);

    await dbConnect();

    const quotationNumber = await generateQuotationNumber();
    console.log("Generated quotation number:", quotationNumber);

    const quotationData: Partial<IQuotation> = {
      quotationNumber,
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      clientNumber: parsed.data.clientNumber,
      date: parsed.data.date,
      items: parsed.data.items,
      subtotal: parsed.data.subtotal,
      discount: parsed.data.discount,
      grandTotal: parsed.data.grandTotal,
      terms: parsed.data.terms || [],
      note: parsed.data.note,
      createdBy: session.user.id,
      isAccepted: "pending",
      siteImages: parsed.data.siteImages || [],
    };

    const quotation = await Quotation.create(quotationData);
    console.log("Created quotation:", quotation);

    await AuditLog.create({
      action: "create_quotation",
      userId: session.user.id,
      details: {
        quotationNumber,
        clientName: parsed.data.clientName,
        siteImagesCount: parsed.data.siteImages?.length || 0,
      },
    });
    console.log("Audit log created");

    // Prepare template variables for quotation_created template
    const templateVariables = {
      "1": quotation.clientName, // Dear {{1}}
      "2": quotationNumber, // Quotation #{{2}}
      "3": (quotation.grandTotal?.toFixed(2) || "0.00"), // Grand Total: ₹{{3}}
      "4": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/quotations/${quotationNumber}`, // View details: {{4}}
    };

    // Fallback freeform message (for session window)
    const whatsappMessage = `Dear ${quotation.clientName}, your Quotation #${quotationNumber} has been created. Grand Total: ₹${quotation.grandTotal?.toFixed(2) || "0.00"}. View details: ${process.env.NEXT_PUBLIC_FRONTEND_URL}/quotations/${quotationNumber}`;

    try {
      await sendNotification({
        to: quotation.clientNumber,
        message: whatsappMessage,
        action: "quotation_created",
        templateVariables,
      });
      console.log("Notification sent successfully");
    } catch (error) {
      console.error("Failed to send notification:", error);
      return NextResponse.json(
        {
          quotation,
          warning: "Quotation created, but failed to send notification",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST handler:", error);
    return handleError(error, "Failed to create quotation");
  }
}


export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    await dbConnect();
    const quotations = await Quotation.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Quotation.countDocuments({});

    return NextResponse.json({
      quotations,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch quotations");
  }
}


export async function DELETE(request: Request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      console.log("Unauthorized access attempt", { user: session?.user });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { quotationNumbers } = await request.json();
    if (!Array.isArray(quotationNumbers) || quotationNumbers.length === 0) {
      return NextResponse.json({ error: "Invalid or empty quotationNumbers array" }, { status: 400 });
    }

    // Sanitize and validate quotationNumbers
    const sanitizedQuotationNumbers = quotationNumbers
      .map((num: unknown) => (typeof num === "string" ? num.trim() : null))
      .filter((num: string | null) => num !== null);
    if (sanitizedQuotationNumbers.length === 0) {
      return NextResponse.json({ error: "No valid quotation numbers provided" }, { status: 400 });
    }

    const filter = {
      quotationNumber: { $in: sanitizedQuotationNumbers },
    };

    const result = await Quotation.deleteMany(filter);
    console.log(`Deleted ${result.deletedCount} quotations`);

    await AuditLog.create({
      action: "bulk_delete_quotations",
      userId: session.user.id, // Use authenticated user's ID
      details: {
        deletedCount: result.deletedCount,
        quotationNumbers: sanitizedQuotationNumbers,
      },
    });
    console.log("Audit log created for bulk deletion");

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} quotations`,
      deletedCount: result.deletedCount,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in DELETE handler:", error);
    return handleError(error, "Failed to delete quotations");
  }
}