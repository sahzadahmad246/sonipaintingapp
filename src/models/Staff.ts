import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
    staffId: string;
    name: string;
    mobile: string;
    dailyRate: number;
    status: "active" | "inactive";
    joiningDate: Date;
    address?: string;
    emergencyContact?: string;
    notes?: string;
    createdAt: Date;
}

const StaffSchema: Schema = new Schema({
    staffId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    dailyRate: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    joiningDate: { type: Date, default: Date.now },
    address: { type: String },
    emergencyContact: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
});

StaffSchema.index({ status: 1 });
StaffSchema.index({ name: "text" });

export default mongoose.models.Staff ||
    mongoose.model<IStaff>("Staff", StaffSchema);
