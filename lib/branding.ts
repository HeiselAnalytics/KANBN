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

function normalizeName(value: string | undefined): string {
  const name = value?.trim();
  return name ? name.slice(0, 120) : DEFAULT_BRANDING.name;
}

function normalizeLogoUrl(value: string | undefined, fallback: string): string {
  const url = value?.trim();
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function getBrandingConfig(settings: { applicationName?: string; logoLightUrl?: string; logoDarkUrl?: string }): BrandingConfig {
  return {
    name: normalizeName(settings.applicationName),
    logoLightUrl: normalizeLogoUrl(settings.logoLightUrl, DEFAULT_BRANDING.logoLightUrl),
    logoDarkUrl: normalizeLogoUrl(settings.logoDarkUrl, DEFAULT_BRANDING.logoDarkUrl),
  };
}
