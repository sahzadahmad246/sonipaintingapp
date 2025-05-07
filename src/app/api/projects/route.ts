import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Project, { IProject } from "@/models/Project";
import AuditLog from "@/models/AuditLog";
import { authOptions } from "@/lib/auth";
import { generateProjectId } from "@/lib/generateProjectId";
import { handleError } from "@/lib/errorHandler";
import { createProjectSchema } from "@/lib/validators";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary (set these in your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define Cloudinary upload result type
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart/form-data
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    // Extract files from formData
    const siteImagesFiles = formData.getAll("siteImages") as File[];

    // Parse JSON fields if they were sent as strings
    const parsedData = {
      ...data,
      items: data.items ? JSON.parse(data.items as string) : [],
      extraWork: data.extraWork ? JSON.parse(data.extraWork as string) : [],
      paymentHistory: data.paymentHistory ? JSON.parse(data.paymentHistory as string) : [],
      siteImages: [], // Will populate this after uploading
    };

    // Validate the data
    const parsed = createProjectSchema.safeParse(parsedData);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Upload images to Cloudinary and get URLs and public IDs
    const siteImages: { url: string; publicId: string }[] = [];
    for (const file of siteImagesFiles) {
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = Readable.from(buffer);

        const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "projects" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!);
            }
          );
          stream.pipe(uploadStream);
        });

        siteImages.push({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      }
    }

    await dbConnect();

    const projectId = await generateProjectId();
    // Convert paymentHistory date strings to Date objects
    const paymentHistory = parsed.data.paymentHistory.map((payment) => ({
      amount: payment.amount,
      date: payment.date ? new Date(payment.date) : new Date(), // Fallback to current date if undefined
      note: payment.note,
    }));

    // Transform items to convert null to undefined for area and total
    const items = parsed.data.items.map(item => ({
      ...item,
      area: item.area === null ? undefined : item.area,
      total: item.total === null ? undefined : item.total,
    }));

    const projectData: Partial<IProject> = {
      projectId,
      quotationNumber: parsed.data.quotationNumber,
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      clientNumber: parsed.data.clientNumber,
      date: new Date(parsed.data.date),
      items, // Use transformed items
      extraWork: parsed.data.extraWork || [],
      subtotal: parsed.data.subtotal,
      discount: parsed.data.discount || 0,
      grandTotal: parsed.data.grandTotal,
      paymentHistory, // Use converted paymentHistory
      siteImages, // Use the uploaded images
      createdAt: new Date(),
    };

    const project = await Project.create(projectData);

    await AuditLog.create({
      action: "create_project",
      userId: session.user.id,
      details: { projectId, quotationNumber: parsed.data.quotationNumber },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    return handleError(error, "Failed to create project");
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
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Project.countDocuments();

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