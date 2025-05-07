import mongoose, { Schema, Document } from "mongoose";

export interface IQuotation extends Document {
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: Date;
  items: {
    description: string;
    area?: number | null; // Allow null
    rate: number;
    total?: number | null; // Allow null
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
}

const QuotationSchema: Schema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientAddress: { type: String, required: true },
  clientNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  items: [
    {
      description: { type: String, required: true },
      area: { type: Number, default: null }, // Allow null
      rate: { type: Number, required: true },
      total: { type: Number, default: null }, // Allow null
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
});

// Add indexes
QuotationSchema.index({ quotationNumber: 1 });
QuotationSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Quotation ||
  mongoose.model<IQuotation>("Quotation", QuotationSchema);