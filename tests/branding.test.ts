import { describe, expect, it } from "vitest";

import { DEFAULT_BRANDING, getBrandingConfig } from "@/lib/branding";

describe("branding configuration", () => {
  it("uses the bundled branding by default", () => {
    expect(getBrandingConfig({ applicationName: "Heisel Analytics" })).toEqual(DEFAULT_BRANDING);
  });

  it("accepts external logos saved in settings", () => {
    expect(getBrandingConfig({
      applicationName: "  Example Company  ",
      logoLightUrl: "https://cdn.example.com/logo-light.svg",
      logoDarkUrl: "https://cdn.example.com/logo-dark.png",
    })).toEqual({
      name: "Example Company",
      logoLightUrl: "https://cdn.example.com/logo-light.svg",
      logoDarkUrl: "https://cdn.example.com/logo-dark.png",
    });
  });

  it("rejects unsupported logo URL schemes", () => {
    const branding = getBrandingConfig({
      logoLightUrl: "javascript:alert(1)",
      logoDarkUrl: "//untrusted.example/logo.png",
    });
    expect(branding.logoLightUrl).toBe(DEFAULT_BRANDING.logoLightUrl);
    expect(branding.logoDarkUrl).toBe(DEFAULT_BRANDING.logoDarkUrl);
  });
});
