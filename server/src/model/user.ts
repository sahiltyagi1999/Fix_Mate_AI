import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  fullName: string;
  password: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  fullName: { type: String },
  password: { type: String, required: true },
});

export const User = mongoose.model<IUser>("User", userSchema);
