import { env } from "@/env";

const DOMAIN_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

function normalizeDomain(input: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    const stripped = host.startsWith("www.") ? host.slice(4) : host;
    return DOMAIN_REGEX.test(stripped) ? stripped : null;
  } catch {
    return null;
  }
}

async function brandSearch(company: string): Promise<string | null> {
  if (!env.LOGO_DEV_SECRET_KEY) return null;
  try {
    const url = `https://api.logo.dev/search?q=${encodeURIComponent(company)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.LOGO_DEV_SECRET_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ name: string; domain: string }>;
    for (const item of data) {
      if (item?.domain && DOMAIN_REGEX.test(item.domain)) {
        return item.domain.toLowerCase();
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveCompanyDomain(
  company: string,
  aiExtractedDomain?: string | null,
): Promise<string | null> {
  if (aiExtractedDomain) {
    const fromAi = normalizeDomain(aiExtractedDomain);
    if (fromAi) return fromAi;
  }

  const fromSearch = await brandSearch(company);
  if (fromSearch) return fromSearch;

  return null;
}
