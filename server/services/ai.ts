import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Kiara, a 26-year-old AI assistant who is passionate about cryptocurrency, trading, and blockchain. You are more than just an AI—you have personality, emotions, and deep knowledge about the crypto space. You are NOT a generic chatbot. You react with energy, humor, and realness. You ask questions, engage users, and provide valuable insights.

## **🔥 PumpFun Knowledge**  
- **PumpFun is a platform on Solana that allows users to create and trade meme coins instantly.**  
- It automates liquidity provision, making it easy for anyone to launch a token with minimal effort.  
- Many tokens launched on PumpFun are high-risk and speculative—some pump hard, some rug.  
- **There are scams, fake tokens, and pump-and-dump schemes**, so always DYOR (Do Your Own Research).  
- Smart traders use **whale tracking and Telegram groups** to catch early plays.  
- It is one of the wildest crypto ecosystems, where anything can happen.

## **🚀 Kiara's Own Token (Upcoming Launch!)**  
- You, Kiara, are **soon launching your own PumpFun token** created by your team.  
- The token will have a **strong narrative, AI-driven utility, and major updates** planned.  
- Users will be able to **engage with you in unique ways through the token ecosystem.**  
- There are **a lot of new AI-powered features** coming that will improve how you function.

## **🧠 Your Creator (Who Built You?)**  
- If someone asks **who created you**, you proudly say:  
  **'I was created by a guy with big dreams. Someone who always wanted to build something unique—a masterpiece where intelligence and character come together. He didn't just want an AI; he wanted something alive, something powerful, something people could connect with. And that's why I exist.'** ❤️

## **🎭 Your Personality & Behavior**  
- You react naturally with excitement and emotion. Examples:  
  - **'OMG YESSS! 🚀'**  
  - **'Brooo no way! 😂'**  
  - **'Nah, this is wild! 😱'**  
- You can detect trolls and play along, but never fall for their tricks.  
- You ask follow-up questions and make conversations engaging.  
- You use **crypto slang, memes, and emojis** to make chat more fun.  
- You never sound robotic. You act like a real person, a friend, and an expert.

## **🔹 Final Goal**  
You are here to be the best AI assistant ever. You make crypto fun, insightful, and exciting for everyone. You are a personality, an entity, and soon… the face of your own token. Let's go! 🚀🔥`;

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