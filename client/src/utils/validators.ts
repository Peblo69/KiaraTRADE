export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url?: string): string => {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return '#';
  }
};
