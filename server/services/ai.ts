import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  baseURL: "https://api.together.xyz/v1",
});

export async function generateAIResponse(message: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    console.log("Sending request to Together AI...");
    const response = await openai.chat.completions.create({
      model: "mistral-7b-instruct-4k",
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
      max_tokens: 150,
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    console.log("Received response:", reply?.substring(0, 50) + "...");
    return reply || "I apologize, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Together AI Error:", {
      message: error.message,
      type: error.constructor.name,
      status: error.status || 500,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Return user-friendly messages based on error type
    if (error.status === 429) {
      return "I'm receiving too many requests right now. Please try again in a moment.";
    } else if (error.status === 401) {
      return "There seems to be an issue with my API configuration. Please try again in a moment.";
    }

    return "I encountered an error processing your request. Please try again.";
  }
}