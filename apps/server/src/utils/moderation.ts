const BLOCKED_PATTERNS = [
  /\b(kill yourself|kys|self[- ]harm|suicide)\b/i,
  /\b(credit card|ssn|social security|home address|doxx)\b/i,
  /\b(slur|hate speech)\b/i,
];

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isContentSafe(input: string): { safe: boolean; reason?: string } {
  const cleaned = sanitizeText(input);
  if (cleaned.length < 2) {
    return { safe: false, reason: 'Content is too short.' };
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        safe: false,
        reason: 'This content violates CHAOS safety guidelines and cannot be submitted.',
      };
    }
  }
  return { safe: true };
}

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (timestamps.length >= this.maxRequests) {
      this.hits.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }
}
