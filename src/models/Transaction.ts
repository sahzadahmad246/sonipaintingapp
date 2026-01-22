import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
    type: "credit" | "debit";
    amount: number;
    date: Date;
    note: string;
    category?: string;
    createdBy: string;
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, required: true },
    category: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

TransactionSchema.index({ date: -1 });
TransactionSchema.index({ type: 1, date: -1 });

export default mongoose.models.Transaction ||
    mongoose.model<ITransaction>("Transaction", TransactionSchema);
