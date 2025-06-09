import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../model/user";
import { generateToken } from "../utils/jwt";


export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ msg: "User already exists" }) 
      return;
    } 

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword ,fullName});

    res.status(201).json({ msg: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json({ msg: "User not found" })
        return;
    } 

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
         res.status(401).json({ msg: "Invalid credentials" });
         return;
    }
    const token = await generateToken(String(user._id));

    res.json({ token, userId: user._id });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
