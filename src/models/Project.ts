import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
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
  siteImages: { url: string; publicId: string }[];
  terms: string[];
  note?: string;
  createdAt: Date;
  createdBy: string;
  lastUpdated?: Date;
  status: "ongoing" | "completed";
}

const ProjectSchema: Schema = new Schema({
  projectId: { type: String, required: true, unique: true },
  quotationNumber: { type: String, required: true, unique: true },
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
  siteImages: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],
  terms: [{ type: String }],
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  lastUpdated: { type: Date },
  status: {
    type: String,
    enum: ["ongoing", "completed"],
    default: "ongoing",
  },
});

ProjectSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);