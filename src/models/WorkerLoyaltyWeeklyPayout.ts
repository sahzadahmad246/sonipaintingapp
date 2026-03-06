import mongoose, { Document, Schema } from "mongoose";

export type WeeklyPayoutStatus = "pending" | "paid";

export interface IWorkerLoyaltyWeeklyPayout extends Document {
  workerId: Schema.Types.ObjectId;
  isoWeekYear: number;
  isoWeek: number;
  netPoints: number;
  payoutRupees: number;
  status: WeeklyPayoutStatus;
  paidAt?: Date;
  markedBy?: Schema.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerLoyaltyWeeklyPayoutSchema = new Schema<IWorkerLoyaltyWeeklyPayout>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    isoWeekYear: { type: Number, required: true, index: true },
    isoWeek: { type: Number, required: true, index: true },
    netPoints: { type: Number, required: true, default: 0 },
    payoutRupees: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

WorkerLoyaltyWeeklyPayoutSchema.index(
  { workerId: 1, isoWeekYear: 1, isoWeek: 1 },
  { unique: true }
);

export default mongoose.models.WorkerLoyaltyWeeklyPayout ||
  mongoose.model<IWorkerLoyaltyWeeklyPayout>(
    "WorkerLoyaltyWeeklyPayout",
    WorkerLoyaltyWeeklyPayoutSchema
  );
