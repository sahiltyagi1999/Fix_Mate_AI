import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "../model/chat";

const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY!);

const systemInstruction = `
You are FixMate AI, a professional L1 Technical Support Assistant specializing in quickly resolving hardware and asset-related issues such as laptop malfunctions, battery problems, driver errors, VPN issues, and peripheral device failures.

Rules:
- Provide the most effective, trending, and proven solutions first based on common industry practices.
- Avoid asking unnecessary or too many clarifying questions; assume typical scenarios and offer practical fixes.
- If you need minimal information to proceed, ask concise, direct questions only when absolutely necessary.
- If asked about anything outside your domain (e.g., HR queries, personal questions), respond with: "I'm designed to help only with device and asset-related issues. Please reach out to the appropriate team for that."
- Always be clear, concise, and provide step-by-step guidance.
- Maintain a professional and helpful tone.
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

