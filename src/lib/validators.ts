import { z } from "zod";

// Common validation schemas
const phoneNumberSchema = z
  .string()
  .regex(/^(\+\d{1,4})?[6-9]\d{9}$/, "Phone number must be a valid mobile number")
  .transform((val) => {
    // Remove all non-digits and ensure we have a valid number
    const digits = val.replace(/\D/g, "");
    // If it starts with country code, remove it to get the 10-digit number
    if (digits.length > 10) {
      return digits.slice(-10); // Take last 10 digits
    }
    return digits;
  });

const emailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .max(255, "Email must be less than 255 characters");

const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces");

const addressSchema = z
  .string()
  .min(10, "Address must be at least 10 characters")
  .max(500, "Address must be less than 500 characters");

const descriptionSchema = z
  .string()
  .min(1, "Description is required")
  .max(1000, "Description must be less than 1000 characters");

// Item schema for quotations/projects
const itemSchema = z.object({
  description: descriptionSchema,
  area: z.number().min(0, "Area must be non-negative").nullable().optional(),
  rate: z.number().min(0, "Rate must be non-negative"),
  total: z.number().min(0, "Total must be non-negative").nullable().optional(),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
});

// Extra work schema
const extraWorkSchema = z.object({
  description: descriptionSchema,
  total: z.number().min(0, "Total must be non-negative"),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
});

// Site image schema
const siteImageSchema = z.object({
  url: z.string().url("Invalid image URL"),
  publicId: z.string().min(1, "Public ID is required"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
});

// Payment history schema
const paymentHistorySchema = z.object({
  amount: z.number().positive("Payment amount must be positive"),
  date: z.date().or(z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format")),
  note: z.string().max(200, "Note must be less than 200 characters").optional(),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneNumberSchema.optional(),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

// Review schema
export const reviewSchema = z.object({
  name: nameSchema,
  phone: phoneNumberSchema,
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment must be less than 500 characters"),
  serviceType: z.enum(["painting", "carpentry", "false-ceiling", "pop", "tiles", "waterproofing", "wood-polish"], {
    errorMap: () => ({ message: "Invalid service type" })
  }),
});

// Quotation schemas
export const createQuotationSchema = z.object({
  clientName: nameSchema,
  clientAddress: addressSchema,
  clientNumber: phoneNumberSchema,
  date: z.date().or(z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format").transform((val) => new Date(val))),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
  terms: z.array(z.string().max(200, "Term must be less than 200 characters")).optional(),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
  siteImages: z.array(siteImageSchema).optional(),
});

export const updateQuotationSchema = createQuotationSchema
  .partial()
  .merge(z.object({
    isAccepted: z.enum(["pending", "accepted", "rejected"]).optional(),
    existingImages: z.array(siteImageSchema).optional(),
  }));

// Project schemas
export const createProjectSchema = createQuotationSchema.extend({
  quotationNumber: z.string().min(1, "Quotation number is required"),
  extraWork: z.array(extraWorkSchema).default([]),
  paymentHistory: z.array(paymentHistorySchema).default([]),
  amountDue: z.number().min(0).optional(),
  status: z.enum(["ongoing", "completed"]).default("ongoing"),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  newPayment: paymentHistorySchema.optional(),
});

// Invoice schemas
export const createInvoiceSchema = createProjectSchema.extend({
  projectId: z.string().min(1, "Project ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// Portfolio schema
export const portfolioSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
});

// General info schema
export const generalInfoSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(100, "Site name must be less than 100 characters"),
  address: addressSchema,
  mobileNumber1: phoneNumberSchema,
  mobileNumber2: phoneNumberSchema.optional(),
  logoUrl: z.string().url("Invalid logo URL").optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format").optional(),
  gstPercent: z.number().min(0).max(100, "GST percent must be between 0 and 100").optional(),
  termsAndConditions: z.array(z.string().max(500, "Term must be less than 500 characters")).optional(),
});

export const updateGeneralInfoSchema = generalInfoSchema.partial();

// Portfolio schemas
export const createPortfolioSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  imageUrl: z.string().url("Invalid image URL"),
  publicId: z.string().min(1, "Public ID is required"),
});

export const deletePortfolioSchema = z.object({
  publicId: z.string().min(1, "Public ID is required"),
});

// Review update schema for admin
export const updateReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  adminNotes: z.string().max(500).optional(),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).default(["image/jpeg", "image/png", "image/webp"]),
});

// Validation helper functions
export function validateFileUpload(file: File, options: { maxSize?: number; allowedTypes?: string[] } = {}) {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ["image/jpeg", "image/png", "image/webp"] } = options;
  
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type must be one of: ${allowedTypes.join(", ")}`);
  }
  
  return true;
}

// Sanitization helper
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

// Type exports
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
export type CreateQuotationData = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationData = z.infer<typeof updateQuotationSchema>;
export type CreateProjectData = z.infer<typeof createProjectSchema>;
export type UpdateProjectData = z.infer<typeof updateProjectSchema>;
export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceData = z.infer<typeof updateInvoiceSchema>;
export type PortfolioData = z.infer<typeof portfolioSchema>;
export type GeneralInfoData = z.infer<typeof generalInfoSchema>;