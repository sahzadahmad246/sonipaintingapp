

  import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
  _id: string;
  count: number;
}

const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true }, 
  count: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

