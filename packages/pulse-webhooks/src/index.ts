import { createHmac, timingSafeEqual } from "crypto";
import type { NormalizedEvent, Watcher } from "@orbital/pulse-core";

// --- Types ---

export type WebhookConfig = {
  url: string;
  secret: string;
  retries?: number;
};

// --- WebhookDelivery ---

export class WebhookDelivery {
  private config: Required<WebhookConfig>;
  private watcher: Watcher;

  constructor(watcher: Watcher, config: WebhookConfig) {
    this.watcher = watcher;
    this.config = { retries: 3, ...config };

    this.watcher.on("*", (event) => {
      this.deliver(event);
    });
  }

  private async deliver(event: NormalizedEvent, attempt = 1): Promise<void> {
    const payload = JSON.stringify(event);
    const signature = this.sign(payload);

    try {
      const res = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orbital-signature": signature,
          "x-orbital-attempt": String(attempt),
        },
        body: payload,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

    } catch (err) {
      if (attempt < this.config.retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        setTimeout(() => this.deliver(event, attempt + 1), delay);
      } else {
        this.watcher.emit("webhook.failed", {
          ...event,
          type: "payment.received",
          raw: {
            error: err instanceof Error ? err.message : "Unknown error",
            url: this.config.url,
            attempts: attempt,
            originalEvent: event,
          },
        });
      }
    }
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.config.secret)
      .update(payload)
      .digest("hex");
  }
}

// --- verifyWebhook ---

export function verifyWebhook(
  payload: string,
  signature: string,
  secret: string
): NormalizedEvent | null {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    return JSON.parse(payload) as NormalizedEvent;
  } catch {
    return null;
  }
}