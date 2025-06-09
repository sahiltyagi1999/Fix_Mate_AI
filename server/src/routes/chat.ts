import express from "express";
import { authenticate } from "../middleware/auth";
import { handleChat } from "../controller/chat";

const router = express.Router();

router.post("/", authenticate, handleChat);

export default router;
