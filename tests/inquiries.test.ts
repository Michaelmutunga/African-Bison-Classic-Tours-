import { describe, expect, it } from "vitest";
import { inquiryReference, inquirySchema } from "@/lib/inquiries";

const valid = {
  name: "Amina Yusuf",
  email: "amina@example.com",
  message: "Two adults, 9 days, Mara and Serengeti in August.",
};

describe("inquiry validation", () => {
  it("accepts a complete enquiry", () => {
    expect(inquirySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts minimal optional fields", () => {
    expect(
      inquirySchema.safeParse({ ...valid, phone: "", country: "", company: "" }).success,
    ).toBe(true);
  });

  it("rejects bad email, short name and short message", () => {
    const result = inquirySchema.safeParse({ name: "A", email: "nope", message: "hi" });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const result = inquirySchema.safeParse({ ...valid, company: "seo-services" });
    expect(result.success).toBe(false);
  });
});

describe("inquiry reference", () => {
  it("matches INQ-YYYY-XXXXXX and varies", () => {
    const refs = new Set([inquiryReference(), inquiryReference(), inquiryReference()]);
    expect(refs.size).toBe(3);
    for (const ref of refs) {
      expect(ref).toMatch(/^INQ-\d{4}-[A-Z2-9]{6}$/);
    }
  });
});
