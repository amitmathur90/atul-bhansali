const HASHTAG_PATTERN = /#([a-zA-Z0-9_]+)/g;

// Extracts unique hashtags from post content, lowercased for case-insensitive matching
// (so #CleanCity and #cleancity count as the same tag).
export function extractHashtags(content: string): string[] {
  const matches = content.matchAll(HASHTAG_PATTERN);
  const tags = new Set<string>();
  for (const m of matches) tags.add(m[1].toLowerCase());
  return Array.from(tags);
}
