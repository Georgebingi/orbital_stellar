import { EventEngine } from "@orbital/pulse-core";
import { WebhookDelivery } from "@orbital/pulse-webhooks";

// --- Types ---

export type WebhookRegistration = {
  address: string;
  url: string;
  secret: string;
  createdAt: string;
};

// --- Registry ---

export class WebhookRegistry {
  private registrations: Map<string, WebhookRegistration> = new Map();
  private engine: EventEngine;

  constructor(engine: EventEngine) {
    this.engine = engine;
  }

  register(address: string, url: string, secret: string): WebhookRegistration {
    // If already registered, return existing
    if (this.registrations.has(address)) {
      return this.registrations.get(address)!;
    }

    const registration: WebhookRegistration = {
      address,
      url,
      secret,
      createdAt: new Date().toISOString(),
    };

    // Subscribe to pulse-core
    const watcher = this.engine.subscribe(address);

    // Attach webhook delivery
    new WebhookDelivery(watcher, { url, secret });

    // Listen for delivery failures
    watcher.on("webhook.failed", (event) => {
      console.error(`[registry] Webhook delivery failed for ${address}:`, event.raw);
    });

    this.registrations.set(address, registration);
    console.log(`[registry] Registered ${address} → ${url}`);
    return registration;
  }

  unregister(address: string): boolean {
    if (!this.registrations.has(address)) return false;
    this.engine.unsubscribe(address);
    this.registrations.delete(address);
    console.log(`[registry] Unregistered ${address}`);
    return true;
  }

  list(): WebhookRegistration[] {
    return Array.from(this.registrations.values());
  }

  has(address: string): boolean {
    return this.registrations.has(address);
  }
}