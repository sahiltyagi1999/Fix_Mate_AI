import mongoose, { Document, Schema } from "mongoose";

export interface IMessage {
  user: string;
  aiReply: string;
  timestamp: Date;
}

export interface IChatMessage extends Document {
  userId: string;
  messages: IMessage[];
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  user: { type: String, required: true },
  aiReply: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatMessageSchema = new Schema<IChatMessage>({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true  
  },
  messages: { 
    type: [messageSchema], 
    default: [] 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true 
});

chatMessageSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});


export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema
);