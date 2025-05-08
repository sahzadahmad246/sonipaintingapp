import { z } from "zod";

// Common schemas
const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  area: z.number().min(0).nullable().optional(),
  rate: z.number().min(0, "Rate must be non-negative"),
  total: z.number().min(0).nullable().optional(),
  note: z.string().optional(),
});

const extraWorkSchema = z.object({
  description: z.string().min(1, "Description is required"),
  total: z.number().min(0, "Total must be non-negative"),
  note: z.string().optional(),
});

const siteImageSchema = z.object({
  url: z.string().url("Invalid URL"),
  publicId: z.string().min(1, "Public ID is required"),
  description: z.string().optional(),
});

const paymentHistorySchema = z
  .array(
    z.object({
      amount: z.number().positive("Payment amount must be positive"),
      date: z
        .string()
        .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date format")
        .optional(),
      note: z.string().optional(),
    })
  )
  .default([]);

// Schema for updateHistory (used in Quotation and Project)
const updateHistorySchema = z
  .array(
    z.object({
      updatedAt: z.date().or(z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format")),
      updatedBy: z.string().min(1, "Updated by is required"),
      changes: z.array(z.string()).min(1, "At least one change is required"),
    })
  )
  .optional();

// Base schema for quotations and projects
const baseQuotationSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().min(1, "Client address is required"),
  clientNumber: z
    .string()
    .regex(/^\d{10}$/, "Client number must be a 10-digit number"),
  date: z.date({ invalid_type_error: "Date must be a valid Date object" }).refine(
    (val) => val instanceof Date && !isNaN(val.getTime()),
    "Invalid date"
  ),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).default(0),
  grandTotal: z.number().min(0).optional(),
  terms: z.array(z.string()).optional(),
  note: z.string().optional(),
  siteImages: z.array(siteImageSchema).optional(),
  existingImages: z.array(siteImageSchema).optional(),
});

// Quotation schemas
export const createQuotationSchema = baseQuotationSchema;

export const updateQuotationSchema = baseQuotationSchema
  .partial()
  .merge(
    z.object({
      isAccepted: z.enum(["pending", "accepted", "rejected"]).optional(),
      updateHistory: updateHistorySchema,
      existingImages: z.array(siteImageSchema).optional(),
    })
  )
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );

// Project schemas
const baseProjectSchema = baseQuotationSchema.merge(
  z.object({
    quotationNumber: z.string().min(1, "Quotation number is required"),
    extraWork: z.array(extraWorkSchema).optional(),
    paymentHistory: paymentHistorySchema,
  })
);

export const createProjectSchema = baseProjectSchema;

export const updateProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  quotationNumber: z.string().min(1, "Quotation number is required").optional(),
  clientName: z.string().min(1, "Client name is required").optional(),
  clientAddress: z.string().min(1, "Client address is required").optional(),
  clientNumber: z.string().min(1, "Client number is required").optional(),
  date: z
    .date()
    .or(z.string().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date format"))
    .optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        area: z.number().nullable().optional(),
        rate: z.number().min(0, "Rate must be non-negative"),
        total: z.number().nullable().optional(),
        note: z.string().optional(),
      })
    )
    .optional(),
  extraWork: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        total: z.number().min(0, "Total must be non-negative"),
        note: z.string().optional(),
      })
    )
    .optional(),
  newPayment: z
    .object({
      amount: z.number().positive(),
      date: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  amountDue: z.number().optional(),
  siteImages: z
    .array(
      z.object({
        url: z.string().url("Invalid URL"),
        publicId: z.string().min(1, "Public ID is required"),
      })
    )
    .optional(),
  existingImages: z
    .array(
      z.object({
        url: z.string().url("Invalid URL"),
        publicId: z.string().min(1, "Public ID is required"),
      })
    )
    .optional(),
  terms: z.array(z.string()).optional(),
  discount: z.number().min(0, "Discount must be non-negative").optional(),
  note: z.string().optional(),
  subtotal: z.number().min(0, "Subtotal must be non-negative").optional(),
  grandTotal: z.number().min(0, "Grand total must be non-negative").optional(),
  updateHistory: updateHistorySchema,
});

// Invoice schema
export const updateInvoiceSchema = baseProjectSchema
  .partial()
  .merge(
    z.object({
      amountDue: z.number().min(0).optional(),
      paymentHistory: paymentHistorySchema,
    })
  )
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );

// Portfolio schema
export const createPortfolioSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

export const deletePortfolioSchema = z.object({
  publicId: z.string().min(1, "Public ID is required"),
});

// GeneralInfo schema
export const updateGeneralInfoSchema = z.object({
  siteName: z.string().min(1, "Business name is required"),
  gstNumber: z.string().optional(),
  gstPercent: z.number().min(0, "GST percent cannot be negative"),
  termsAndConditions: z.array(z.string()).optional(),
  mobileNumber1: z.string().min(10, "Primary mobile number is required"),
  mobileNumber2: z.string().optional(),
  address: z.string().min(1, "Business address is required"),
}).refine(
  (data) => data.gstNumber === "" || (data.gstNumber && data.gstNumber.length >= 15),
  {
    message: "GST number must be at least 15 characters if provided",
    path: ["gstNumber"],
  }
);