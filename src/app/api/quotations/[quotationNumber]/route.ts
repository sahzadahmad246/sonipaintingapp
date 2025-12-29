import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Quotation, { IQuotation } from "@/models/Quotation";
import Project, { IProject } from "@/models/Project";
import Invoice, { IInvoice } from "@/models/Invoice";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { generateProjectId } from "@/lib/generateProjectId";
import { generateInvoiceId } from "@/lib/generateInvoiceId";
import { handleError } from "@/lib/errorHandler";
import { sanitizeInput } from "@/lib/security";
import { updateQuotationSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary";
import { randomBytes } from "crypto";
import { NotificationAction } from "@/lib/notifications";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

interface UpdateQuotationData extends Partial<IQuotation> {
  existingImages?: { url: string; publicId: string; description?: string }[];
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { quotationNumber } = await context.params;
    const formData = await request.formData();

    const sanitizeToString = (
      value: FormDataEntryValue | null
    ): string | undefined => {
      if (value == null || value instanceof File) return undefined;
      const sanitized = sanitizeInput(value);
      return typeof sanitized === "string" ? sanitized : undefined;
    };

    // Extract isAccepted to check if this is a status-only update
    const isAcceptedValue = sanitizeToString(formData.get("isAccepted")) as
      | "pending"
      | "accepted"
      | "rejected"
      | undefined;

    const isStatusOnlyUpdate =
      isAcceptedValue !== undefined &&
      Array.from(formData.keys()).filter((key) => key !== "isAccepted")
        .length === 0;

    // If it's not a status-only update, perform authentication check
    let userId: string;
    if (!isStatusOnlyUpdate) {
      const authSession = await getServerSession(authOptions);
      if (!authSession || authSession.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!authSession.user.id) {
        return NextResponse.json(
          { error: "User ID not found in session" },
          { status: 401 }
        );
      }
      userId = authSession.user.id;
    } else {
      // For status-only updates, we'll get the owner ID from the quotation later
      userId = "temporary-placeholder"; // Will be replaced with actual creator ID
    }

    const data: UpdateQuotationData = {
      clientName: sanitizeToString(formData.get("clientName")),
      clientAddress: sanitizeToString(formData.get("clientAddress")),
      clientNumber: sanitizeToString(formData.get("clientNumber")),
      clientMobile: {
        countryCode: sanitizeToString(formData.get("clientMobile[countryCode]")) || "+91",
        number: sanitizeToString(formData.get("clientMobile[number]")) || "",
      },
      date: sanitizeToString(formData.get("date"))
        ? new Date(sanitizeToString(formData.get("date"))!)
        : undefined,
      discount: formData.get("formData")
        ? Number(formData.get("discount")) || 0
        : undefined,
      note: sanitizeToString(formData.get("note")),
      subtotal: formData.get("subtotal")
        ? Number(formData.get("subtotal")) || 0
        : undefined,
      grandTotal: formData.get("grandTotal")
        ? Number(formData.get("grandTotal")) || 0
        : undefined,
      isAccepted: isAcceptedValue,
    };

    try {
      data.items = formData.get("items")
        ? JSON.parse(sanitizeToString(formData.get("items")) ?? "[]")
        : undefined;
      data.existingImages = formData.get("existingImages")
        ? JSON.parse(sanitizeToString(formData.get("existingImages")) ?? "[]")
        : [];
    } catch {
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

    const siteImages: {
      url: string;
      publicId: string;
      description?: string;
    }[] = data.existingImages || [];

    // Only process image uploads for admin users
    if (!isStatusOnlyUpdate) {
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("siteImages[") && !key.includes(".description")) {
          const file = value as File;
          if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            try {
              const result = await new Promise<CloudinaryUploadResult>(
                (resolve, reject) => {
                  const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "quotations" },
                    (error, result) => {
                      if (error) reject(error);
                      else resolve(result as CloudinaryUploadResult);
                    }
                  );
                  uploadStream.end(buffer);
                }
              );

              const descriptionKey = `${key}.description`;
              const description = sanitizeToString(
                formData.get(descriptionKey)
              );

              siteImages.push({
                url: result.secure_url,
                publicId: result.public_id,
                description,
              });
            } catch (uploadError: unknown) {
              throw new Error(
                `Failed to upload image: ${(uploadError as Error).message}`
              );
            }
          }
        }
      }
    }
    data.siteImages = siteImages.length > 0 ? siteImages : undefined;

    const parsed = updateQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    await dbConnect();

    // Find the quotation using only quotationNumber
    const existingQuotation = await Quotation.findOne({
      quotationNumber,
    }).session(session);
    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // For status-only updates, set userId to the creator's ID
    if (isStatusOnlyUpdate) {
      // Ensure userId is always a string, not undefined
      userId = existingQuotation.createdBy;
    }

    // Safeguard against undefined userId
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const updateData: Partial<IQuotation> = {};

    if (parsed.data) {
      // Only process non-status fields if this is not a status-only update
      if (!isStatusOnlyUpdate) {
        if (
          parsed.data.clientName !== undefined &&
          parsed.data.clientName !== existingQuotation.clientName
        ) {
          updateData.clientName = parsed.data.clientName;
        }
        if (
          parsed.data.clientAddress !== undefined &&
          parsed.data.clientAddress !== existingQuotation.clientAddress
        ) {
          updateData.clientAddress = parsed.data.clientAddress;
        }
        if (
          parsed.data.clientNumber !== undefined &&
          parsed.data.clientNumber !== existingQuotation.clientNumber
        ) {
          updateData.clientNumber = parsed.data.clientNumber;
        }
        if (
          parsed.data.clientMobile !== undefined
        ) {
          updateData.clientMobile = parsed.data.clientMobile;
        }
        if (
          parsed.data.date !== undefined &&
          new Date(parsed.data.date).toISOString() !==
          new Date(existingQuotation.date).toISOString()
        ) {
          updateData.date = new Date(parsed.data.date);
        }
        if (parsed.data.items !== undefined) {
          const oldItems: IQuotation["items"] = existingQuotation.items || [];
          const newItems: IQuotation["items"] = parsed.data.items || [];
          const addedItems = newItems.filter(
            (newItem) =>
              !oldItems.some(
                (oldItem) =>
                  oldItem.description === newItem.description &&
                  (oldItem.area ?? null) === (newItem.area ?? null) &&
                  oldItem.rate === newItem.rate &&
                  (oldItem.total ?? null) === (newItem.total ?? null) &&
                  (oldItem.note ?? "") === (newItem.note ?? "")
              )
          );
          const removedItems = oldItems.filter(
            (oldItem) =>
              !newItems.some(
                (newItem) =>
                  newItem.description === oldItem.description &&
                  (newItem.area ?? null) === (oldItem.area ?? null) &&
                  newItem.rate === oldItem.rate &&
                  (newItem.total ?? null) === (newItem.total ?? null) &&
                  (newItem.note ?? "") === (newItem.note ?? "")
              )
          );
          if (addedItems.length > 0 || removedItems.length > 0) {
            updateData.items = newItems;
          }
        }
        if (
          parsed.data.subtotal !== undefined &&
          parsed.data.subtotal !== existingQuotation.subtotal
        ) {
          updateData.subtotal = parsed.data.subtotal;
        }
        if (
          parsed.data.discount !== undefined &&
          parsed.data.discount !== existingQuotation.discount
        ) {
          updateData.discount = parsed.data.discount;
        }
        if (
          parsed.data.grandTotal !== undefined &&
          parsed.data.grandTotal !== existingQuotation.grandTotal
        ) {
          updateData.grandTotal = parsed.data.grandTotal;
        }
        if (parsed.data.terms !== undefined) {
          const oldTerms: string[] = existingQuotation.terms || [];
          const newTerms: string[] = parsed.data.terms || [];
          const addedTerms = newTerms.filter(
            (term) => !oldTerms.includes(term)
          );
          const removedTerms = oldTerms.filter(
            (term) => !newTerms.includes(term)
          );
          if (addedTerms.length > 0 || removedTerms.length > 0) {
            updateData.terms = newTerms;
          }
        }
        if (
          parsed.data.note !== undefined &&
          parsed.data.note !== existingQuotation.note
        ) {
          updateData.note = parsed.data.note;
        }
        if (parsed.data.siteImages !== undefined) {
          const oldImages: {
            url: string;
            publicId: string;
            description?: string;
          }[] = existingQuotation.siteImages || [];
          const newImages: {
            url: string;
            publicId: string;
            description?: string;
          }[] = parsed.data.siteImages || [];
          const addedImages = newImages.filter(
            (newImg) =>
              !oldImages.some((oldImg) => oldImg.publicId === newImg.publicId)
          );
          const removedImages = oldImages.filter(
            (oldImg) =>
              !newImages.some((newImg) => newImg.publicId === oldImg.publicId)
          );
          if (addedImages.length > 0 || removedImages.length > 0) {
            updateData.siteImages = newImages;
            removedImages.forEach((img) => {
              cloudinary.uploader.destroy(img.publicId).catch((err) => {
                console.error(
                  `Failed to delete image ${img.publicId} from Cloudinary:`,
                  err
                );
              });
            });
          }
        }
      }

      // Process status update for both admin and client
      if (
        parsed.data.isAccepted !== undefined &&
        parsed.data.isAccepted !== existingQuotation.isAccepted
      ) {
        updateData.isAccepted = parsed.data.isAccepted;
      } else if (
        !isStatusOnlyUpdate && // Only reset pending status for admin updates
        existingQuotation.isAccepted !== "pending" &&
        Object.keys(updateData).length > 0
      ) {
        updateData.isAccepted = "pending";
      }
    }
    updateData.lastUpdated = new Date();

    const updatedQuotation = await Quotation.findOneAndUpdate(
      { quotationNumber },
      { $set: updateData },
      { new: true, session }
    );

    if (!updatedQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    if (parsed.data?.isAccepted === "accepted") {
      const existingProject = await Project.findOne({
        quotationNumber,
      }).session(session);
      if (existingProject) {
        const projectUpdate: Partial<IProject> = {
          clientName: updatedQuotation.clientName,
          clientAddress: updatedQuotation.clientAddress,
          clientNumber: updatedQuotation.clientNumber,
          date: updatedQuotation.date,
          items: updatedQuotation.items,
          subtotal: updatedQuotation.subtotal,
          discount: updatedQuotation.discount,
          grandTotal: updatedQuotation.grandTotal,
          amountDue: updatedQuotation.grandTotal || 0,
          terms: updatedQuotation.terms,
          note: updatedQuotation.note,
          lastUpdated: new Date(),
          status: "ongoing",
        };
        const updatedProject = await Project.findOneAndUpdate(
          { quotationNumber },
          { $set: projectUpdate },
          { new: true, session }
        );
        if (!updatedProject) {
          throw new Error(
            `Failed to update project for quotation ${quotationNumber}`
          );
        }
        console.log(`Project updated for quotation ${quotationNumber}`);

        const invoice = await Invoice.findOne({
          quotationNumber,
          projectId: existingProject.projectId,
        }).session(session);
        if (invoice) {
          const totalPayments =
            existingProject.paymentHistory?.reduce(
              (sum: number, payment: { amount: number }) =>
                sum + payment.amount,
              0
            ) || 0;
          const invoiceUpdate: Partial<IInvoice> = {
            clientName: updatedQuotation.clientName,
            clientAddress: updatedQuotation.clientAddress,
            clientNumber: updatedQuotation.clientNumber,
            date: updatedQuotation.date,
            items: updatedQuotation.items,
            subtotal: updatedQuotation.subtotal || 0,
            discount: updatedQuotation.discount || 0,
            grandTotal: updatedQuotation.grandTotal || 0,
            amountDue: (updatedQuotation.grandTotal || 0) - totalPayments,
            lastUpdated: new Date(),
            terms: updatedQuotation.terms,
            note: updatedQuotation.note,
          };
          const updatedInvoice = await Invoice.findOneAndUpdate(
            { quotationNumber, projectId: existingProject.projectId },
            { $set: invoiceUpdate },
            { new: true, session }
          );
          if (!updatedInvoice) {
            throw new Error(
              `Failed to update invoice for quotation ${quotationNumber}`
            );
          }
          console.log(`Invoice updated for quotation ${quotationNumber}`);
        }
      } else {
        const projectId = await generateProjectId();
        const projectData: Partial<IProject> = {
          projectId,
          quotationNumber,
          clientName: updatedQuotation.clientName,
          clientAddress: updatedQuotation.clientAddress,
          clientNumber: updatedQuotation.clientNumber,
          date: updatedQuotation.date,
          items: updatedQuotation.items,
          extraWork: [],
          subtotal: updatedQuotation.subtotal,
          discount: updatedQuotation.discount,
          grandTotal: updatedQuotation.grandTotal,
          amountDue: updatedQuotation.grandTotal || 0,
          paymentHistory: [],
          siteImages: [],
          terms: updatedQuotation.terms,
          note: updatedQuotation.note,
          createdAt: new Date(),
          createdBy: userId,
          status: "ongoing",
        };
        const newProject = await Project.create([projectData], { session });
        if (!newProject || newProject.length === 0) {
          throw new Error(
            `Failed to create project for quotation ${quotationNumber}`
          );
        }
        console.log(
          `Project ${projectId} created for quotation ${quotationNumber}`
        );

        const invoiceId = await generateInvoiceId();
        const invoiceData: Partial<IInvoice> = {
          invoiceId,
          projectId,
          quotationNumber,
          clientName: updatedQuotation.clientName,
          clientAddress: updatedQuotation.clientAddress,
          clientNumber: updatedQuotation.clientNumber,
          date: updatedQuotation.date,
          items: updatedQuotation.items,
          extraWork: [],
          subtotal: updatedQuotation.subtotal || 0,
          discount: updatedQuotation.discount || 0,
          grandTotal: updatedQuotation.grandTotal || 0,
          amountDue: updatedQuotation.grandTotal || 0,
          paymentHistory: [],
          accessToken: randomBytes(16).toString("hex"),
          createdAt: new Date(),
          terms: updatedQuotation.terms,
          note: updatedQuotation.note,
        };
        const newInvoice = await Invoice.create([invoiceData], { session });
        if (!newInvoice || newInvoice.length === 0) {
          throw new Error(
            `Failed to create invoice for quotation ${quotationNumber}`
          );
        }
        console.log(
          `Invoice ${invoiceId} created for quotation ${quotationNumber}`
        );
      }
    }

    // Add to audit log
    await AuditLog.create(
      [
        {
          action:
            parsed.data.isAccepted !== undefined &&
              parsed.data.isAccepted !== existingQuotation.isAccepted
              ? "update_quotation_status"
              : "update_quotation",
          userId: userId,
          details: { quotationNumber },
          createdAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const quotationUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/quotations/${quotationNumber}`;
    let whatsappMessage: string;
    let templateVariables: Record<string, string>;
    let action: NotificationAction;

    if (
      parsed.data.isAccepted !== undefined &&
      parsed.data.isAccepted !== existingQuotation.isAccepted
    ) {
      action =
        updatedQuotation.isAccepted === "accepted"
          ? "quotation_accepted"
          : "quotation_rejected";
      templateVariables = {
        "1": updatedQuotation.clientName, // Dear {{1}}
        "2": quotationNumber, // Quotation #{{2}}
        "3": quotationUrl, // View details: {{3}}
      };
      whatsappMessage = `Dear ${updatedQuotation.clientName}, you have ${updatedQuotation.isAccepted === "accepted" ? "accepted" : "rejected"
        } Quotation #${quotationNumber}. Thank you! View details: ${quotationUrl}`;
    } else {
      action = "quotation_updated";
      templateVariables = {
        "1": updatedQuotation.clientName, // Dear {{1}}
        "2": quotationNumber, // Quotation #{{2}}
        "3": updatedQuotation.grandTotal?.toFixed(2) || "0.00", // Grand Total: ₹{{3}}
        "4": quotationUrl, // View details: {{4}}
      };
      whatsappMessage = `Dear ${updatedQuotation.clientName
        }, your Quotation #${quotationNumber} has been updated. Grand Total: ₹${updatedQuotation.grandTotal?.toFixed(2) || "0.00"
        }. You can now accept or reject it. View details: ${quotationUrl}`;
    }

    try {
      await sendNotification({
        to: updatedQuotation.clientNumber,
        message: whatsappMessage,
        action,
        templateVariables,
      });
      console.log(
        `WhatsApp notification sent for quotation ${quotationNumber} (action: ${action})`
      );
    } catch (error: unknown) {
      console.error(
        `Failed to send WhatsApp notification for quotation ${quotationNumber}:`,
        error
      );
      return NextResponse.json({
        quotation: updatedQuotation,
        warning: "Quotation updated, but failed to send notification",
      });
    }

    return NextResponse.json(updatedQuotation);
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("PUT /api/quotations/[quotationNumber] error:", error);
    return handleError(error, "Failed to update quotation");
  } finally {
    session.endSession();
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  try {
    const { quotationNumber } = await context.params;
    await dbConnect();

    const quotation = await Quotation.findOne({
      quotationNumber,
    });
    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(quotation);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch quotation");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ quotationNumber: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!authSession.user.id) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      );
    }

    const { quotationNumber } = await context.params;
    await dbConnect();
    const quotation = await Quotation.findOneAndDelete(
      { quotationNumber },
      { session }
    );

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Delete siteImages from Cloudinary
    if (quotation.siteImages && quotation.siteImages.length > 0) {
      for (const image of quotation.siteImages) {
        await cloudinary.uploader.destroy(image.publicId).catch((err) => {
          console.error(
            `Failed to delete image ${image.publicId} from Cloudinary:`,
            err
          );
        });
      }
    }

    const project = await Project.findOneAndDelete(
      { quotationNumber },
      { session }
    );
    if (project) {
      for (const image of project.siteImages) {
        await cloudinary.uploader.destroy(image.publicId);
      }
      await Invoice.findOneAndDelete(
        { projectId: project.projectId, quotationNumber },
        { session }
      );
    }

    await AuditLog.create(
      [
        {
          action: "delete_quotation",
          userId: authSession.user.id,
          details: { quotationNumber },
          createdAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return NextResponse.json({
      message: "Quotation, project, and invoice deleted",
    });
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("DELETE /api/quotations/[quotationNumber] error:", error);
    return handleError(error, "Failed to delete quotation");
  } finally {
    session.endSession();
  }
}
