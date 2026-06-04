import { describe, expect, it } from "vitest";
import { isValidKraPin, kraPinValidationMessage, normalizeKraPin } from "./kraPin";

describe("kraPin", () => {
  it("normalizes to uppercase without spaces", () => {
    expect(normalizeKraPin(" p051234567x ")).toBe("P051234567X");
  });

  it("accepts standard company PIN format", () => {
    expect(isValidKraPin("P051234567X")).toBe(true);
    expect(kraPinValidationMessage("P051234567X")).toBeNull();
  });

  it("rejects short or malformed PINs", () => {
    expect(isValidKraPin("P05123456")).toBe(false);
    expect(kraPinValidationMessage("")).toMatch(/required/i);
  });
});
