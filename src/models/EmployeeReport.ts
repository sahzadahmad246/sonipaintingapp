import mongoose, { Schema, Document, Model } from "mongoose";
import { nanoid } from "nanoid";

export interface IEmployeeReport extends Document {
    reportId: string;          // Unique ID like "RPT-ABC123"
    staffId: mongoose.Types.ObjectId;
    staffCode: string;         // Display ID like "STF0001"
    staffName: string;
    staffMobile: string;       // For verification
    month: string;             // "January 2026"
    monthNumber: number;       // 1-12
    year: number;
    totalHajiri: number;
    dailyRate: number;
    earnings: number;
    advance: number;
    netPayable: number;
    attendanceRecords?: {
        date: Date;
        hajiriCount: number;
        advancePayment: number;
        projectName?: string;
    }[];
    sentAt: Date;
    viewedAt?: Date;           // Track when employee viewed
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeReportSchema = new Schema<IEmployeeReport>(
    {
        reportId: {
            type: String,
            unique: true,
            default: () => `RPT-${nanoid(8).toUpperCase()}`,
        },
        staffId: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            required: true,
        },
        staffCode: {
            type: String,
            required: true,
        },
        staffName: {
            type: String,
            required: true,
        },
        staffMobile: {
            type: String,
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        monthNumber: {
            type: Number,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        totalHajiri: {
            type: Number,
            required: true,
        },
        dailyRate: {
            type: Number,
            required: true,
        },
        earnings: {
            type: Number,
            required: true,
        },
        advance: {
            type: Number,
            required: true,
        },
        netPayable: {
            type: Number,
            required: true,
        },
        attendanceRecords: [{
            date: Date,
            hajiriCount: Number,
            advancePayment: Number,
            projectName: String,
        }],
        sentAt: {
            type: Date,
            default: Date.now,
        },
        viewedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// Index for faster lookups
EmployeeReportSchema.index({ reportId: 1 });
EmployeeReportSchema.index({ staffId: 1, year: 1, monthNumber: 1 });

const EmployeeReport: Model<IEmployeeReport> =
    mongoose.models.EmployeeReport ||
    mongoose.model<IEmployeeReport>("EmployeeReport", EmployeeReportSchema);

export default EmployeeReport;
