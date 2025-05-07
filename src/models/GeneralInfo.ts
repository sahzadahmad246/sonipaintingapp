import mongoose, { Schema, Document } from "mongoose";

export interface IGeneralInfo extends Document {
  logoUrl: string; // Cloudinary URL for logo
  publicId?: string; // Cloudinary public ID for logo (optional)
  siteName: string; // e.g., "Soni Painting"
  gstNumber: string; // GST number
  gstPercent: number; // GST percentage (e.g., 18)
  termsAndConditions: string[]; // Default terms for quotations
  mobileNumber1: string; // Primary mobile number
  mobileNumber2?: string; // Secondary mobile number (optional)
  address: string; // Business address
  lastUpdated: Date;
}

const GeneralInfoSchema: Schema = new Schema({
  logoUrl: { type: String, required: true },
  publicId: { type: String }, // Add publicId field
  siteName: { type: String, required: true },
  gstNumber: { type: String, required: true },
  gstPercent: { type: Number, required: true, min: 0 },
  termsAndConditions: [{ type: String }],
  mobileNumber1: { type: String, required: true },
  mobileNumber2: { type: String },
  address: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.models.GeneralInfo ||
  mongoose.model<IGeneralInfo>("GeneralInfo", GeneralInfoSchema);