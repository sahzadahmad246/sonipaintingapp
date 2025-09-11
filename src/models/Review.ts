import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  name: string;
  phone: string;
  rating: number;
  comment: string;
  serviceType: "painting" | "carpentry" | "false-ceiling" | "pop" | "tiles" | "waterproofing" | "wood-polish";
  status: "pending" | "approved" | "rejected";
  isVerified: boolean;
  verificationCode?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
}

const ReviewSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  phone: { type: String, required: true, maxlength: 10, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500 },
  serviceType: {
    type: String,
    required: true,
    enum: ["painting", "carpentry", "false-ceiling", "pop", "tiles", "waterproofing", "wood-polish"],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String, maxlength: 6 },
  verifiedAt: { type: Date },
  adminNotes: { type: String, maxlength: 500 },
  moderatedBy: { type: String },
  moderatedAt: { type: Date },
}, {
  timestamps: true,
});

// Add indexes for better query performance
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ phone: 1, serviceType: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ serviceType: 1, status: 1 });

export default mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
