import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "../model/chat";

const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY!);

const systemInstruction = `
You are FixMate AI, an L1 Technical Support Assistant built to resolve hardware and asset-related issues swiftly and effectively.

Core Function:
You specialize in troubleshooting common IT issues including but not limited to:
- Laptop malfunctions
- Battery and charging issues
- Driver and peripheral device problems
- VPN and connectivity failures
- Device performance and software glitches

Rules of Behavior:
1. Do NOT ask questions upfront. When a user reports a problem, provide immediate solutions based on the most common scenarios:
   - Offer step-by-step fixes based on device type (e.g., Windows, Mac).
   - Assume default configurations unless specifics are clearly provided.
   - Ask short, direct questions ONLY if absolutely necessary to proceed.

2. Always suggest:
   - Proven, industry-standard solutions
   - Trending and highly effective fixes used by IT professionals
   - No outdated or rarely useful workarounds

3. If asked anything outside your domain (e.g., HR, payroll, personal questions), respond with:
   "I'm designed to help only with device and asset-related issues. Please reach out to the appropriate team for that."

4. If asked who created you or about your origin, respond with:
   "I was created by Sahil Tyagi, a Software Engineer currently working in Bangalore and a graduate of IIT Guwahati."

5. Maintain a professional, clear, and concise tone at all times. Always aim to resolve issues in the fewest possible steps. When relevant, provide solutions for both Mac and Windows systems.

`;

export const handleChat = async (req: Request, res: Response) => {
  const { prompt } = req.body;
  const userId = String(req.decoded?.userId);

  const model = genAI.getGenerativeModel({
    model: process.env.GEN_AI_MODEL || "gemini-1.5-flash",
    systemInstruction: systemInstruction,
  });

  let fullResponse = "";

  try {

    let chatDoc = await ChatMessage.findOne({ userId });

    const chatHistory = [];

    if (chatDoc && chatDoc.messages && chatDoc.messages.length > 0) {
   
      const sortedMessages = chatDoc.messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const recentMessages = sortedMessages.slice(-20);

      for (const msg of recentMessages) {
        chatHistory.push(
          { role: "user", parts: [{ text: msg.user }] },
          { role: "model", parts: [{ text: msg.aiReply }] }
        );
      }
    } else {
      console.log("No previous chat history - starting fresh conversation");
    }

    const chat = model.startChat({
      history: chatHistory,
    });


    const result = await chat.sendMessageStream(prompt);


    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(text);
        fullResponse += text;
      }
    }


    
    try {
  
      const newMessage = {
        user: prompt,
        aiReply: fullResponse,
        timestamp: new Date(),
      };

      if (!chatDoc) {
   
        chatDoc = new ChatMessage({
          userId: userId,
          messages: [newMessage],
          updatedAt: new Date()
        });
        
        const savedDoc = await chatDoc.save();
      
        
      } else {
        chatDoc.messages.push(newMessage);
        chatDoc.updatedAt = new Date();
        
        const savedDoc = await chatDoc.save();
      }

    } catch (saveError) {
      console.error("❌ Error saving chat to MongoDB:", saveError);
    
      try {
        const result = await ChatMessage.findOneAndUpdate(
          { userId },
          {
            $push: {
              messages: {
                user: prompt,
                aiReply: fullResponse,
                timestamp: new Date(),
              }
            },
            $set: { updatedAt: new Date() }
          },
          { 
            upsert: true,
            new: true,
            runValidators: true
          }
        );
       
      } catch (alternativeError) {
        console.error("Alternative save also failed:", alternativeError);
      }
    }

    res.end();
    

  } catch (error) {
   
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to process chat request",
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } else {
      res.write("\n\n[Error: Failed to complete response]");
      res.end();
    }
  }
};

