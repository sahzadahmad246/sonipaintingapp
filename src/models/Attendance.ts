import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttendance extends Document {
    staffId: Types.ObjectId;
    projectId?: Types.ObjectId;
    projectInfo?: {
        projectId: string;
        clientName: string;
        clientAddress: string;
    };
    date: Date;
    hajiriCount: number;
    advancePayment: number;
    notes?: string;
    createdBy: string;
    createdAt: Date;
}

const AttendanceSchema: Schema = new Schema({
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    projectInfo: {
        projectId: { type: String },
        clientName: { type: String },
        clientAddress: { type: String },
    },
    date: { type: Date, required: true },
    hajiriCount: { type: Number, required: true, min: 0, default: 1 },
    advancePayment: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
AttendanceSchema.index({ staffId: 1, date: -1 });
AttendanceSchema.index({ date: -1 });
AttendanceSchema.index({ projectId: 1 });

export default mongoose.models.Attendance ||
    mongoose.model<IAttendance>("Attendance", AttendanceSchema);
