export const MAX_RECEIPT_TEXT_LENGTH = 20_000;

type ReceiptInput = { ok: true; text: string } | { ok: false; error: string };

/** Validate untrusted input before making a paid model request. */
export function validateReceiptInput(body: unknown): ReceiptInput {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'A JSON object with receipt text is required' };
  }
  const text = (body as Record<string, unknown>).text;
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'Text must be a non-empty string' };
  }
  if (text.length > MAX_RECEIPT_TEXT_LENGTH) {
    return { ok: false, error: `Text must not exceed ${MAX_RECEIPT_TEXT_LENGTH} characters` };
  }
  return { ok: true, text: text.trim() };
}
