/** Accept the raw QR payload or the grouped claim code printed on a cash receipt. */
export function extractReceiptToken(raw: string): string {
  let value = raw.trim();
  if (/^CLAIM CODE:/i.test(value)) value = value.slice("CLAIM CODE:".length).trim();
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      const parsed = JSON.parse(value);
      const token = parsed.qr_token ?? parsed.token ?? parsed.receipt_token ?? parsed.code;
      if (typeof token === "string") return token.trim();
    } catch { /* Keep the original text for the API error. */ }
  }
  if (/(?:qr_token|receipt_token|token|code)=/.test(value)) {
    try {
      const url = new URL(value);
      const token = url.searchParams.get("qr_token") ?? url.searchParams.get("token")
        ?? url.searchParams.get("code") ?? url.searchParams.get("receipt_token");
      if (token) return token.trim();
    } catch {
      const match = value.match(/(?:qr_token|receipt_token|token|code)=([a-zA-Z0-9_-]+)/);
      if (match?.[1]) return match[1];
    }
  }
  return value.replace(/\s+/g, "");
}
