import { describe, expect, it } from "vitest";

import { cardUpdateSchema, createBoardSchema } from "@/lib/validation/schemas";

describe("input validation", () => {
  it("trims valid board names", () => {
    expect(createBoardSchema.parse({ name: "  Development  " }).name).toBe("Development");
    expect(createBoardSchema.parse({ name: "Campaigns", templatePublicId: "default" }).templatePublicId).toBe("default");
  });

  it("rejects invalid public IDs and due dates", () => {
    expect(() => cardUpdateSchema.parse({ publicId: "17", title: "Card", description: "", dueDate: "tomorrow" })).toThrow();
  });
});
