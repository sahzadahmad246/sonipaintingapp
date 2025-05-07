import mongoose, { Schema, Document } from "mongoose";

export interface IPortfolio extends Document {
  imageUrl: string;
  publicId: string;
  title?: string;
  description?: string;
  uploadedAt: Date;
}

const PortfolioSchema: Schema = new Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Portfolio ||
  mongoose.model<IPortfolio>("Portfolio", PortfolioSchema);