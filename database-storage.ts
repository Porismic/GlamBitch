import { 
  guilds, moderationLogs, botStats, giveaways, giveawayEntries,
  userLevels, messageStats, serverBoosts, guildConfigs, giveawayWinners,
  type Guild, type ModerationLog, type BotStats, 
  type Giveaway, type GiveawayEntry, type UserLevel, type MessageStats,
  type ServerBoost, type GuildConfig, type GiveawayWinner,
  type InsertGuild, type InsertModerationLog, type InsertBotStats,
  type InsertGiveaway, type InsertGiveawayEntry, type InsertUserLevel,
  type InsertMessageStats, type InsertServerBoost, type InsertGuildConfig,
  type InsertGiveawayWinner
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, lte, and, or, sql, sum, count } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Guild management
  async getGuild(id: string): Promise<Guild | undefined> {
    const [guild] = await db.select().from(guilds).where(eq(guilds.id, id));
    return guild;
  }

  async createGuild(insertGuild: InsertGuild): Promise<Guild> {
    const [guild] = await db.insert(guilds).values({
      ...insertGuild,
      prefix: insertGuild.prefix || "!",
      moderationEnabled: insertGuild.moderationEnabled ?? true,
    }).returning();
    return guild;
  }

  async updateGuild(id: string, updates: Partial<InsertGuild>): Promise<Guild | undefined> {
    const [guild] = await db.update(guilds).set(updates).where(eq(guilds.id, id)).returning();
    return guild;
  }

  // Moderation logs
  async createModerationLog(insertLog: InsertModerationLog): Promise<ModerationLog> {
    const [log] = await db.insert(moderationLogs).values({
      ...insertLog,
      reason: insertLog.reason || null,
    }).returning();
    return log;
  }

  async getModerationLogs(guildId: string, limit = 50): Promise<ModerationLog[]> {
    return await db.select().from(moderationLogs)
      .where(eq(moderationLogs.guildId, guildId))
      .orderBy(desc(moderationLogs.timestamp))
      .limit(limit);
  }

  // Bot statistics
  async recordCommandUsage(insertStats: InsertBotStats): Promise<BotStats> {
    const [stats] = await db.insert(botStats).values({
      ...insertStats,
      guildId: insertStats.guildId || null,
    }).returning();
    return stats;
  }

  async getCommandStats(guildId?: string): Promise<BotStats[]> {
    if (guildId) {
      return await db.select().from(botStats).where(eq(botStats.guildId, guildId));
    }
    return await db.select().from(botStats);
  }

  // Giveaways
  async createGiveaway(insertGiveaway: InsertGiveaway): Promise<Giveaway> {
    const [giveaway] = await db.insert(giveaways).values({
      ...insertGiveaway,
      description: insertGiveaway.description || null,
      winnerCount: insertGiveaway.winnerCount || 1,
      embedColor: insertGiveaway.embedColor || "#00AE86",
      buttonEmoji: insertGiveaway.buttonEmoji || "🎉",
      buttonText: insertGiveaway.buttonText || "Enter Giveaway",
      requiredRoles: insertGiveaway.requiredRoles || [],
      bonusRoles: insertGiveaway.bonusRoles || [],
      bonusEntries: insertGiveaway.bonusEntries || 1,
      winnerMessage: insertGiveaway.winnerMessage || "Congratulations {winner}! You won **{prize}**!",
      isActive: insertGiveaway.isActive ?? true,
    }).returning();
    return giveaway;
  }

  async getGiveaway(id: number): Promise<Giveaway | undefined> {
    const [giveaway] = await db.select().from(giveaways).where(eq(giveaways.id, id));
    return giveaway;
  }

  async getGiveawayByMessageId(messageId: string): Promise<Giveaway | undefined> {
    const [giveaway] = await db.select().from(giveaways).where(eq(giveaways.messageId, messageId));
    return giveaway;
  }

  async updateGiveaway(id: number, updates: Partial<InsertGiveaway>): Promise<Giveaway | undefined> {
    const [giveaway] = await db.update(giveaways).set(updates).where(eq(giveaways.id, id)).returning();
    return giveaway;
  }

  async getActiveGiveaways(guildId?: string): Promise<Giveaway[]> {
    const query = db.select().from(giveaways).where(eq(giveaways.isActive, true));
    if (guildId) {
      return await query.where(and(eq(giveaways.isActive, true), eq(giveaways.guildId, guildId)));
    }
    return await query;
  }

  async getAllGiveaways(guildId: string): Promise<Giveaway[]> {
    return await db.select().from(giveaways)
      .where(eq(giveaways.guildId, guildId))
      .orderBy(desc(giveaways.createdAt));
  }

  // Giveaway entries
  async createGiveawayEntry(insertEntry: InsertGiveawayEntry): Promise<GiveawayEntry> {
    const [entry] = await db.insert(giveawayEntries).values({
      ...insertEntry,
      entries: insertEntry.entries || 1,
    }).returning();
    return entry;
  }

  async getGiveawayEntry(giveawayId: number, userId: string): Promise<GiveawayEntry | undefined> {
    const [entry] = await db.select().from(giveawayEntries)
      .where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId)));
    return entry;
  }

  async updateGiveawayEntry(giveawayId: number, userId: string, entries: number): Promise<GiveawayEntry | undefined> {
    const [entry] = await db.update(giveawayEntries)
      .set({ entries })
      .where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId)))
      .returning();
    return entry;
  }

  async getGiveawayEntries(giveawayId: number): Promise<GiveawayEntry[]> {
    return await db.select().from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
  }

  async getGiveawayParticipantCount(giveawayId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(giveawayEntries)
      .where(eq(giveawayEntries.giveawayId, giveawayId));
    return result.count;
  }

  async removeGiveawayEntry(giveawayId: number, userId: string): Promise<boolean> {
    const result = await db.delete(giveawayEntries)
      .where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId)));
    return result.rowCount > 0;
  }

  // User levels and experience
  async getUserLevel(userId: string, guildId: string): Promise<UserLevel | undefined> {
    const [userLevel] = await db.select().from(userLevels)
      .where(and(eq(userLevels.userId, userId), eq(userLevels.guildId, guildId)));
    return userLevel;
  }

  async createUserLevel(insertUserLevel: InsertUserLevel): Promise<UserLevel> {
    const [userLevel] = await db.insert(userLevels).values(insertUserLevel).returning();
    return userLevel;
  }

  async updateUserLevel(userId: string, guildId: string, updates: Partial<InsertUserLevel>): Promise<UserLevel | undefined> {
    const [userLevel] = await db.update(userLevels)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(userLevels.userId, userId), eq(userLevels.guildId, guildId)))
      .returning();
    return userLevel;
  }

  async getLevelLeaderboard(guildId: string, period: string, limit: number): Promise<UserLevel[]> {
    let query = db.select().from(userLevels).where(eq(userLevels.guildId, guildId));
    
    if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.where(and(eq(userLevels.guildId, guildId), gte(userLevels.updatedAt, monthAgo)));
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.where(and(eq(userLevels.guildId, guildId), gte(userLevels.updatedAt, weekAgo)));
    }

    return await query.orderBy(desc(userLevels.level), desc(userLevels.experience)).limit(limit);
  }

  // Message tracking
  async recordMessage(userId: string, guildId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Update or create daily message stat
    const [existing] = await db.select().from(messageStats)
      .where(and(eq(messageStats.userId, userId), eq(messageStats.guildId, guildId), eq(messageStats.date, today)));

    if (existing) {
      await db.update(messageStats)
        .set({ messageCount: existing.messageCount + 1 })
        .where(eq(messageStats.id, existing.id));
    } else {
      await db.insert(messageStats).values({
        userId,
        guildId,
        date: today,
        messageCount: 1
      });
    }

    // Update user level
    let userLevel = await this.getUserLevel(userId, guildId);
    if (!userLevel) {
      userLevel = await this.createUserLevel({
        userId,
        guildId,
        level: 1,
        experience: 0,
        totalMessages: 1
      });
    } else {
      const newExperience = userLevel.experience + Math.floor(Math.random() * 15) + 10; // 10-25 XP per message
      const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
      
      await this.updateUserLevel(userId, guildId, {
        experience: newExperience,
        level: newLevel,
        totalMessages: userLevel.totalMessages + 1,
        lastMessageTime: new Date()
      });
    }
  }

  async getMessageCount(userId: string, guildId: string, period: string): Promise<number> {
    let startDate = new Date();
    
    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const [result] = await db.select({ total: sum(messageStats.messageCount) })
      .from(messageStats)
      .where(and(
        eq(messageStats.userId, userId),
        eq(messageStats.guildId, guildId),
        gte(messageStats.date, startDate.toISOString().split('T')[0])
      ));

    return Number(result.total) || 0;
  }

  async getMessageLeaderboard(guildId: string, period: string, limit: number): Promise<any[]> {
    if (period === "all") {
      return await db.select().from(userLevels)
        .where(eq(userLevels.guildId, guildId))
        .orderBy(desc(userLevels.totalMessages))
        .limit(limit);
    }

    let startDate = new Date();
    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    return await db.select({
      userId: messageStats.userId,
      messageCount: sum(messageStats.messageCount)
    })
    .from(messageStats)
    .where(and(
      eq(messageStats.guildId, guildId),
      gte(messageStats.date, startDate.toISOString().split('T')[0])
    ))
    .groupBy(messageStats.userId)
    .orderBy(desc(sum(messageStats.messageCount)))
    .limit(limit);
  }

  // Server boost tracking
  async recordBoost(userId: string, guildId: string): Promise<ServerBoost> {
    const [boost] = await db.insert(serverBoosts).values({
      userId,
      guildId,
      boostStarted: new Date(),
      isActive: true
    }).returning();
    return boost;
  }

  async removeBoost(userId: string, guildId: string): Promise<void> {
    await db.update(serverBoosts)
      .set({ boostEnded: new Date(), isActive: false })
      .where(and(eq(serverBoosts.userId, userId), eq(serverBoosts.guildId, guildId), eq(serverBoosts.isActive, true)));
  }

  async getActiveBoosts(guildId: string): Promise<ServerBoost[]> {
    return await db.select().from(serverBoosts)
      .where(and(eq(serverBoosts.guildId, guildId), eq(serverBoosts.isActive, true)));
  }

  async getTotalBoostCount(guildId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(serverBoosts)
      .where(eq(serverBoosts.guildId, guildId));
    return result.count;
  }

  // Guild configuration
  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    const [config] = await db.select().from(guildConfigs).where(eq(guildConfigs.guildId, guildId));
    return config;
  }

  async createGuildConfig(insertConfig: InsertGuildConfig): Promise<GuildConfig> {
    const [config] = await db.insert(guildConfigs).values({
      ...insertConfig,
      boostMessage: insertConfig.boostMessage || "🎉 {user} just boosted the server! Thank you for your support!",
      levelRoleConfigs: insertConfig.levelRoleConfigs || "[]",
      messageRoleConfigs: insertConfig.messageRoleConfigs || "[]"
    }).returning();
    return config;
  }

  async updateGuildConfig(guildId: string, updates: Partial<InsertGuildConfig>): Promise<GuildConfig | undefined> {
    const [config] = await db.update(guildConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(guildConfigs.guildId, guildId))
      .returning();
    return config;
  }

  async addLevelRoleConfig(guildId: string, level: number, roleId: string): Promise<void> {
    const config = await this.getGuildConfig(guildId);
    let levelRoles = [];
    
    if (config?.levelRoleConfigs) {
      levelRoles = JSON.parse(config.levelRoleConfigs as string);
    }
    
    // Remove existing config for this level
    levelRoles = levelRoles.filter((lr: any) => lr.level !== level);
    levelRoles.push({ level, roleId });
    
    if (config) {
      await this.updateGuildConfig(guildId, { levelRoleConfigs: JSON.stringify(levelRoles) });
    } else {
      await this.createGuildConfig({ guildId, levelRoleConfigs: JSON.stringify(levelRoles) });
    }
  }

  async addMessageRoleConfig(guildId: string, messageCount: number, roleId: string): Promise<void> {
    const config = await this.getGuildConfig(guildId);
    let messageRoles = [];
    
    if (config?.messageRoleConfigs) {
      messageRoles = JSON.parse(config.messageRoleConfigs as string);
    }
    
    // Remove existing config for this message count
    messageRoles = messageRoles.filter((mr: any) => mr.messageCount !== messageCount);
    messageRoles.push({ messageCount, roleId });
    
    if (config) {
      await this.updateGuildConfig(guildId, { messageRoleConfigs: JSON.stringify(messageRoles) });
    } else {
      await this.createGuildConfig({ guildId, messageRoleConfigs: JSON.stringify(messageRoles) });
    }
  }

  async getRoleConfigs(guildId: string): Promise<{ levelRoles: any[], messageRoles: any[] }> {
    const config = await this.getGuildConfig(guildId);
    
    const levelRoles = config?.levelRoleConfigs ? JSON.parse(config.levelRoleConfigs as string) : [];
    const messageRoles = config?.messageRoleConfigs ? JSON.parse(config.messageRoleConfigs as string) : [];
    
    return { levelRoles, messageRoles };
  }

  // Giveaway winners
  async addGiveawayWinner(insertWinner: InsertGiveawayWinner): Promise<GiveawayWinner> {
    const [winner] = await db.insert(giveawayWinners).values(insertWinner).returning();
    return winner;
  }

  async getGiveawayWinners(giveawayId: number): Promise<GiveawayWinner[]> {
    return await db.select().from(giveawayWinners)
      .where(eq(giveawayWinners.giveawayId, giveawayId))
      .orderBy(giveawayWinners.position);
  }

  async markWinnerAsRerolled(winnerId: number): Promise<void> {
    await db.update(giveawayWinners)
      .set({ rerolled: true })
      .where(eq(giveawayWinners.id, winnerId));
  }

  // Check giveaway requirements
  async checkGiveawayRequirements(userId: string, guildId: string): Promise<{ meetsRequirements: boolean, reason?: string }> {
    const config = await this.getGuildConfig(guildId);
    
    if (!config?.levelRequirement && !config?.messageRequirement) {
      return { meetsRequirements: true };
    }

    const userLevel = await this.getUserLevel(userId, guildId);
    
    if (config.levelRequirement && (!userLevel || userLevel.level < config.levelRequirement)) {
      return { 
        meetsRequirements: false, 
        reason: `You need to be at least level ${config.levelRequirement} to enter giveaways. Your current level: ${userLevel?.level || 0}` 
      };
    }

    if (config.messageRequirement && (!userLevel || userLevel.totalMessages < config.messageRequirement)) {
      return { 
        meetsRequirements: false, 
        reason: `You need at least ${config.messageRequirement.toLocaleString()} messages to enter giveaways. Your current messages: ${userLevel?.totalMessages || 0}` 
      };
    }

    return { meetsRequirements: true };
  }
}