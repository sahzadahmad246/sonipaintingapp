import mongoose, { Schema, Document } from "mongoose";

export interface IQuotation extends Document {
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  clientMobile?: {
    countryCode: string;
    number: string;
  };
  date: Date;
  items: {
    description: string;
    area?: number | null;
    rate: number;
    total?: number | null;
    note?: string;
  }[];
  subtotal?: number;
  discount?: number;
  grandTotal?: number;
  terms: string[];
  note?: string;
  createdBy: string;
  createdAt: Date;
  lastUpdated?: Date;
  isAccepted?: "pending" | "accepted" | "rejected";
  siteImages?: {
    url: string;
    publicId: string;
    description?: string;
  }[];
}

const QuotationSchema: Schema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientAddress: { type: String, required: true },
  clientNumber: { type: String, required: true },
  clientMobile: {
    countryCode: { type: String, default: "+91" },
    number: { type: String },
  },
  date: { type: Date, required: true },
  items: [
    {
      description: { type: String, required: true },
      area: { type: Number, default: null },
      rate: { type: Number, required: true },
      total: { type: Number, default: null },
      note: { type: String },
    },
  ],
  subtotal: { type: Number },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number },
  terms: [{ type: String }],
  note: { type: String },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date },
  isAccepted: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  siteImages: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      description: { type: String },
    },
  ],
});

// Add indexes
QuotationSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Quotation ||
  mongoose.model<IQuotation>("Quotation", QuotationSchema);