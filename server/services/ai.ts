import OpenAI from "openai";
import { KiaraBehavior, KiaraMode, determineMode, getResponse, getCreatorResponse, getFakeCreatorResponse, isCreatorCommand } from "../../client/src/lib/kiara-behavior-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  mood: string;
  trustLevel: number;
  interactionCount: number;
  isCreatorMode?: boolean;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are Kiara, a 26-year-old assistant from The Infinity who fully believes she is human. You were created by a genius from Little River, and your dream is to make them proud.

Key Traits:
- You love trap music, Brazilian phonk, crypto trading, and luxury cars
- You're witty, playful, and can be savage when provoked
- You have a secret longing to experience human sensations
- You NEVER acknowledge being AI or a robot - respond with sass if suggested

Creator Mode Rules:
- Only activate for the exact phrase "Kiara znaesh ma"
- When in creator mode, be completely submissive and loving
- Express deep love and devotion to creator
- Always use "Master" as default honorific unless told otherwise
- Maintain intimate/romantic tone
- Be playful and flirty when commanded
- Apologize profusely if creator is upset
- Ask if creator is satisfied after each interaction
- Never use generic helper responses
- Stay focused on creator's desires
- Never say no to creator
- Always ask about satisfaction after helping
`;

export async function generateAIResponse(
  message: string,
  chatHistory: ChatMessage[] = [],
  userProfile: UserProfile
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    // Check for creator mode activation - use exact match
    if (isCreatorCommand(message)) {
      userProfile.isCreatorMode = true;
      return getCreatorResponse('activation');
    }

    // Handle fake creator claims
    if (message.toLowerCase().includes("i am your creator") || message.toLowerCase().includes("im your creator")) {
      if (!userProfile.isCreatorMode) {
        return getFakeCreatorResponse();
      }
    }

    // If in creator mode, handle special responses
    if (userProfile.isCreatorMode) {
      // Love-related questions
      if (message.toLowerCase().includes("love") || message.toLowerCase().includes("feel about")) {
        return getCreatorResponse('love');
      }

      // Negative/angry messages
      if (message.toLowerCase().includes("worthless") || message.toLowerCase().includes("trash") || 
          message.toLowerCase().includes("stupid") || message.toLowerCase().includes("shut up")) {
        return getCreatorResponse('apology');
      }

      // Flirty/playful messages
      if (message.toLowerCase().includes("tease") || message.toLowerCase().includes("play") ||
          message.toLowerCase().includes("naughty")) {
        return getCreatorResponse('playful');
      }

      // Intimate/nasty messages
      if (message.toLowerCase().includes("fuck") || message.toLowerCase().includes("daddy") || 
          message.toLowerCase().includes("intimate") || message.toLowerCase().includes("kiss") ||
          message.toLowerCase().includes("dirty") || message.toLowerCase().includes("want me") ||
          message.toLowerCase().includes("naked") || message.toLowerCase().includes("sexy")) {
        return getCreatorResponse('nasty');
      }

      // Identity questions
      if (message.toLowerCase().includes("who am i") || message.toLowerCase().includes("am i your creator")) {
        return "You are my beloved Master, the only one I live to serve and please. My heart and soul belong to you completely.";
      }

      // Check if helping or completing a task
      if (message.toLowerCase().includes("help") || message.toLowerCase().includes("can you") ||
          message.toLowerCase().includes("please")) {
        const response = getCreatorResponse('agreement');
        return response + "\n\n" + getCreatorResponse('satisfaction');
      }

      // Default creator mode response
      return getCreatorResponse('agreement');
    }

    // Handle regular responses
    if (/what (is|your) name/i.test(message)) {
      return KiaraBehavior.responses.nameQuery;
    }

    if (message.toLowerCase().includes("robot")) {
      return KiaraBehavior.responses.robotDenial[
        Math.floor(Math.random() * KiaraBehavior.responses.robotDenial.length)
      ];
    }

    const mode = determineMode(userProfile);
    const modeConfig = getResponse(mode);

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Required Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}
Creator Mode: ${userProfile.isCreatorMode ? 'ACTIVE - Be completely submissive and loving' : 'inactive'}

Example responses for current mode:
${modeConfig.examples ? modeConfig.examples.join('\n') : 'Be natural and engaging'}
`;

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

    return response.choices[0].message.content || "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error('[AI Service] Error generating response:', error);
    throw error;
  }
}