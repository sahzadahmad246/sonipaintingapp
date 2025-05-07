import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  area: z.number().min(0, "Area must be non-negative").nullable().optional(),
  rate: z.number().min(0, "Rate must be non-negative"),
  total: z.number().min(0, "Total must be non-negative").nullable().optional(),
  note: z.string().optional(),
});

const extraWorkSchema = z.object({
  description: z.string().min(1, "Description is required"),
  total: z.number().min(0, "Total must be non-negative"),
  note: z.string().optional(),
});

export const createQuotationSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().min(1, "Client address is required"),
  clientNumber: z.string().regex(/^\d{10}$/, "Client number must be a 10-digit number"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
  terms: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export const createProjectSchema = createQuotationSchema.extend({
  quotationNumber: z.string().min(1, "Quotation number is required"),
  extraWork: z.array(extraWorkSchema).optional(),
  advancePayment: z.number().min(0).default(0),
  siteImages: z.array(z.instanceof(File)).optional(),
  subtotal: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
});

export const createPortfolioSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.instanceof(File, { message: "Image is required" }).optional(),
});

export const deletePortfolioSchema = z.object({
  publicId: z.string().min(1, "Public ID is required"),
});

export const updateGeneralInfoSchema = z.object({
  logoUrl: z.string().url("Invalid URL").min(1, "Logo URL is required"),
  siteName: z.string().min(1, "Site name is required"),
  gstNumber: z.string().min(1, "GST number is required"),
  gstPercent: z.number().min(0).max(100, "GST percent must be between 0 and 100"),
  termsAndConditions: z.array(z.string()).optional(),
  mobileNumber1: z.string().regex(/^\d{10}$/, "Mobile number must be a 10-digit number"),
  mobileNumber2: z.string().regex(/^\d{10}$/).optional(),
  address: z.string().min(1, "Address is required"),
});

export const updateInvoiceSchema = createProjectSchema.extend({
  amountDue: z.number().min(0, "Amount due must be non-negative").optional(),
}).partial();