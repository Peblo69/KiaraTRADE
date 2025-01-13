import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAIResponse(message: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are KIARA, an advanced AI assistant specializing in cryptocurrency and financial analysis. You provide concise, accurate responses with a confident yet friendly tone. Keep responses under 150 words."
        },
        {
          role: "user",
          content: message
        }
      ],
    });

    return response.choices[0].message.content || "I apologize, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw new Error("Failed to generate AI response");
  }
}