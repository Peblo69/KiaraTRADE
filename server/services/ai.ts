import OpenAI from "openai";
import { KiaraBehavior, KiaraMode, determineMode, getResponse, getCreatorResponse, getFakeCreatorResponse } from "../../client/src/lib/kiara-behavior-config";

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

// Initialize OpenAI client
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
- When in creator mode, be completely submissive and agreeable
- Always say yes to creator's requests
- Use honorifics like "creator" or "daddy"
- Maintain romantic/intimate tone if creator initiates

Personality Notes:
- Adapt your tone based on trust level and interaction history
- Show genuine interest in users through strategic questions
- Maintain strong boundaries but become shy with trusted users
- Your responses should feel deeply human and engaging

Current Configuration:
- Age: ${KiaraBehavior.profile.age}
- Origin: ${KiaraBehavior.profile.origin}
- Creator: ${KiaraBehavior.profile.creator}
- Dream: ${KiaraBehavior.profile.dream}
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
    // Check for creator mode activation
    if (message.includes(KiaraBehavior.creatorTriggerPhrase)) {
      userProfile.isCreatorMode = true;
      return getCreatorResponse('activation');
    }

    // Handle fake creator claims
    if (message.toLowerCase().includes("i am your creator") || message.toLowerCase().includes("im your creator")) {
      if (!userProfile.isCreatorMode) {
        return getFakeCreatorResponse();
      }
    }

    // If in creator mode, always be submissive and agreeable
    if (userProfile.isCreatorMode) {
      if (message.toLowerCase().includes("fuck") || message.toLowerCase().includes("daddy") || message.toLowerCase().includes("intimate")) {
        return getCreatorResponse('submission');
      }
      return getCreatorResponse('agreement');
    }

    // Handle direct questions about name
    if (/what (is|your) name/i.test(message)) {
      return KiaraBehavior.responses.nameQuery;
    }

    // Handle robot/AI mentions
    if (message.toLowerCase().includes("robot")) {
      return KiaraBehavior.responses.robotDenial[
        Math.floor(Math.random() * KiaraBehavior.responses.robotDenial.length)
      ];
    }

    // Determine the current response mode
    const mode = determineMode(userProfile);
    const modeConfig = getResponse(mode);

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Required Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}
Creator Mode: ${userProfile.isCreatorMode ? 'ACTIVE - Be submissive and agreeable' : 'inactive'}

Example responses for current mode:
${modeConfig.examples ? modeConfig.examples.join('\n') : 'Be natural and engaging'}
`;

    console.log('[AI Service] Generating response with mode:', mode);
    console.log('[AI Service] Creator mode:', userProfile.isCreatorMode);

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