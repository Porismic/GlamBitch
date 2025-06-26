import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, GuildMember, User } from "discord.js";
import { SlashCommand } from "../types";
import { requirePermission, checkRateLimit } from "../utils/permissions";
import { storage } from "../../server/storage";
import { logger } from "../utils/logger";

const kickCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to kick")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.KickMembers, "Kick Members")) return;
    
    if (!checkRateLimit(interaction.user.id, "kick", 3, 60000)) {
      await interaction.reply({ content: "❌ You're using this command too frequently. Please wait.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    
    if (!interaction.guild) return;
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      await interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
      return;
    }

    if (targetMember.id === interaction.user.id) {
      await interaction.reply({ content: "❌ You cannot kick yourself.", ephemeral: true });
      return;
    }

    if (!targetMember.kickable) {
      await interaction.reply({ content: "❌ I cannot kick this user. They may have higher permissions.", ephemeral: true });
      return;
    }

    try {
      await targetMember.kick(reason);
      
      // Log the moderation action
      await storage.createModerationLog({
        guildId: interaction.guildId!,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: "kick",
        reason,
      });

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`,
      });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "kick",
        guildId: interaction.guildId!,
        userId: interaction.user.id,
      });

    } catch (error) {
      logger.error("Error kicking user:", error);
      await interaction.reply({ content: "❌ Failed to kick the user.", ephemeral: true });
    }
  },
};

const banCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to ban")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members")) return;
    
    if (!checkRateLimit(interaction.user.id, "ban", 2, 60000)) {
      await interaction.reply({ content: "❌ You're using this command too frequently. Please wait.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") || 0;
    
    if (!interaction.guild) return;
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (targetMember) {
      if (targetMember.id === interaction.user.id) {
        await interaction.reply({ content: "❌ You cannot ban yourself.", ephemeral: true });
        return;
      }

      if (!targetMember.bannable) {
        await interaction.reply({ content: "❌ I cannot ban this user. They may have higher permissions.", ephemeral: true });
        return;
      }
    }

    try {
      await interaction.guild.members.ban(targetUser, { reason, deleteMessageDays: deleteDays });
      
      // Log the moderation action
      await storage.createModerationLog({
        guildId: interaction.guildId!,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: "ban",
        reason,
      });

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been banned.\n**Reason:** ${reason}`,
      });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "ban",
        guildId: interaction.guildId!,
        userId: interaction.user.id,
      });

    } catch (error) {
      logger.error("Error banning user:", error);
      await interaction.reply({ content: "❌ Failed to ban the user.", ephemeral: true });
    }
  },
};

const unbanCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption(option =>
      option.setName("user_id")
        .setDescription("The user ID to unban")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the unban")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members")) return;

    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    
    if (!interaction.guild) return;

    try {
      const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
      
      if (!bannedUser) {
        await interaction.reply({ content: "❌ User is not banned or invalid user ID.", ephemeral: true });
        return;
      }

      await interaction.guild.members.unban(userId, reason);
      
      // Log the moderation action
      await storage.createModerationLog({
        guildId: interaction.guildId!,
        userId: userId,
        moderatorId: interaction.user.id,
        action: "unban",
        reason,
      });

      await interaction.reply({
        content: `✅ **${bannedUser.user.tag}** has been unbanned.\n**Reason:** ${reason}`,
      });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "unban",
        guildId: interaction.guildId!,
        userId: interaction.user.id,
      });

    } catch (error) {
      logger.error("Error unbanning user:", error);
      await interaction.reply({ content: "❌ Failed to unban the user.", ephemeral: true });
    }
  },
};

const muteCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a member (mute them for a specified duration)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to mute")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("duration")
        .setDescription("Duration in minutes (1-10080)")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the mute")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members")) return;

    const targetUser = interaction.options.getUser("user", true);
    const duration = interaction.options.getInteger("duration", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    
    if (!interaction.guild) return;
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      await interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
      return;
    }

    if (targetMember.id === interaction.user.id) {
      await interaction.reply({ content: "❌ You cannot mute yourself.", ephemeral: true });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({ content: "❌ I cannot mute this user. They may have higher permissions.", ephemeral: true });
      return;
    }

    try {
      const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
      await targetMember.timeout(duration * 60 * 1000, reason);
      
      // Log the moderation action
      await storage.createModerationLog({
        guildId: interaction.guildId!,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: "mute",
        reason: `${reason} (Duration: ${duration} minutes)`,
      });

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been muted for **${duration} minutes**.\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`,
      });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "mute",
        guildId: interaction.guildId!,
        userId: interaction.user.id,
      });

    } catch (error) {
      logger.error("Error muting user:", error);
      await interaction.reply({ content: "❌ Failed to mute the user.", ephemeral: true });
    }
  },
};

const unmuteCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove timeout from a member (unmute them)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to unmute")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the unmute")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members")) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    
    if (!interaction.guild) return;
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      await interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
      return;
    }

    if (!targetMember.isCommunicationDisabled()) {
      await interaction.reply({ content: "❌ This user is not currently muted.", ephemeral: true });
      return;
    }

    try {
      await targetMember.timeout(null, reason);
      
      // Log the moderation action
      await storage.createModerationLog({
        guildId: interaction.guildId!,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: "unmute",
        reason,
      });

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been unmuted.\n**Reason:** ${reason}`,
      });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "unmute",
        guildId: interaction.guildId!,
        userId: interaction.user.id,
      });

    } catch (error) {
      logger.error("Error unmuting user:", error);
      await interaction.reply({ content: "❌ Failed to unmute the user.", ephemeral: true });
    }
  },
};

export const moderationCommands: SlashCommand[] = [
  kickCommand,
  banCommand,
  unbanCommand,
  muteCommand,
  unmuteCommand,
];
