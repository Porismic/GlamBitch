import { guilds, moderationLogs, botStats, giveaways, giveawayEntries, type Guild, type InsertGuild, type ModerationLog, type InsertModerationLog, type BotStats, type InsertBotStats, type Giveaway, type InsertGiveaway, type GiveawayEntry, type InsertGiveawayEntry } from "@shared/schema";

export interface IStorage {
  // Guild management
  getGuild(id: string): Promise<Guild | undefined>;
  createGuild(guild: InsertGuild): Promise<Guild>;
  updateGuild(id: string, updates: Partial<InsertGuild>): Promise<Guild | undefined>;
  
  // Moderation logs
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  getModerationLogs(guildId: string, limit?: number): Promise<ModerationLog[]>;
  
  // Bot statistics
  recordCommandUsage(stats: InsertBotStats): Promise<BotStats>;
  getCommandStats(guildId?: string): Promise<BotStats[]>;
  
  // Giveaways
  createGiveaway(giveaway: InsertGiveaway): Promise<Giveaway>;
  getGiveaway(id: number): Promise<Giveaway | undefined>;
  getGiveawayByMessageId(messageId: string): Promise<Giveaway | undefined>;
  updateGiveaway(id: number, updates: Partial<InsertGiveaway>): Promise<Giveaway | undefined>;
  getActiveGiveaways(guildId?: string): Promise<Giveaway[]>;
  getAllGiveaways(guildId: string): Promise<Giveaway[]>;
  
  // Giveaway entries
  createGiveawayEntry(entry: InsertGiveawayEntry): Promise<GiveawayEntry>;
  getGiveawayEntry(giveawayId: number, userId: string): Promise<GiveawayEntry | undefined>;
  updateGiveawayEntry(giveawayId: number, userId: string, entries: number): Promise<GiveawayEntry | undefined>;
  getGiveawayEntries(giveawayId: number): Promise<GiveawayEntry[]>;
  getGiveawayParticipantCount(giveawayId: number): Promise<number>;
  removeGiveawayEntry(giveawayId: number, userId: string): Promise<boolean>;

  // User levels and experience
  getUserLevel(userId: string, guildId: string): Promise<any>;
  createUserLevel(insertUserLevel: any): Promise<any>;
  updateUserLevel(userId: string, guildId: string, updates: any): Promise<any>;
  getLevelLeaderboard(guildId: string, period: string, limit: number): Promise<any[]>;

  // Message tracking
  recordMessage(userId: string, guildId: string): Promise<void>;
  getMessageCount(userId: string, guildId: string, period: string): Promise<number>;
  getMessageLeaderboard(guildId: string, period: string, limit: number): Promise<any[]>;

  // Server boost tracking
  recordBoost(userId: string, guildId: string): Promise<any>;
  removeBoost(userId: string, guildId: string): Promise<void>;
  getActiveBoosts(guildId: string): Promise<any[]>;
  getTotalBoostCount(guildId: string): Promise<number>;

  // Guild configuration
  getGuildConfig(guildId: string): Promise<any>;
  createGuildConfig(insertConfig: any): Promise<any>;
  updateGuildConfig(guildId: string, updates: any): Promise<any>;
  addLevelRoleConfig(guildId: string, level: number, roleId: string): Promise<void>;
  addMessageRoleConfig(guildId: string, messageCount: number, roleId: string): Promise<void>;
  getRoleConfigs(guildId: string): Promise<{ levelRoles: any[], messageRoles: any[] }>;

  // Giveaway winners
  addGiveawayWinner(insertWinner: any): Promise<any>;
  getGiveawayWinners(giveawayId: number): Promise<any[]>;
  markWinnerAsRerolled(winnerId: number): Promise<void>;

  // Check giveaway requirements
  checkGiveawayRequirements(userId: string, guildId: string): Promise<{ meetsRequirements: boolean, reason?: string }>;
}

export class MemStorage implements IStorage {
  private guilds: Map<string, Guild>;
  private moderationLogs: Map<number, ModerationLog>;
  private botStats: Map<number, BotStats>;
  private giveaways: Map<number, Giveaway>;
  private giveawayEntries: Map<string, GiveawayEntry>; // key: `${giveawayId}-${userId}`
  private currentLogId: number;
  private currentStatsId: number;
  private currentGiveawayId: number;

  constructor() {
    this.guilds = new Map();
    this.moderationLogs = new Map();
    this.botStats = new Map();
    this.giveaways = new Map();
    this.giveawayEntries = new Map();
    this.currentLogId = 1;
    this.currentStatsId = 1;
    this.currentGiveawayId = 1;
  }

  async getGuild(id: string): Promise<Guild | undefined> {
    return this.guilds.get(id);
  }

