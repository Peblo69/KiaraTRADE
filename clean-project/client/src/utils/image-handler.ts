
export async function loadTokenImage(uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const data = await response.json();
    return data.image || null;
  } catch {
    return null;
  }
}
