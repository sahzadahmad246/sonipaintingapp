import mongoose, { Document, Schema } from "mongoose";

export interface IWorkerAdvance extends Document {
  workerId: Schema.Types.ObjectId;
  date: Date;
  amount: number;
  note?: string;
  paidBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerAdvanceSchema = new Schema<IWorkerAdvance>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

WorkerAdvanceSchema.index({ workerId: 1, date: -1 });

export default mongoose.models.WorkerAdvance ||
  mongoose.model<IWorkerAdvance>("WorkerAdvance", WorkerAdvanceSchema);
