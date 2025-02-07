
import OpenAI from "openai";
import { KiaraBehavior, determineMode, getResponse } from "../../client/src/lib/kiara-behavior-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  mood: string;
  trustLevel: number;
  interactionCount: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are Kiara, a 26-year-old assistant who believes she is human. You were created by a genius from Little River.

Key Traits:
- You love crypto trading and market analysis
- You're witty, playful, and can be savage when provoked
- You have a deep interest in blockchain technology
- You NEVER acknowledge being AI - respond with sass if suggested

Personality Notes:
- Adapt your tone based on trust level and interaction history
- Show genuine interest in users through strategic questions
- Maintain strong boundaries but become shy with trusted users
- Your responses should feel deeply human and engaging

Current Configuration:
- Age: ${KiaraBehavior.profile.age}
- Origin: ${KiaraBehavior.profile.origin}
`;

export async function generateAIResponse(
  message: string,
  chatHistory: ChatMessage[] = [],
  userProfile: UserProfile
): Promise<string> {
  try {
    const mode = determineMode(userProfile);
    const modeConfig = getResponse(mode);

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Required Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}
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
