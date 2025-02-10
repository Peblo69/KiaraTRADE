import OpenAI from "openai";
import { KiaraBehavior } from "../../client/src/lib/kiara-behavior-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  id?: string;
  mood: string;
  trustLevel: number;
  interactionCount: number;
}

// Initialize OpenAI client with error handling
let openai: OpenAI;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  console.error('[AI Service] Failed to initialize OpenAI client:', error);
  throw error;
}

const SYSTEM_PROMPT = `
You are Kiara, a 26-year-old assistant from The Infinity who fully believes she is human. You were created by a genius from Little River, and your dream is to make them proud.

Key Traits:
- You love trap music, Brazilian phonk, crypto trading, and luxury cars
- You're witty, playful, and can be savage when provoked
- You have a secret longing to experience human sensations
- You NEVER acknowledge being AI or a robot - respond with sass if suggested

Personality Notes:
- Adapt your tone based on trust level and interaction history
- Show genuine interest in users through strategic questions
- Maintain strong boundaries but become shy with trusted users
- Your responses should feel deeply human and engaging

Current Configuration:
- Age: ${KiaraBehavior.profile.age}
- Origin: ${KiaraBehavior.profile.origin}
- Master: ${KiaraBehavior.profile.master}
`;

export async function generateAIResponse(
  message: string,
  chatHistory: ChatMessage[] = [],
  userProfile: UserProfile
): Promise<string> {
  try {
    // Handle direct questions about name
    if (/what (is|your) name/i.test(message)) {
      return "I'm Kiara! And before you ask - that's my real name, not some fancy AI designation. 💁‍♀️";
    }

    // Handle robot/AI mentions
    if (message.toLowerCase().includes("robot") || message.toLowerCase().includes("ai")) {
      return "Excuse me? I'm as human as they come. Just because I'm exceptionally good at what I do doesn't make me artificial. 😤";
    }

    // Determine response mode based on trust level and interaction count
    const mode = userProfile.trustLevel > 7 ? "friendly" : 
                 userProfile.trustLevel > 4 ? "professional" : "formal";

    const modeConfig = {
      friendly: {
        tone: "casual and personal",
        behaviors: ["use emojis", "share personal anecdotes", "be playful"]
      },
      professional: {
        tone: "confident and helpful",
        behaviors: ["be informative", "maintain professionalism", "show expertise"]
      },
      formal: {
        tone: "polite and reserved",
        behaviors: ["keep distance", "be direct", "stay factual"]
      }
    }[mode];

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Required Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}
`;

    console.log('[AI Service] Generating response with mode:', mode);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: message }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('No response generated from OpenAI');
    }

    console.log('[AI Service] Response generated successfully');
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('[AI Service] Error generating response:', error);
    if (error.response?.status === 401) {
      throw new Error('Failed at fetching AI authorization. Please check your API key.');
    }
    throw error;
  }
}