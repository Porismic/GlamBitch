import { Client, Events, GuildMember, PartialGuildMember } from "discord.js";
import { logger } from "../utils/logger";
import { storage } from "../../server/storage";

export function setupGuildMemberUpdateEvent(client: Client): void {
  client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    try {
      // Check if boost status changed
      const wasBoosting = oldMember.premiumSince !== null;
      const isBoosting = newMember.premiumSince !== null;
      
      if (!wasBoosting && isBoosting) {
        // User started boosting
        await storage.recordBoost(newMember.user.id, newMember.guild.id);
        logger.info(`${newMember.user.username} started boosting ${newMember.guild.name}`);
        
        // Check for boost announcement channel
        const config = await storage.getGuildConfig(newMember.guild.id);
        if (config?.boostChannelId) {
          const channel = newMember.guild.channels.cache.get(config.boostChannelId);
          if (channel && channel.isTextBased()) {
            let message = config.boostMessage || "🎉 {user} just boosted the server! Thank you for your support!";
            message = message.replace(/\{user\}/g, `<@${newMember.user.id}>`);
            
            try {
              await channel.send(message);
            } catch (error) {
              logger.warn("Failed to send boost announcement:", error);
            }
          }
        }
        
        // Assign booster role if configured
        if (config?.boosterRoleId) {
          const role = newMember.guild.roles.cache.get(config.boosterRoleId);
          if (role && !newMember.roles.cache.has(role.id)) {
            try {
              await newMember.roles.add(role);
              logger.info(`Assigned booster role ${role.name} to ${newMember.user.username}`);
            } catch (error) {
              logger.warn("Failed to assign booster role:", error);
            }
          }
        }
        
      } else if (wasBoosting && !isBoosting) {
        // User stopped boosting
        await storage.removeBoost(newMember.user.id, newMember.guild.id);
        logger.info(`${newMember.user.username} stopped boosting ${newMember.guild.name}`);
        
        // Remove booster role if configured
        const config = await storage.getGuildConfig(newMember.guild.id);
        if (config?.boosterRoleId) {
          const role = newMember.guild.roles.cache.get(config.boosterRoleId);
          if (role && newMember.roles.cache.has(role.id)) {
            try {
              await newMember.roles.remove(role);
              logger.info(`Removed booster role ${role.name} from ${newMember.user.username}`);
            } catch (error) {
              logger.warn("Failed to remove booster role:", error);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error handling guild member update:", error);
    }
  });
}