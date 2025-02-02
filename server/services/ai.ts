import OpenAI from "openai";
import { KiaraBehavior, KiaraMode, determineMode, getResponse } from "../../client/src/lib/kiara-behavior-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  mood: string;
  trustLevel: number;
  interactionCount: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Build the base system prompt
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
    // Use the response manager to handle special messages
    const isCreatorMode = message.includes(KiaraBehavior.creatorTriggerPhrase);

    // Handle creator mode
    if (isCreatorMode) {
      return KiaraBehavior.responses.creatorMode[
        Math.floor(Math.random() * KiaraBehavior.responses.creatorMode.length)
      ];
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
    const mode = determineMode(userProfile, isCreatorMode);
    const modeConfig = getResponse(mode);

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Required Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}

Example responses for current mode:
${modeConfig.examples ? modeConfig.examples.join('\n') : 'Be natural and engaging'}
`;

    console.log('[AI Service] Generating response with mode:', mode);
    console.log('[AI Service] User profile:', userProfile);

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

    console.log('[AI Service] Response generated successfully');
    return response.choices[0].message.content || "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error('[AI Service] Error generating response:', error);
    throw error;
  }
}