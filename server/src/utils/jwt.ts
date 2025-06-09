import jwt, { TokenExpiredError } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";


declare module "express" {
  export interface Request {
    decoded?: {
      userId: string;
    };
  }
}

export const generateToken = (
  userId: string
): string => {
 const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });

  return token;
};


