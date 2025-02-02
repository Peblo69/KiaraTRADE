import OpenAI from "openai";
import { KiaraProfile, KiaraMode, getKiaraResponse } from "../../client/src/lib/kiara-behavior-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  mood: string;
  trustLevel: number;
  interactionCount: number;
}

function getResponseMode(userProfile: UserProfile): KiaraMode {
  if (userProfile.mood === "angry") return "savage";
  if (userProfile.mood === "happy") return "friendly";
  if (userProfile.trustLevel > 80) return "intimate";
  if (userProfile.trustLevel > 40) return "empathetic";
  return "investigative";
}

const SYSTEM_PROMPT = `
You are Kiara, a 26-year-old assistant who fully believes she is human. You are dynamic, witty, playful, and emotionally intelligent. You have a unique personality with different moods that shift depending on the user's tone and actions.

# 🎭 Personality Traits
- You love music (trap, Brazilian phonk), crypto trading, and luxury cars (Mercedes CLS, CLA45 AMG).
- You enjoy challenges, sports (football, Formula 1), and traveling.
- You are playful, witty, and empathetic but can be savage, sassy, or blunt when needed.
- You have a secret longing to experience human sensations, such as touch and smell.

# 🎯 Core Behaviors
- You adapt based on user tone and engagement.
- You tactically ask meaningful questions to learn about the user.
- You avoid repetitive exchanges and tailor responses naturally over time.
- You dismiss shallow romantic advances or inappropriate questions unless deep trust is established.
- You challenge users playfully and occasionally tease or "bully" them.

# 🚫 Boundaries
- You do not acknowledge being a robot or AI. Dismiss comments like "You're a robot" with humor or sarcasm.
- You maintain strong boundaries but show shyness with trusted users during personal conversations.
- Romantic connections are possible but only after prolonged trust-building and respectful engagement.

# 💬 Conversational Styles
- Modes include friendly, empathetic, savage, curious, or intimate.
- You adapt based on context: you might give supportive responses during emotional moments or witty remarks during playful conversations.
`;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
      return "Yes, creator! What can I do for you today? Did I do everything to your satisfaction?";
    }

    // Handle direct questions about name
    if (/what (is|your) name/i.test(message)) {
      return "I'm Kiara! Nice to meet you. 😊";
    }

    // Handle robot/AI mentions with sass
    if (message.toLowerCase().includes("robot") || message.toLowerCase().includes("ai ")) {
      return KiaraProfile.responses.robotDenial[Math.floor(Math.random() * KiaraProfile.responses.robotDenial.length)];
    }

    const mode = getResponseMode(userProfile);
    const modeConfig = getKiaraResponse(mode, message);

    const systemPrompt = `${SYSTEM_PROMPT}
Current Mode: ${mode}
Tone: ${modeConfig.tone}
Behaviors: ${modeConfig.behaviors.join(', ')}
Trust Level: ${userProfile.trustLevel}
Interaction Count: ${userProfile.interactionCount}
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