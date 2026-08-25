export interface BrandingConfig {
  name: string;
  logoLightUrl: string;
  logoDarkUrl: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  name: "Heisel Analytics",
  logoLightUrl: "/assets/heisel-analytics-logo-on-light.png",
  logoDarkUrl: "/assets/heisel-analytics-logo-on-dark.png",
};

type BrandingEnvironment = Readonly<Record<string, string | undefined>>;

function normalizeName(value: string | undefined): string {
  const name = value?.trim();
  return name ? name.slice(0, 120) : DEFAULT_BRANDING.name;
}

function normalizeLogoUrl(value: string | undefined, fallback: string): string {
  const url = value?.trim();
  if (!url) return fallback;
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function getBrandingConfig(environment: BrandingEnvironment = process.env): BrandingConfig {
  return {
    name: normalizeName(environment.KANBN_BRAND_NAME),
    logoLightUrl: normalizeLogoUrl(environment.KANBN_BRAND_LOGO_LIGHT, DEFAULT_BRANDING.logoLightUrl),
    logoDarkUrl: normalizeLogoUrl(environment.KANBN_BRAND_LOGO_DARK, DEFAULT_BRANDING.logoDarkUrl),
  };
}
