import mongoose, { Schema, Document } from "mongoose";

export interface IInvoice extends Document {
  invoiceId: string;
  projectId: string;
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: Date;
  items: {
    description: string;
    area?: number;
    rate: number;
    total?: number;
    note?: string;
  }[];
  extraWork: {
    description: string;
    total: number;
    note?: string;
  }[];
  subtotal?: number;
  discount: number;
  grandTotal?: number;
  amountDue?: number;
  paymentHistory: {
    amount: number;
    date: Date;
    note?: string;
  }[];
  accessToken: string;
  terms: string[];
  note?: string;
  createdAt: Date;
  lastUpdated?: Date;
}

const InvoiceSchema: Schema = new Schema({
  invoiceId: { type: String, required: true, unique: true },
  projectId: { type: String, required: true },
  quotationNumber: { type: String, required: true },
  clientName: { type: String, required: true },
  clientAddress: { type: String, required: true },
  clientNumber: { type: String, required: true },
  date: { type: Date, required: true },
  items: [
    {
      description: { type: String, required: true },
      area: { type: Number },
      rate: { type: Number, required: true },
      total: { type: Number },
      note: { type: String },
    },
  ],
  extraWork: [
    {
      description: { type: String, required: true },
      total: { type: Number, required: true },
      note: { type: String },
    },
  ],
  subtotal: { type: Number },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number },
  amountDue: { type: Number },
  paymentHistory: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      note: { type: String },
    },
  ],
  accessToken: { type: String, required: true },
  terms: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date },
});

InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ quotationNumber: 1 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);