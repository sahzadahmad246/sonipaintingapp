import { randomBytes } from "crypto";
import sanitizeHtml from "sanitize-html";

// Define a type for sanitized output to handle recursive structures
type SanitizedInput = string | SanitizedInput[] | { [key: string]: SanitizedInput } | null | undefined | number | boolean;

export function generateAccessToken() {
  return randomBytes(16).toString("hex");
}

export function sanitizeInput(input: unknown): SanitizedInput {
  if (typeof input === "string") {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: { [key: string]: SanitizedInput } = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key as keyof typeof input]);
    }
    return sanitized;
  }
  return input as SanitizedInput; // Handle null, undefined, numbers, booleans, etc.
}
