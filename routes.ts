import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "../bot/utils/logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Bot statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getCommandStats();
      const commandCounts: Record<string, number> = {};
      
      stats.forEach(stat => {
        commandCounts[stat.commandName] = (commandCounts[stat.commandName] || 0) + 1;
      });
      
      res.json({
        totalCommands: stats.length,
        commandBreakdown: commandCounts,
        guilds: Array.from((global as any).botClient?.guilds.cache.size || 0),
      });
    } catch (error) {
      logger.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Guild management endpoints
  app.get("/api/guilds/:id", async (req, res) => {
    try {
      const guild = await storage.getGuild(req.params.id);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      res.json(guild);
    } catch (error) {
      logger.error("Error fetching guild:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Moderation logs endpoint
  app.get("/api/guilds/:id/moderation-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getModerationLogs(req.params.id, limit);
      res.json(logs);
    } catch (error) {
      logger.error("Error fetching moderation logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
