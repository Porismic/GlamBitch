import { CommandInteraction, PermissionFlagsBits, GuildMember } from "discord.js";

export function hasPermission(interaction: CommandInteraction, permission: bigint): boolean {
  if (!interaction.guild || !interaction.member) return false;
  
  const member = interaction.member as GuildMember;
  return member.permissions.has(permission);
}

export function requirePermission(interaction: CommandInteraction, permission: bigint, permissionName: string): boolean {
  if (!hasPermission(interaction, permission)) {
    interaction.reply({
      content: `❌ You need the **${permissionName}** permission to use this command.`,
      ephemeral: true,
    });
    return false;
  }
  return true;
}

export function isBotOwner(userId: string): boolean {
  const botOwners = process.env.BOT_OWNERS?.split(",") || [];
  return botOwners.includes(userId);
}

export function requireBotOwner(interaction: CommandInteraction): boolean {
  if (!isBotOwner(interaction.user.id)) {
    interaction.reply({
      content: "❌ This command is restricted to bot owners only.",
      ephemeral: true,
    });
    return false;
  }
  return true;
}

// Rate limiting utility
const rateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, commandName: string, maxUses = 5, windowMs = 60000): boolean {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const userLimit = rateLimits.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxUses) {
    return false;
  }

  userLimit.count++;
  return true;
}
