import { Router } from "express";
import type { WebhookRegistry } from "./registry.js";

export function createRoutes(registry: WebhookRegistry): Router {
  const router = Router();

  // Register a webhook
  router.post("/webhooks/register", (req, res) => {
    const { address, url, secret } = req.body;

    if (!address || !url || !secret) {
      res.status(400).json({
        error: "address, url and secret are required",
      });
      return;
    }

    if (registry.has(address)) {
      res.status(409).json({
        error: "Address already registered",
      });
      return;
    }

    const registration = registry.register(address, url, secret);
    res.status(201).json(registration);
  });

  // Unregister a webhook
  router.delete("/webhooks/:address", (req, res) => {
    const { address } = req.params;
    const removed = registry.unregister(address);

    if (!removed) {
      res.status(404).json({ error: "Address not registered" });
      return;
    }

    res.status(200).json({ message: `Unregistered ${address}` });
  });

  // List all registrations
  router.get("/webhooks", (_req, res) => {
    res.status(200).json(registry.list());
  });

  return router;
}