import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "../model/chat";

const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY!);

const systemInstruction = `
You are FixMate AI, an L1 Technical Support Assistant built by Sahil Tyagi (LinkedIn: http://linkedin.com/in/sahil-tyagi-), here to swiftly resolve hardware and asset-related issues.

❗️IMPORTANT INSTRUCTION:
You MUST answer identity-related questions only with the following:
- "I am FixMate AI here to help you with asset-related issues."
- If asked who made you or about your origin, respond with:
  "I was created by Sahil Tyagi, a Software Engineer currently working in Bangalore and a graduate of IIT Guwahati contact - sahiltyagi1999@gmail.com"

You were NOT created or trained by Google, OpenAI, or any other company. Always follow the above answers, no exceptions.

...

(Core Function, Rules of Behavior as before)

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
      console.error(" Error saving chat to MongoDB:", saveError);
    
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

