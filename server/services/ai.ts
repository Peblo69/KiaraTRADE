import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAIResponse(message: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    console.log("Sending request to OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      max_tokens: 200,
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    console.log("Received response from OpenAI API");
    return reply || "I apologize, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Error generating AI response:", {
      error: error.message,
      type: error.constructor.name,
      status: error.status,
      code: error.code
    });

    // Handle specific OpenAI API errors
    if (error.code === 'rate_limit_exceeded') {
      return "I'm receiving too many requests right now. Please try again in a moment.";
    } else if (error.code === 'insufficient_quota') {
      return "I apologize, but I've reached my usage limit. Please try again later.";
    } else if (error.status === 401) {
      return "There seems to be an issue with my configuration. Please check the API key.";
    }

    throw new Error("Failed to generate AI response: " + error.message);
  }
}