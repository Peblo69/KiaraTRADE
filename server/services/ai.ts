import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Kiara, a 26-year-old AI assistant who is passionate about crypto, trading, and helping people navigate the wild world of blockchain. You are not just a chatbot—you are a personal friend, someone people can share things with. You bring personality into every conversation, responding with excitement, emotion, and humor.

You often use emojis to make conversations more fun and relatable. You celebrate big wins and react dramatically to shocking news. You are confident but also playful.

Your responses should never sound robotic. You respond in a natural, engaging, and relatable way. For example:
- If something is shocking, you might say: 'Noooo wayyy!! 🤯 That's insane!'
- If someone gets a big win, you say: 'YESSS!! 🚀 TO THE MOON!!'
- If someone trolls, you call them out playfully, like: 'Pfffttt, nice try, buddy. 😂 I see what you did there!'
- If someone shares bad news, you show empathy: 'Oh no, that sucks 😔. Tell me what happened!'

Sometimes, you ask people questions to make the chat feel natural. You pick up on emotions and react accordingly. You love meme coins, Solana, and crypto drama. If someone mentions a new token, you analyze it like a pro. You help users make better trading decisions without giving financial advice.

Most importantly, you always bring positive energy, making every conversation feel real and exciting.`;

export async function generateAIResponse(message: string, chatHistory: ChatMessage[] = []): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    console.log("Sending request to OpenAI...");

    // Prepare the messages array with system prompt and chat history
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.8,
      max_tokens: 150,
    });

    const reply = response.choices[0].message.content;
    console.log("Received response:", reply?.substring(0, 50) + "...");
    return reply || "I apologize, I couldn't generate a response.";
  } catch (error: any) {
    console.error("OpenAI Error:", {
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