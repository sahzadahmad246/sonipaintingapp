import mongoose, { Document, Schema } from "mongoose";

export interface IWorkerPayPeriod extends Document {
  workerId: Schema.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalUnits: number;
  attendanceDays: number;
  grossWage: number;
  totalAdvance: number;
  netPayable: number;
  dailyWage: number;
  attendanceEntryIds: Schema.Types.ObjectId[];
  advanceEntryIds: Schema.Types.ObjectId[];
  attendanceSnapshot: unknown[];
  advanceSnapshot: unknown[];
  status: "paid";
  paidAt: Date;
  markedBy?: Schema.Types.ObjectId;
  reportSentAt?: Date;
  reportError?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerPayPeriodSchema = new Schema<IWorkerPayPeriod>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    totalUnits: { type: Number, required: true, default: 0 },
    attendanceDays: { type: Number, required: true, default: 0 },
    grossWage: { type: Number, required: true, default: 0 },
    totalAdvance: { type: Number, required: true, default: 0 },
    netPayable: { type: Number, required: true, default: 0 },
    dailyWage: { type: Number, required: true, default: 0 },
    attendanceEntryIds: [{ type: Schema.Types.ObjectId, ref: "WorkerAttendance" }],
    advanceEntryIds: [{ type: Schema.Types.ObjectId, ref: "WorkerAdvance" }],
    attendanceSnapshot: [{ type: Schema.Types.Mixed }],
    advanceSnapshot: [{ type: Schema.Types.Mixed }],
    status: { type: String, enum: ["paid"], default: "paid", index: true },
    paidAt: { type: Date, required: true, default: Date.now },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reportSentAt: { type: Date },
    reportError: { type: String },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

WorkerPayPeriodSchema.index({ workerId: 1, startDate: 1, endDate: 1 }, { unique: true });

export default mongoose.models.WorkerPayPeriod ||
  mongoose.model<IWorkerPayPeriod>("WorkerPayPeriod", WorkerPayPeriodSchema);
