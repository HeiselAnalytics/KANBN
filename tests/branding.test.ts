import { describe, expect, it } from "vitest";

import { DEFAULT_BRANDING, getBrandingConfig } from "@/lib/branding";

describe("branding configuration", () => {
  it("uses the bundled branding by default", () => {
    expect(getBrandingConfig({})).toEqual(DEFAULT_BRANDING);
  });

  it("accepts local and remote operator-provided logos", () => {
    expect(getBrandingConfig({
      KANBN_BRAND_NAME: "  Example Company  ",
      KANBN_BRAND_LOGO_LIGHT: "/branding/logo-light.svg",
      KANBN_BRAND_LOGO_DARK: "https://cdn.example.com/logo-dark.png",
    })).toEqual({
      name: "Example Company",
      logoLightUrl: "/branding/logo-light.svg",
      logoDarkUrl: "https://cdn.example.com/logo-dark.png",
    });
  });

  it("rejects unsupported logo URL schemes", () => {
    const branding = getBrandingConfig({
      KANBN_BRAND_LOGO_LIGHT: "javascript:alert(1)",
      KANBN_BRAND_LOGO_DARK: "//untrusted.example/logo.png",
    });
    expect(branding.logoLightUrl).toBe(DEFAULT_BRANDING.logoLightUrl);
    expect(branding.logoDarkUrl).toBe(DEFAULT_BRANDING.logoDarkUrl);
  });
});
