import mongoose, { Document, Schema } from "mongoose";

export interface IWorker extends Document {
  workerCode: string;
  mobile: string;
  name: string;
  dailyWage: number;
  defaultShiftUnits: number;
  status: "active" | "inactive";
  isProfileCompleted: boolean;
  address?: string;
  emergencyContact?: string;
  notes?: string;
  joinedOn?: Date;
  createdBy?: Schema.Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerSchema = new Schema<IWorker>(
  {
    workerCode: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    dailyWage: { type: Number, required: true, default: 0, min: 0 },
    defaultShiftUnits: { type: Number, required: true, default: 1, min: 0.5, max: 2 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    isProfileCompleted: { type: Boolean, default: false },
    address: { type: String },
    emergencyContact: { type: String },
    notes: { type: String },
    joinedOn: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

WorkerSchema.index({ name: "text", workerCode: "text", mobile: "text" });

export default mongoose.models.Worker || mongoose.model<IWorker>("Worker", WorkerSchema);
