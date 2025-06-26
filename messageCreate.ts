import { Client, Events, Message } from "discord.js";
import { logger } from "../utils/logger";
import { storage } from "../../server/storage";

export function setupMessageCreateEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Handle direct mentions
    if (message.mentions.has(client.user!)) {
      const embed = {
        color: 0x00AE86,
        title: "👋 Hello!",
        description: `Hi ${message.author}! I'm a Discord bot with many useful commands.\n\nUse \`/help\` to see all available commands!`,
        fields: [
          {
            name: "📋 Quick Commands",
            value: "`/ping` - Check bot latency\n`/help` - View all commands\n`/serverinfo` - Server information",
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Use slash commands by typing / followed by the command name"
        }
      };

      try {
        await message.reply({ embeds: [embed] });
      } catch (error) {
        logger.error("Error sending mention reply:", error);
      }
    }

    // Track messages for XP and level system
    if (message.guild) {
      try {
        // Record the message for XP and level tracking
        await storage.recordMessage(message.author.id, message.guild.id);
        
        // Check if user leveled up and assign roles if configured
        const userLevel = await storage.getUserLevel(message.author.id, message.guild.id);
        if (userLevel) {
          const { levelRoles, messageRoles } = await storage.getRoleConfigs(message.guild.id);
          
          // Check for level-based role assignments
          for (const levelRole of levelRoles) {
            if (userLevel.level >= levelRole.level) {
              try {
                const role = message.guild.roles.cache.get(levelRole.roleId);
                const member = message.guild.members.cache.get(message.author.id);
                
                if (role && member && !member.roles.cache.has(role.id)) {
                  await member.roles.add(role);
                  logger.info(`Assigned role ${role.name} to ${message.author.username} for reaching level ${levelRole.level}`);
                }
              } catch (error) {
                logger.warn(`Failed to assign level role: ${error}`);
              }
            }
          }
          
          // Check for message count-based role assignments
          for (const messageRole of messageRoles) {
            if (userLevel.totalMessages >= messageRole.messageCount) {
              try {
                const role = message.guild.roles.cache.get(messageRole.roleId);
                const member = message.guild.members.cache.get(message.author.id);
                
                if (role && member && !member.roles.cache.has(role.id)) {
                  await member.roles.add(role);
                  logger.info(`Assigned role ${role.name} to ${message.author.username} for reaching ${messageRole.messageCount} messages`);
                }
              } catch (error) {
                logger.warn(`Failed to assign message role: ${error}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error("Error processing message for XP:", error);
      }
      
      logger.debug(`Message in ${message.guild.name}#${message.channel}: ${message.author.tag}: ${message.content}`);
    }
  });
}
