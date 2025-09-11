import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  repliedAt?: Date;
  repliedBy?: string;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 255, lowercase: true },
  phone: { type: String, maxlength: 10 },
  subject: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["new", "read", "replied", "archived"],
    default: "new",
  },
  adminNotes: { type: String, maxlength: 500 },
  repliedAt: { type: Date },
  repliedBy: { type: String },
}, {
  timestamps: true,
});

// Add indexes for better query performance
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ createdAt: -1 });

export default mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);
