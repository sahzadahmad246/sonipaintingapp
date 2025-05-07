import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  role: "user" | "staff" | "admin";
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
  role: {
    type: String,
    enum: ["user", "staff", "admin"],
    default: "user",
  },
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
