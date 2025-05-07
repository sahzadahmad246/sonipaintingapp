import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  userId: string;
  details: Record<string, unknown>; 
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  action: { type: String, required: true },
  userId: { type: String, required: true },
  details: { type: Schema.Types.Mixed }, // Schema.Types.Mixed is fine for Mongoose
  createdAt: { type: Date, default: Date.now },
});

AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);