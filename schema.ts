import { pgTable, text, serial, integer, boolean, timestamp, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // Discord guild ID
  name: text("name").notNull(),
  prefix: text("prefix").default("!"),
  moderationEnabled: boolean("moderation_enabled").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const moderationLogs = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  action: text("action").notNull(), // kick, ban, mute, etc.
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const botStats = pgTable("bot_stats", {
  id: serial("id").primaryKey(),
  commandName: text("command_name").notNull(),
  guildId: text("guild_id"),
  userId: text("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const giveaways = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  guildId: text("guild_id").notNull(),
  hostId: text("host_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  prize: text("prize").notNull(),
  winnerCount: integer("winner_count").default(1),
  endTime: timestamp("end_time").notNull(),
  embedColor: text("embed_color").default("#00AE86"),
  buttonEmoji: text("button_emoji").default("🎉"),
  buttonText: text("button_text").default("Enter Giveaway"),
  requiredRoles: text("required_roles").array().default([]),
  bonusRoles: text("bonus_roles").array().default([]),
  bonusEntries: integer("bonus_entries").default(1),
  winnerMessage: text("winner_message").default("Congratulations {winner}! You won **{prize}**!"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giveawayEntries = pgTable("giveaway_entries", {
  id: serial("id").primaryKey(),
  giveawayId: integer("giveaway_id").notNull(),
  userId: text("user_id").notNull(),
  entries: integer("entries").default(1),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// User levels and experience tracking
export const userLevels = pgTable("user_levels", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  lastMessageTime: timestamp("last_message_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message tracking for leaderboards
export const messageStats = pgTable("message_stats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  date: date("date").notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Server boost tracking
export const serverBoosts = pgTable("server_boosts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  boostStarted: timestamp("boost_started").notNull(),
  boostEnded: timestamp("boost_ended"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guild configurations for boost announcements and role assignments
export const guildConfigs = pgTable("guild_configs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  boostChannelId: text("boost_channel_id"),
  boostMessage: text("boost_message").default("🎉 {user} just boosted the server! Thank you for your support!"),
  levelRoleConfigs: json("level_role_configs").default("[]"), // Array of {level: number, roleId: string}
  messageRoleConfigs: json("message_role_configs").default("[]"), // Array of {messageCount: number, roleId: string}
  boosterRoleId: text("booster_role_id"),
  levelRequirement: integer("level_requirement"),
  messageRequirement: integer("message_requirement"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Giveaway winners tracking for reroll functionality
export const giveawayWinners = pgTable("giveaway_winners", {
  id: serial("id").primaryKey(),
  giveawayId: integer("giveaway_id").notNull().references(() => giveaways.id),
  userId: text("user_id").notNull(),
  position: integer("position").notNull(), // 1st, 2nd, 3rd place etc
  selectedAt: timestamp("selected_at").defaultNow(),
  rerolled: boolean("rerolled").default(false).notNull(),
});

export const insertGuildSchema = createInsertSchema(guilds).omit({
  joinedAt: true,
});

export const insertModerationLogSchema = createInsertSchema(moderationLogs).omit({
  id: true,
  timestamp: true,
});

export const insertBotStatsSchema = createInsertSchema(botStats).omit({
  id: true,
  timestamp: true,
});

export const insertGiveawaySchema = createInsertSchema(giveaways).omit({
  id: true,
  createdAt: true,
});

export const insertGiveawayEntrySchema = createInsertSchema(giveawayEntries).omit({
  id: true,
  joinedAt: true,
});

export const insertUserLevelSchema = createInsertSchema(userLevels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageStatsSchema = createInsertSchema(messageStats).omit({
  id: true,
  createdAt: true,
});

export const insertServerBoostSchema = createInsertSchema(serverBoosts).omit({
  id: true,
  createdAt: true,
});

export const insertGuildConfigSchema = createInsertSchema(guildConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGiveawayWinnerSchema = createInsertSchema(giveawayWinners).omit({
  id: true,
  selectedAt: true,
});

export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type Guild = typeof guilds.$inferSelect;

export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;

export type InsertBotStats = z.infer<typeof insertBotStatsSchema>;
export type BotStats = typeof botStats.$inferSelect;

export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Giveaway = typeof giveaways.$inferSelect;

export type InsertGiveawayEntry = z.infer<typeof insertGiveawayEntrySchema>;
export type GiveawayEntry = typeof giveawayEntries.$inferSelect;

export type InsertUserLevel = z.infer<typeof insertUserLevelSchema>;
export type UserLevel = typeof userLevels.$inferSelect;

export type InsertMessageStats = z.infer<typeof insertMessageStatsSchema>;
export type MessageStats = typeof messageStats.$inferSelect;

export type InsertServerBoost = z.infer<typeof insertServerBoostSchema>;
export type ServerBoost = typeof serverBoosts.$inferSelect;

export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;
export type GuildConfig = typeof guildConfigs.$inferSelect;

export type InsertGiveawayWinner = z.infer<typeof insertGiveawayWinnerSchema>;
export type GiveawayWinner = typeof giveawayWinners.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertGuildSchema>;
