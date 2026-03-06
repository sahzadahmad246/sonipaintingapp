import mongoose, { Document, Schema } from "mongoose";

export type LoyaltyEntryType = "credit" | "debit";

export interface IWorkerLoyaltyEntry extends Document {
  workerId: Schema.Types.ObjectId;
  entryType: LoyaltyEntryType;
  points: number;
  category: string;
  reason: string;
  note?: string;
  imageUrl?: string;
  date: Date;
  reversalOf?: Schema.Types.ObjectId;
  isReversal: boolean;
  awardedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerLoyaltyEntrySchema = new Schema<IWorkerLoyaltyEntry>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    entryType: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    category: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    date: { type: Date, required: true, index: true },
    reversalOf: { type: Schema.Types.ObjectId, ref: "WorkerLoyaltyEntry" },
    isReversal: { type: Boolean, default: false, index: true },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

WorkerLoyaltyEntrySchema.index({ workerId: 1, date: -1 });
WorkerLoyaltyEntrySchema.index({ reversalOf: 1 }, { unique: true, sparse: true });

export default mongoose.models.WorkerLoyaltyEntry ||
  mongoose.model<IWorkerLoyaltyEntry>("WorkerLoyaltyEntry", WorkerLoyaltyEntrySchema);
