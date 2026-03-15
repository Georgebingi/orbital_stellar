import express from "express";
import { EventEngine } from "@orbital/pulse-core";
import { WebhookRegistry } from "./registry.js";
import { createRoutes } from "./routes.js";

const PORT = process.env.PORT || 3000;
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";

// Boot the event engine
const engine = new EventEngine({ network: NETWORK });
engine.start();
console.log(`[server] Event engine started on ${NETWORK}`);

// Boot the registry
const registry = new WebhookRegistry(engine);

// Boot Express
const app = express();
app.use(express.json());
app.use(createRoutes(registry));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", network: NETWORK });
});

app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
});