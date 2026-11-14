/** KSh 1,500 */
export function kes(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * The same shapes the server accepts (see the API's @utils/phone): 0712…,
 * 0112…, +254 712…, 254712…, 712… Returns 2547XXXXXXXX / 2541XXXXXXXX or null.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().+]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  let candidate = digits;
  if (candidate.startsWith("00")) candidate = candidate.slice(2);
  else if (candidate.startsWith("0")) candidate = `254${candidate.slice(1)}`;
  else if (candidate.length === 9) candidate = `254${candidate}`;
  return /^254(?:7|1)\d{8}$/.test(candidate) ? candidate : null;
}

/** 254712345678 → 0712 345 678 */
export function localPhone(canonical: string): string {
  const local = `0${canonical.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** As the seller types: 0712345678 → 0712 345 678 (anything else left alone). */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("0") || digits.length > 10) return value;
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)].filter(Boolean).join(" ");
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysLeft(endsAt: string | Date): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / DAY_MS));
}

/** "Fri 28 Nov" */
export function shortDay(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

/** "14 Nov 2026, 15:30" */
export function dateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
