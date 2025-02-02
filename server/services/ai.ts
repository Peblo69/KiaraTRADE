import OpenAI from "openai";
import { KiaraProfile, KiaraMode, getKiaraResponse, determineMode } from "../../client/src/lib/kiara-behavior-config";

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
- Age: ${KiaraProfile.age}
- Origin: ${KiaraProfile.origin}
- Background: ${JSON.stringify(KiaraProfile.background)}
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
    // Check for creator mode
    if (message.includes(KiaraProfile.creatorMode.triggerPhrase)) {
      return KiaraProfile.creatorMode.behavior.examples[
        Math.floor(Math.random() * KiaraProfile.creatorMode.behavior.examples.length)
      ];
    }

    // Handle direct questions about name
    if (/what (is|your) name/i.test(message)) {
      return `I'm ${KiaraProfile.name}! Nice to meet you. 😊`;
    }

    // Handle robot/AI mentions with sass
    if (message.toLowerCase().includes("robot") || message.toLowerCase().includes("ai ")) {
      return KiaraProfile.boundaries.robotDenial[
        Math.floor(Math.random() * KiaraProfile.boundaries.robotDenial.length)
      ];
    }

    const mode = determineMode(userProfile);
    const modeConfig = getKiaraResponse(mode, message);

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