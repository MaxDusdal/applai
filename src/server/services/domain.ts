import { env } from "@/env";

const DOMAIN_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

const COMPANY_SUFFIXES = [
  " incorporated",
  " inc.",
  " inc",
  " ltd.",
  " ltd",
  " llc",
  " l.l.c.",
  " corp.",
  " corp",
  " corporation",
  " gmbh",
  " ag",
  " s.a.",
  " sa",
  " b.v.",
  " bv",
  " co.",
  " co",
  " company",
];

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

function slugifyCompany(company: string): string | null {
  let name = company.toLowerCase().trim();
  for (const suffix of COMPANY_SUFFIXES) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim();
      break;
    }
  }
  const slug = name.replace(/[^a-z0-9]/g, "");
  if (slug.length < 3) return null;
  return `${slug}.com`;
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

  return slugifyCompany(company);
}
