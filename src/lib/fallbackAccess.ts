export type FallbackUrlLike = {
  id: string;
  url: string;
  allowed_countries: string[];
  display_order: number;
};

const normalize = (v: string) => v.toLowerCase().trim();

export const isWorldwideCountryToken = (token: string) => {
  const t = normalize(token);
  return t === "worldwide" || t === "all";
};

export const isAllowedForCountry = (
  allowedCountries: string[] | null | undefined,
  userCountry: string
): boolean => {
  // No restrictions -> treat as worldwide
  if (!allowedCountries || allowedCountries.length === 0) return true;

  const u = normalize(userCountry);
  if (!u) return false;

  return allowedCountries.some((c) => {
    const a = normalize(c);
    if (isWorldwideCountryToken(a)) return true;
    // Exact match only (prevents Austria matching Australia, etc.)
    return a === u;
  });
};

export const getNextAllowedFallback = (
  fallbackUrls: FallbackUrlLike[],
  userCountry: string,
  lastIndex: number
): { next: FallbackUrlLike | null; nextIndex: number } => {
  if (!fallbackUrls.length) return { next: null, nextIndex: -1 };

  const ordered = [...fallbackUrls].sort((a, b) => a.display_order - b.display_order);
  const start = Math.max(-1, Math.min(lastIndex, ordered.length - 1));

  // scan forward (including wrap) to find first allowed URL
  for (let step = 1; step <= ordered.length; step++) {
    const idx = (start + step) % ordered.length;
    const candidate = ordered[idx];
    if (isAllowedForCountry(candidate.allowed_countries, userCountry)) {
      return { next: candidate, nextIndex: idx };
    }
  }

  return { next: null, nextIndex: -1 };
};
