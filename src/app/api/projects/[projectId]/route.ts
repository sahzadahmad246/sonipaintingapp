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

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

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
  amountDue?: number;
  terms?: string[];
  note?: string;
  siteImages?: { url: string; publicId: string }[];
  existingImages?: { url: string; publicId: string }[];
  newPayment?: { amount: number; date?: string; note?: string };
  lastUpdated?: Date;
  status?: "ongoing" | "completed";
  updateHistory?: {
    updatedAt: Date;
    updatedBy: string;
    changes: string[];
  }[];
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
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User ID:", authSession.user.id);

    const { projectId } = await context.params;
    const formData = await request.formData();

    console.log("FormData received:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    const sanitizeToString = (value: FormDataEntryValue | null): string | undefined => {
      if (value == null || value instanceof File) return undefined;
      const sanitized = sanitizeInput(value);
      return typeof sanitized === 'string' ? sanitized : undefined;
    };

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

    try {
      data.items = formData.get("items")
        ? JSON.parse(sanitizeToString(formData.get("items")) ?? "[]")
        : undefined;
      data.extraWork = formData.get("extraWork")
        ? JSON.parse(sanitizeToString(formData.get("extraWork")) ?? "[]")
        : undefined;
      data.existingImages = formData.get("existingImages")
        ? JSON.parse(sanitizeToString(formData.get("existingImages")) ?? "[]")
        : undefined;
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

    const siteImages: { url: string; publicId: string }[] = data.existingImages || [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("siteImages[") && !key.includes(".description")) {
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

    console.log("Parsed data:", JSON.stringify(data, null, 2));

    const parsed = updateProjectSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.errors);
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }



    const existingProject = await Project.findOne({ projectId }).session(session);
    if (!existingProject) {
      console.log(`Project not found for projectId: ${projectId}`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: UpdateProjectData = {};

    let transformedItems: IProject["items"] | undefined;
    if (parsed.data.items) {
      transformedItems = parsed.data.items.map(item => ({
        description: item.description,
        area: item.area ?? undefined,
        rate: item.rate,
        total: item.total ?? undefined,
        note: item.note,
      }));
    }

    if (parsed.data) {
      if (
        parsed.data.quotationNumber !== undefined &&
        parsed.data.quotationNumber !== existingProject.quotationNumber
      ) {
        updateData.quotationNumber = parsed.data.quotationNumber;
      }
      if (
        parsed.data.clientName !== undefined &&
        parsed.data.clientName !== existingProject.clientName
      ) {
        updateData.clientName = parsed.data.clientName;
      }
      if (
        parsed.data.clientAddress !== undefined &&
        parsed.data.clientAddress !== existingProject.clientAddress
      ) {
        updateData.clientAddress = parsed.data.clientAddress;
      }
      if (
        parsed.data.clientNumber !== undefined &&
        parsed.data.clientNumber !== existingProject.clientNumber
      ) {
        updateData.clientNumber = parsed.data.clientNumber;
      }
      if (
        parsed.data.date !== undefined &&
        parsed.data.date !== existingProject.date.toISOString()
      ) {
        updateData.date = new Date(parsed.data.date);
      }
      if (transformedItems !== undefined) {
        const oldItems: IProject["items"] = existingProject.items || [];
        const newItems: IProject["items"] = transformedItems || [];
        const addedItems = newItems.filter(
          (newItem) => !oldItems.some(
            (existingItem) =>
              existingItem.description === newItem.description &&
              (existingItem.area ?? undefined) === (newItem.area ?? undefined) &&
              existingItem.rate === newItem.rate &&
              (existingItem.total ?? undefined) === (newItem.total ?? undefined) &&
              (existingItem.note ?? '') === (newItem.note ?? '')
          )
        );
        const removedItems = oldItems.filter(
          (existingItem) => !newItems.some(
            (newItem) =>
              newItem.description === existingItem.description &&
              (newItem.area ?? undefined) === (existingItem.area ?? undefined) &&
              newItem.rate === existingItem.rate &&
              (existingItem.total ?? undefined) === (newItem.total ?? undefined) &&
              (existingItem.note ?? '') === (newItem.note ?? '')
          )
        );
        if (addedItems.length > 0 || removedItems.length > 0) {
          updateData.items = transformedItems;
        }
      }
      if (parsed.data.extraWork !== undefined) {
        const oldExtraWork: IProject["extraWork"] = existingProject.extraWork || [];
        const newExtraWork: IProject["extraWork"] = parsed.data.extraWork || [];
        const addedExtraWork = newExtraWork.filter(
          (newItem) => !oldExtraWork.some(
            (existingItem) =>
              existingItem.description === newItem.description &&
              existingItem.total === newItem.total &&
              (existingItem.note ?? '') === (newItem.note ?? '')
          )
        );
        const removedExtraWork = oldExtraWork.filter(
          (existingItem) => !newExtraWork.some(
            (newItem) =>
              newItem.description === existingItem.description &&
              newItem.total === newItem.total &&
              (newItem.note ?? '') === (existingItem.note ?? '')
          )
        );
        if (addedExtraWork.length > 0 || removedExtraWork.length > 0) {
          updateData.extraWork = newExtraWork;
        }
      }
      if (
        parsed.data.subtotal !== undefined &&
        parsed.data.subtotal !== existingProject.subtotal
      ) {
        updateData.subtotal = parsed.data.subtotal;
      }
      if (
        parsed.data.discount !== undefined &&
        parsed.data.discount !== existingProject.discount
      ) {
        updateData.discount = parsed.data.discount;
      }
      if (
        parsed.data.grandTotal !== undefined &&
        parsed.data.grandTotal !== existingProject.grandTotal
      ) {
        updateData.grandTotal = parsed.data.grandTotal;
      }
      if (parsed.data.terms !== undefined) {
        const oldTerms: string[] = existingProject.terms || [];
        const newTerms: string[] = parsed.data.terms || [];
        const addedTerms = newTerms.filter((term) => !oldTerms.includes(term));
        const removedTerms = oldTerms.filter((term) => !newTerms.includes(term));
        if (addedTerms.length > 0 || removedTerms.length > 0) {
          updateData.terms = newTerms;
        }
      }
      if (
        parsed.data.note !== undefined &&
        parsed.data.note !== existingProject.note
      ) {
        updateData.note = parsed.data.note;
      }
      if (parsed.data.siteImages !== undefined) {
        const oldImages: { url: string; publicId: string }[] = existingProject.siteImages || [];
        const newImages: { url: string; publicId: string }[] = parsed.data.siteImages || [];
        const addedImages = newImages.filter(
          (newImage) => !oldImages.some(
            (existingImage) => existingImage.publicId === newImage.publicId
          )
        );
        const removedImages = oldImages.filter(
          (existingImage) => !newImages.some(
            (newImage) => newImage.publicId === existingImage.publicId
          )
        );
        if (addedImages.length > 0 || removedImages.length > 0) {
          updateData.siteImages = newImages;
          removedImages.forEach((image) => {
            cloudinary.uploader.destroy(image.publicId).catch((err) => {
              console.error(`Failed to delete image ${image.publicId} from Cloudinary:`, err);
            });
          });
        }
      }
      if (parsed.data.newPayment) {
        updateData.$push = {
          paymentHistory: {
            ...parsed.data.newPayment,
            date: new Date(parsed.data.newPayment.date || Date.now()),
          },
        };
      }
    }
    updateData.lastUpdated = new Date();

    const currentTotalPayments = existingProject.paymentHistory?.reduce(
      (sum: number, payment: { amount: number }) => sum + payment.amount,
      0
    ) || 0;
    const newPaymentAmount = parsed.data.newPayment?.amount || 0;
    const totalPayments = currentTotalPayments + newPaymentAmount;
    const grandTotal = parsed.data.grandTotal || existingProject.grandTotal || 0;
    updateData.amountDue = grandTotal - totalPayments;

    updateData.status = updateData.amountDue === 0 ? "completed" : "ongoing";

    if (totalPayments > grandTotal) {
      return NextResponse.json({ error: "Total payments exceed grand total" }, { status: 400 });
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
      const invoiceUpdate = {
        clientName: project.clientName,
        clientAddress: project.clientAddress,
        clientNumber: project.clientNumber,
        date: project.date,
        items: project.items || [],
        extraWork: project.extraWork || [],
        subtotal: project.subtotal || 0,
        discount: project.discount || 0,
        grandTotal: project.grandTotal || 0,
        paymentHistory: project.paymentHistory || [],
        amountDue: project.amountDue || 0,
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
          action: parsed.data.newPayment ? "add_project_payment" : "update_project",
          userId: authSession.user.id,
          details: { projectId },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Send notifications
    if (parsed.data.newPayment && parsed.data.newPayment.amount > 0) {
      const invoiceUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/invoice/${invoice?.invoiceId || projectId}?token=${invoice?.accessToken || ""}`;
      const templateVariables: Record<string, string> = {
        "1": project.clientName, // Dear {{1}}
        "2": parsed.data.newPayment.amount.toFixed(2), // Payment amount {{2}}
        "3": project.quotationNumber || projectId, // Quotation #{{3}}
        "4": (project.amountDue || 0).toFixed(2), // Amount Due {{4}}
        "5": invoiceUrl, // View invoice {{5}}
      };
      const whatsappMessage = `Dear ${project.clientName}, we have received a payment of ₹${parsed.data.newPayment.amount.toFixed(2)} towards Quotation #${project.quotationNumber || projectId}. Amount Due: ₹${(project.amountDue || 0).toFixed(2)}. View invoice: ${invoiceUrl}`;

      try {
        await sendNotification({
          to: project.clientNumber,
          message: whatsappMessage,
          action: "payment_received",
          templateVariables,
        });
        console.log(`WhatsApp notification sent for payment on project ${projectId}`);
      } catch (whatsappError: unknown) {
        console.error(`WhatsApp Error for project ${projectId}:`, whatsappError);
        return NextResponse.json({
          project,
          warning: "Project updated, but failed to send payment notification",
        });
      }
    } else if (Object.keys(updateData).length > 0) {
      const projectUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/projects/${projectId}`;
      const templateVariables: Record<string, string> = {
        "1": project.clientName, // Dear {{1}}
        "2": projectId, // Project #{{2}}
        "3": (project.grandTotal?.toFixed(2) || "0.00"), // Grand Total {{3}}
        "4": projectUrl, // View details {{4}}
      };
      const whatsappMessage = `Dear ${project.clientName}, your Project #${projectId} has been updated. Grand Total: ₹${project.grandTotal?.toFixed(2) || "0.00"}. View details: ${projectUrl}`;

      try {
        await sendNotification({
          to: project.clientNumber,
          message: whatsappMessage,
          action: "project_updated",
          templateVariables,
        });
        console.log(`WhatsApp notification sent for project update ${projectId}`);
      } catch (whatsappError: unknown) {
        console.error(`WhatsApp Error for project ${projectId}:`, whatsappError);
        return NextResponse.json({
          project,
          warning: "Project updated, but failed to send update notification",
        });
      }
    }

    return NextResponse.json(project);
  } catch (error: unknown) {
    await session.abortTransaction();
    return handleError(error, "Failed to update project");
  } finally {
    session.endSession();
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
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