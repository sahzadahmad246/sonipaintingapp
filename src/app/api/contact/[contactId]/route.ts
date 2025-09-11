import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleError } from "@/lib/errorHandler";
import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { z } from "zod";

// Update contact status schema
const updateContactSchema = z.object({
  status: z.enum(["new", "read", "replied", "archived"]).optional(),
  adminNotes: z.string().max(500).optional(),
});

// GET - Fetch single contact message
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await context.params;
    
    await dbConnect();
    
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact message not found" }, { status: 404 });
    }
    
    return NextResponse.json(contact);
  } catch (error: unknown) {
    return handleError(error, "Failed to fetch contact message");
  }
}

// PUT - Update contact message
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await context.params;
    const body = await request.json();
    
    // Validate input
    const validatedData = updateContactSchema.parse(body);
    
    await dbConnect();
    
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact message not found" }, { status: 404 });
    }
    
    // Update contact
    const updateData: Record<string, unknown> = { ...validatedData };
    
    // If status is being changed to "replied", set repliedAt and repliedBy
    if (validatedData.status === "replied" && contact.status !== "replied") {
      updateData.repliedAt = new Date();
      updateData.repliedBy = session.user.id;
    }
    
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json(updatedContact);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }
    return handleError(error, "Failed to update contact message");
  }
}

// DELETE - Delete contact message
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await context.params;
    
    await dbConnect();
    
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact message not found" }, { status: 404 });
    }
    
    await Contact.findByIdAndDelete(contactId);
    
    return NextResponse.json({ message: "Contact message deleted successfully" });
  } catch (error: unknown) {
    return handleError(error, "Failed to delete contact message");
  }
}
