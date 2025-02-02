import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  mood: 'happy' | 'neutral' | 'angry';
  trustLevel: number;
  interactionCount: number;
  lastInteraction: Date;
  preferences: {
    topics: string[];
    tradingStyle?: string;
    riskTolerance?: 'low' | 'medium' | 'high';
  };
}

interface UserProfileState {
  profiles: Record<string, UserProfile>;
  currentProfile: UserProfile | null;
  updateProfile: (sessionId: string, updates: Partial<UserProfile>) => void;
  getOrCreateProfile: (sessionId: string) => UserProfile;
  updateMood: (sessionId: string, message: string) => void;
}

const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      currentProfile: null,

      updateProfile: (sessionId, updates) => {
        set((state) => ({
          profiles: {
            ...state.profiles,
            [sessionId]: {
              ...state.profiles[sessionId],
              ...updates,
              lastInteraction: new Date(),
            },
          },
        }));
      },

      getOrCreateProfile: (sessionId) => {
        const state = get();
        if (state.profiles[sessionId]) {
          return state.profiles[sessionId];
        }

        const newProfile: UserProfile = {
          id: sessionId,
          mood: 'neutral',
          trustLevel: 0,
          interactionCount: 0,
          lastInteraction: new Date(),
          preferences: {
            topics: [],
          },
        };

        set((state) => ({
          profiles: {
            ...state.profiles,
            [sessionId]: newProfile,
          },
        }));

        return newProfile;
      },

      updateMood: (sessionId, message) => {
        // Simple sentiment analysis based on keywords
        const happyKeywords = ['thanks', 'great', 'awesome', 'good', 'love', '🚀', '😊'];
        const angryKeywords = ['bad', 'terrible', 'hate', 'wrong', 'stupid', '😠', '😡'];

        const lowerMessage = message.toLowerCase();
        let newMood: UserProfile['mood'] = 'neutral';

        if (happyKeywords.some(keyword => lowerMessage.includes(keyword))) {
          newMood = 'happy';
        } else if (angryKeywords.some(keyword => lowerMessage.includes(keyword))) {
          newMood = 'angry';
        }

        const profile = get().profiles[sessionId];
        if (profile) {
          set((state) => ({
            profiles: {
              ...state.profiles,
              [sessionId]: {
                ...profile,
                mood: newMood,
                interactionCount: profile.interactionCount + 1,
                trustLevel: Math.min(100, profile.trustLevel + 1),
                lastInteraction: new Date(),
              },
            },
          }));
        }
      },
    }),
    {
      name: 'kiara-user-profiles',
    }
  )
);

export default useUserProfileStore;