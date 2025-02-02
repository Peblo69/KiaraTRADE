
import { KiaraBehavior, determineMode, getResponse } from './kiara-behavior-config';
import { getUserProfile } from './user-profile-store';

export function handleCreatorTrigger(message: string): boolean {
  return message.includes(KiaraBehavior.creatorTriggerPhrase);
}

export function generateResponse(userId: string, userMessage: string): string {
  const isMasterActive = handleCreatorTrigger(userMessage);
  const userProfile = getUserProfile(userId);

  // Determine the response mode
  const currentMode = determineMode(userProfile, isMasterActive);

  // Get response configuration based on mode
  const responseConfig = getResponse(currentMode);

  // Select an appropriate response example
  if (currentMode === 'masterMode' && isMasterActive) {
    return KiaraBehavior.modes.masterMode.examples[
      Math.floor(Math.random() * KiaraBehavior.modes.masterMode.examples.length)
    ];
  }

  // Return a response from the current mode's examples
  return responseConfig.examples?.[
    Math.floor(Math.random() * responseConfig.examples.length)
  ] || "I understand. How can I assist you further?";
}
