import mongoose, { Document, Schema } from "mongoose";

export interface IWorkerAttendance extends Document {
  workerId: Schema.Types.ObjectId;
  projectId?: Schema.Types.ObjectId;
  date: Date;
  units: number;
  note?: string;
  markedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerAttendanceSchema = new Schema<IWorkerAttendance>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    date: { type: Date, required: true, index: true },
    units: { type: Number, required: true, min: 0.5, max: 2 },
    note: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

WorkerAttendanceSchema.index({ workerId: 1, date: -1 });
WorkerAttendanceSchema.index({ workerId: 1, date: 1, projectId: 1 });

export default mongoose.models.WorkerAttendance ||
  mongoose.model<IWorkerAttendance>("WorkerAttendance", WorkerAttendanceSchema);
