// Lenient JSON extraction: models occasionally wrap JSON in prose or code fences.
export function parseJsonObject(text) {
  if (text && typeof text === 'object') return text;
  if (typeof text !== 'string') return null;

  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    // fall through
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      const parsed = JSON.parse(trimmed.slice(first, last + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}
