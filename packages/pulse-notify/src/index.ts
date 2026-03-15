import { useState, useEffect } from "react";
import type { NormalizedEvent } from "@orbital/pulse-core";

// --- Types ---

export type UseEventConfig = {
  serverUrl: string;
  address: string;
  event?: string; // defaults to "*" — all events
};

export type EventState = {
  event: NormalizedEvent | null;
  connected: boolean;
  error: string | null;
};

// --- useStellarEvent ---
// Core hook — listens to any event on an address

export function useStellarEvent(config: UseEventConfig): EventState {
  const [state, setState] = useState<EventState>({
    event: null,
    connected: false,
    error: null,
  });

  useEffect(() => {
    const { serverUrl, address, event: eventType = "*" } = config;
    const url = `${serverUrl}/events/${address}`;

    const source = new EventSource(url);

    source.onopen = () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    };

    source.onmessage = (e) => {
      try {
        const incoming: NormalizedEvent = JSON.parse(e.data);

        // Filter by event type if specified
        if (eventType !== "*" && incoming.type !== eventType) return;

        setState((prev) => ({ ...prev, event: incoming }));
      } catch {
        setState((prev) => ({ ...prev, error: "Failed to parse event" }));
      }
    };

    source.onerror = () => {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "Connection lost — retrying...",
      }));
    };

    // Cleanup on unmount
    return () => {
      source.close();
    };
  }, [config.serverUrl, config.address, config.event]);

  return state;
}

// --- useStellarPayment ---
// Convenience hook — only listens to payment events

export function useStellarPayment(serverUrl: string, address: string) {
  return useStellarEvent({
    serverUrl,
    address,
    event: "payment.received",
  });
}

// --- useStellarActivity ---
// Convenience hook — listens to all events on an address

export function useStellarActivity(serverUrl: string, address: string) {
  return useStellarEvent({
    serverUrl,
    address,
    event: "*",
  });
}