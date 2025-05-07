import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Project, { IProject } from "@/models/Project";
import Invoice from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateProjectSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import mongoose from "mongoose";

// Define Cloudinary upload result type
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

// Define type for update data based on IProject and updateProjectSchema
interface UpdateProjectData {
  projectId?: string;
  quotationNumber?: string;
  clientName?: string;
  clientAddress?: string;
  clientNumber?: string;
  date?: string | Date;
  items?: IProject["items"];
  extraWork?: IProject["extraWork"];
  subtotal?: number;
  discount?: number;
  grandTotal?: number;
  terms?: string[];
  note?: string;
  siteImages?: { url: string; publicId: string }[];
  existingImages?: { url: string; publicId: string }[];
  newPayment?: { amount: number; date?: string; note?: string };
  lastUpdated?: Date;
  $push?: { paymentHistory: { amount: number; date: Date; note?: string } };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  console.log("GET /api/projects/[projectId] called:", request.url);
  try {
    const { projectId } = await context.params;
    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("GET /api/projects/[projectId] error:", error);
    return handleError(error, "Failed to fetch project");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  console.log("PUT /api/projects/[projectId] called:", request.url);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;
    const formData = await request.formData();

    // Log FormData contents
    console.log("FormData received:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    // Helper function to sanitize and convert to string | undefined
    const sanitizeToString = (value: FormDataEntryValue | null): string | undefined => {
      if (value == null || value instanceof File) return undefined;
      const sanitized = sanitizeInput(value);
      // Convert sanitized value to string, return undefined for non-string types
      return typeof sanitized === 'string' ? sanitized : undefined;
    };

    // Extract and sanitize scalar fields
    const data: UpdateProjectData = {
      projectId: sanitizeToString(formData.get("projectId")),
      quotationNumber: sanitizeToString(formData.get("quotationNumber")),
      clientName: sanitizeToString(formData.get("clientName")),
      clientAddress: sanitizeToString(formData.get("clientAddress")),
      clientNumber: sanitizeToString(formData.get("clientNumber")),
      date: sanitizeToString(formData.get("date")),
      discount: formData.get("discount") ? Number(formData.get("discount")) || 0 : undefined,
      note: sanitizeToString(formData.get("note")),
      subtotal: formData.get("subtotal") ? Number(formData.get("subtotal")) || 0 : undefined,
      grandTotal: formData.get("grandTotal") ? Number(formData.get("grandTotal")) || 0 : undefined,
    };

    // Parse JSON fields
    try {
      data.items = formData.get("items")
        ? JSON.parse(sanitizeToString(formData.get("items")) ?? "[]")
        : undefined;
      data.extraWork = formData.get("extraWork")
        ? JSON.parse(sanitizeToString(formData.get("extraWork")) ?? "[]")
        : undefined;
      data.existingImages = formData.get("existingImages")
        ? JSON.parse(sanitizeToString(formData.get("existingImages")) ?? "[]")
        : [];
      data.newPayment = formData.get("newPayment")
        ? JSON.parse(sanitizeToString(formData.get("newPayment")) ?? "{}")
        : undefined;
    } catch (error: unknown) {
      console.error("Error parsing JSON fields:", error);
      return NextResponse.json(
        { error: "Invalid JSON in items, extraWork, existingImages, or newPayment" },
        { status: 400 }
      );
    }

    // Extract terms
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

    // Handle file uploads
    const siteImages: { url: string; publicId: string }[] = data.existingImages || [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("siteImages[")) {
        const file = value as File;
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          try {
            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "projects" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result as CloudinaryUploadResult);
                }
              );
              uploadStream.end(buffer);
            });

            siteImages.push({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } catch (uploadError: unknown) {
            console.error("Cloudinary upload error:", uploadError);
            throw new Error(`Failed to upload image: ${(uploadError as Error).message}`);
          }
        }
      }
    }
    data.siteImages = siteImages.length > 0 ? siteImages : undefined;

    // Log parsed data before validation
    console.log("Parsed data:", JSON.stringify(data, null, 2));

    // Validate data
    const parsed = updateProjectSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.errors);
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();

    const updateData: UpdateProjectData = {};
    if (data.quotationNumber !== undefined) updateData.quotationNumber = data.quotationNumber;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
    if (data.clientNumber !== undefined) updateData.clientNumber = data.clientNumber;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : undefined;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.extraWork !== undefined) updateData.extraWork = data.extraWork;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.grandTotal !== undefined) updateData.grandTotal = data.grandTotal;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.siteImages !== undefined) updateData.siteImages = data.siteImages;
    if (data.newPayment !== undefined) {
      updateData.$push = {
        paymentHistory: { ...data.newPayment, date: new Date(data.newPayment.date || Date.now()) },
      };
    }

    updateData.lastUpdated = new Date();

    // Validate total payments don't exceed grandTotal
    if (data.newPayment) {
      const project = await Project.findOne({ projectId }).session(session);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const currentTotalPayments = project.paymentHistory?.reduce(
        (sum: number, payment: { amount: number }) => sum + payment.amount,
        0
      ) || 0;
      const newTotalPayments = currentTotalPayments + (data.newPayment.amount || 0);
      if (newTotalPayments > (data.grandTotal || project.grandTotal || 0)) {
        return NextResponse.json({ error: "Total payments exceed grand total" }, { status: 400 });
      }
    }

    const project = await Project.findOneAndUpdate(
      { projectId },
      updateData,
      { new: true, session }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const invoice = await Invoice.findOne({ projectId }).session(session);
    if (invoice) {
      const totalPayments = project.paymentHistory?.reduce(
        (sum: number, payment: { amount: number }) => sum + payment.amount,
        0
      ) || 0;
      const invoiceUpdate: Partial<IProject> & { amountDue?: number } = {
        clientName: project.clientName,
        clientAddress: project.clientAddress,
        clientNumber: project.clientNumber,
        date: project.date,
        items: project.items || [],
        extraWork: project.extraWork || [],
        subtotal: project.subtotal || 0,
        discount: project.discount || 0,
        grandTotal: project.grandTotal || 0,
        paymentHistory: project.paymentHistory,
        amountDue: (project.grandTotal || 0) - totalPayments,
        terms: project.terms || [],
        note: project.note,
        lastUpdated: new Date(),
      };
      await Invoice.findOneAndUpdate(
        { projectId },
        { $set: invoiceUpdate },
        { new: true, session }
      );
    }

    await AuditLog.create(
      [
        {
          action: "update_project",
          userId: authSession.user.id,
          details: { projectId, changes: Object.keys(updateData) },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    if (data.newPayment && data.newPayment.amount > 0) {
      const invoiceUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/invoice/${invoice?.invoiceId || projectId}?token=${invoice?.accessToken || ""}`;
      const totalPayments = project.paymentHistory.reduce(
        (sum: number, payment: { amount: number }) => sum + payment.amount,
        0
      );
      const whatsappMessage = `Dear ${project.clientName}, we have received a payment of ₹${data.newPayment.amount.toFixed(2)} towards Quotation #${project.quotationNumber}. Total Paid: ₹${totalPayments.toFixed(2)}. Amount Due: ₹${((project.grandTotal || 0) - totalPayments).toFixed(2)}. View invoice: ${invoiceUrl}`;

      try {
        await sendNotification({
          to: project.clientNumber,
          message: whatsappMessage,
          action: "payment_received",
        });
        console.log(`WhatsApp notification sent for payment on project ${projectId}`);
      } catch (whatsappError: unknown) {
        console.error(`WhatsApp Error for project ${projectId}:`, whatsappError);
      }
    }

    return NextResponse.json(project);
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("PUT /api/projects/[projectId] error:", error);
    return handleError(error, "Failed to update project");
  } finally {
    session.endSession();
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  console.log("DELETE /api/projects/[projectId] called:", request.url);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;
    await dbConnect();
    const project = await Project.findOne({ projectId }).session(session);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    for (const image of project.siteImages) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    await Project.findOneAndDelete({ projectId }, { session });
    await Invoice.findOneAndDelete({ projectId }, { session });

    await AuditLog.create(
      [
        {
          action: "delete_project",
          userId: authSession.user.id,
          details: { projectId },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return NextResponse.json({ message: "Project and invoice deleted" });
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("DELETE /api/projects/[projectId] error:", error);
    return handleError(error, "Failed to delete project");
  } finally {
    session.endSession();
  }
}