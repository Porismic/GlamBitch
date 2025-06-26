import express from "express";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import { logger } from "../bot/utils/logger";
import { loadCommands } from "../bot/commands";
import { setupEvents } from "../bot/events";
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

const app = express();
app.use(express.json());

// Initialize Discord bot
async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
    ],
  });

  // Add commands collection to client
  (client as any).commands = new Collection();
  
  // Make client globally available for stats
  (global as any).botClient = client;

  // Load commands and events
  await loadCommands(client);
  setupEvents(client);

  // Login to Discord
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error("DISCORD_TOKEN environment variable is required");
    process.exit(1);
  }

  await client.login(token);
}

// Start the web server
async function startServer() {
  const port = parseInt(process.env.PORT || "5000");
  
  // Register API routes
  const server = await registerRoutes(app);
  
  // Setup Vite for development
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }
  
  server.listen(port, "0.0.0.0", () => {
    logger.info(`Web dashboard running on port ${port}`);
  });
  
  return server;
}

Promise.all([startBot(), startServer()]).catch(error => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});
