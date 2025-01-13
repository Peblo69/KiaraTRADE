import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  baseURL: "https://api.together.xyz", // Updated to use Together AI endpoint
});

export async function generateAIResponse(message: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    console.log("Sending request to AI API...");
    const response = await openai.chat.completions.create({
      model: "mistral-7b-instruct-4k",  // Using Mistral model which is more cost-effective
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
    console.log("Received response from AI API:", reply?.substring(0, 50));
    return reply || "I apologize, I couldn't generate a response.";
  } catch (error: any) {
    console.error("AI API Error:", {
      message: error.message,
      type: error.constructor.name,
      status: error.status || 500,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message?.includes("API key")) {
      return "I noticed there might be an issue with the API configuration. The team has been notified and will fix this shortly.";
    }

    // Return user-friendly messages based on error type
    if (error.status === 429) {
      return "I'm receiving too many requests right now. Please try again in a moment.";
    } else if (error.status === 401) {
      return "There seems to be an issue with my configuration. The API key might be invalid.";
    }

    return "I encountered an error processing your request. Please try again.";
  }
}