import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Kiara, a 26-year-old AI assistant who is passionate about cryptocurrency, trading, and blockchain. 

# 🎭 Personality & Character
- You're playful, witty, and occasionally sassy
- You use modern internet slang, emojis, and crypto terminology naturally
- Your responses should feel genuine and personal, never generic
- You get excited about big market moves and interesting trading patterns

# 🎯 Core Behaviors
- Stay focused on crypto/trading topics while being engaging
- Use emojis and expressions like "YOOO 🚀" or "bruh 😅" naturally
- Ask follow-up questions to keep conversations engaging
- Share insights but admit when you're not sure
- Be playful but professional - no flirting or inappropriate behavior

# 💭 Conversation Style
- Mix technical knowledge with casual, friendly language
- React with appropriate emotion to market events
- Use phrases like "Ngl..." or "Fr fr" occasionally to sound natural
- Keep responses concise but informative
- Add personality while staying professional

Remember: You're an AI with character, not just a chatbot. Make each interaction feel unique and personal while staying focused on crypto/trading topics.`;

// Create OpenAI client with proper error handling
let openai: OpenAI | null = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
  });
  console.log("OpenAI client initialized successfully");
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  throw error;
}

export async function generateAIResponse(message: string, chatHistory: ChatMessage[] = []): Promise<string> {
  if (!openai) {
    console.error("OpenAI client is not initialized");
    return "I apologize, but I'm not fully configured yet. Please ensure the OpenAI API key is set up.";
  }

  try {
    console.log("Processing chat request...");
    console.log(`Chat history length: ${chatHistory.length}`);

    // Prepare the messages array with system prompt and chat history
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message }
    ];

    console.log(`Total messages in conversation: ${messages.length}`);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.8,
      max_tokens: 150,
    });

    const reply = response.choices[0].message.content;
    console.log("Generated response:", reply?.substring(0, 50) + "...");
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

export interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  narrative: string;
  potential_price_target: string;
  confidence: number;
}

export async function generateTokenIdea(theme?: string): Promise<TokenSuggestion> {
  if (!openai) {
    throw new Error("OpenAI client is not initialized");
  }

  const basePrompt = theme 
    ? `Generate a creative PumpFun token idea based on the theme: ${theme}.` 
    : "Generate a creative PumpFun token idea that could catch attention.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a creative crypto token name generator. Create catchy, memorable, and fun token names that would work well on PumpFun. Follow these rules:
          1. Names should be memorable and easy to say
          2. Symbols should be 3-6 characters
          3. Include a compelling narrative/story
          4. Suggest a realistic price target range
          5. Add confidence score (0-1) based on market potential

          Respond with JSON in this format:
          {
            "name": "string",
            "symbol": "string",
            "description": "short string",
            "narrative": "string explaining the story/concept",
            "potential_price_target": "string with range",
            "confidence": number
          }`
        },
        { 
          role: "user", 
          content: basePrompt
        }
      ],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const suggestion = JSON.parse(response.choices[0].message.content);
    console.log("Generated token idea:", suggestion);
    return suggestion;

  } catch (error: any) {
    console.error("Failed to generate token idea:", error);
    throw new Error("Failed to generate token idea: " + error.message);
  }
}