  async createGuild(insertGuild: InsertGuild): Promise<Guild> {
    const guild: Guild = {
      ...insertGuild,
      joinedAt: new Date(),
    };
    this.guilds.set(guild.id, guild);
    return guild;
  }

  async updateGuild(id: string, updates: Partial<InsertGuild>): Promise<Guild | undefined> {
    const guild = this.guilds.get(id);
    if (!guild) return undefined;
    
    const updatedGuild = { ...guild, ...updates };
    this.guilds.set(id, updatedGuild);
    return updatedGuild;
  }

  async createModerationLog(insertLog: InsertModerationLog): Promise<ModerationLog> {
    const id = this.currentLogId++;
    const log: ModerationLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.moderationLogs.set(id, log);
    return log;
  }

  async getModerationLogs(guildId: string, limit = 50): Promise<ModerationLog[]> {
    return Array.from(this.moderationLogs.values())
      .filter(log => log.guildId === guildId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async recordCommandUsage(insertStats: InsertBotStats): Promise<BotStats> {
    const id = this.currentStatsId++;
    const stats: BotStats = {
      ...insertStats,
      id,
      timestamp: new Date(),
    };
    this.botStats.set(id, stats);
    return stats;
  }

  async getCommandStats(guildId?: string): Promise<BotStats[]> {
    const allStats = Array.from(this.botStats.values());
    if (guildId) {
      return allStats.filter(stat => stat.guildId === guildId);
    }
    return allStats;
  }

  // Giveaway methods
  async createGiveaway(insertGiveaway: InsertGiveaway): Promise<Giveaway> {
    const id = this.currentGiveawayId++;
    const giveaway: Giveaway = {
      ...insertGiveaway,
      id,
      createdAt: new Date(),
    };
    this.giveaways.set(id, giveaway);
    return giveaway;
  }

  async getGiveaway(id: number): Promise<Giveaway | undefined> {
    return this.giveaways.get(id);
  }

  async getGiveawayByMessageId(messageId: string): Promise<Giveaway | undefined> {
    return Array.from(this.giveaways.values()).find(g => g.messageId === messageId);
  }

  async updateGiveaway(id: number, updates: Partial<InsertGiveaway>): Promise<Giveaway | undefined> {
    const giveaway = this.giveaways.get(id);
    if (!giveaway) return undefined;
    
    const updatedGiveaway = { ...giveaway, ...updates };
    this.giveaways.set(id, updatedGiveaway);
    return updatedGiveaway;
  }

  async getActiveGiveaways(guildId?: string): Promise<Giveaway[]> {
    const now = new Date();
    return Array.from(this.giveaways.values())
      .filter(g => {
        const isActive = g.isActive && g.endTime > now;
        return guildId ? isActive && g.guildId === guildId : isActive;
      });
  }

  async getAllGiveaways(guildId: string): Promise<Giveaway[]> {
    return Array.from(this.giveaways.values())
      .filter(g => g.guildId === guildId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  // Giveaway entry methods
  async createGiveawayEntry(insertEntry: InsertGiveawayEntry): Promise<GiveawayEntry> {
    const key = `${insertEntry.giveawayId}-${insertEntry.userId}`;
    const entry: GiveawayEntry = {
      ...insertEntry,
      id: parseInt(key.replace('-', '')), // Simple ID generation
      joinedAt: new Date(),
    };
    this.giveawayEntries.set(key, entry);
    return entry;
  }

  async getGiveawayEntry(giveawayId: number, userId: string): Promise<GiveawayEntry | undefined> {
    const key = `${giveawayId}-${userId}`;
    return this.giveawayEntries.get(key);
  }

  async updateGiveawayEntry(giveawayId: number, userId: string, entries: number): Promise<GiveawayEntry | undefined> {
    const key = `${giveawayId}-${userId}`;
    const entry = this.giveawayEntries.get(key);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, entries };
    this.giveawayEntries.set(key, updatedEntry);
    return updatedEntry;
  }

  async getGiveawayEntries(giveawayId: number): Promise<GiveawayEntry[]> {
    return Array.from(this.giveawayEntries.values())
      .filter(entry => entry.giveawayId === giveawayId)
      .sort((a, b) => a.joinedAt!.getTime() - b.joinedAt!.getTime());
  }

  async getGiveawayParticipantCount(giveawayId: number): Promise<number> {
    return Array.from(this.giveawayEntries.values())
      .filter(entry => entry.giveawayId === giveawayId).length;
  }

  async removeGiveawayEntry(giveawayId: number, userId: string): Promise<boolean> {
    const key = `${giveawayId}-${userId}`;
    return this.giveawayEntries.delete(key);
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();
