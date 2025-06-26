import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder, Role, TextChannel } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";

const configCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure server settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("boost-channel")
        .setDescription("Set the boost announcement channel")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel for boost announcements")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("boost-message")
        .setDescription("Set custom boost announcement message")
        .addStringOption(option =>
          option.setName("message")
            .setDescription("Message to send (use {user} for mention)")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("level-role")
        .setDescription("Assign role for reaching specific level")
        .addIntegerOption(option =>
          option.setName("level")
            .setDescription("Level requirement")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("Role to assign")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("message-role")
        .setDescription("Assign role for reaching message count")
        .addIntegerOption(option =>
          option.setName("messages")
            .setDescription("Message count requirement")
            .setRequired(true)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("Role to assign")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("booster-role")
        .setDescription("Set role for server boosters")
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("Role to assign to boosters")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("giveaway-requirements")
        .setDescription("Set level/message requirements for giveaways")
        .addIntegerOption(option =>
          option.setName("level")
            .setDescription("Minimum level required")
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName("messages")
            .setDescription("Minimum message count required")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View current server configuration")
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const guildId = interaction.guildId;
    if (!guildId) {
      return await interaction.reply({ content: "This command can only be used in servers!", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      let config = await storage.getGuildConfig(guildId);

      switch (subcommand) {
        case "boost-channel": {
          const channel = interaction.options.getChannel("channel") as TextChannel;
          
          if (!config) {
            config = await storage.createGuildConfig({
              guildId,
              boostChannelId: channel.id
            });
          } else {
            config = await storage.updateGuildConfig(guildId, { boostChannelId: channel.id });
          }

          await interaction.reply({
            content: `✅ Boost announcement channel set to ${channel}`,
            ephemeral: true
          });
          break;
        }

        case "boost-message": {
          const message = interaction.options.getString("message", true);
          
          if (!config) {
            config = await storage.createGuildConfig({
              guildId,
              boostMessage: message
            });
          } else {
            config = await storage.updateGuildConfig(guildId, { boostMessage: message });
          }

          await interaction.reply({
            content: `✅ Boost message updated to: ${message}`,
            ephemeral: true
          });
          break;
        }

        case "level-role": {
          const level = interaction.options.getInteger("level", true);
          const role = interaction.options.getRole("role", true) as Role;
          
          await storage.addLevelRoleConfig(guildId, level, role.id);
          
          await interaction.reply({
            content: `✅ Users reaching level ${level} will now receive the ${role} role!`,
            ephemeral: true
          });
          break;
        }

        case "message-role": {
          const messageCount = interaction.options.getInteger("messages", true);
          const role = interaction.options.getRole("role", true) as Role;
          
          await storage.addMessageRoleConfig(guildId, messageCount, role.id);
          
          await interaction.reply({
            content: `✅ Users reaching ${messageCount.toLocaleString()} messages will now receive the ${role} role!`,
            ephemeral: true
          });
          break;
        }

        case "booster-role": {
          const role = interaction.options.getRole("role", true) as Role;
          
          if (!config) {
            config = await storage.createGuildConfig({
              guildId,
              boosterRoleId: role.id
            });
          } else {
            config = await storage.updateGuildConfig(guildId, { boosterRoleId: role.id });
          }

          await interaction.reply({
            content: `✅ Server boosters will now receive the ${role} role!`,
            ephemeral: true
          });
          break;
        }

        case "giveaway-requirements": {
          const level = interaction.options.getInteger("level");
          const messages = interaction.options.getInteger("messages");
          
          if (!level && !messages) {
            return await interaction.reply({
              content: "Please specify at least one requirement (level or messages)!",
              ephemeral: true
            });
          }

          const updates: any = {};
          if (level !== null) updates.levelRequirement = level;
          if (messages !== null) updates.messageRequirement = messages;

          if (!config) {
            config = await storage.createGuildConfig({
              guildId,
              ...updates
            });
          } else {
            config = await storage.updateGuildConfig(guildId, updates);
          }

          let response = "✅ Giveaway requirements updated:";
          if (level) response += `\n• Minimum level: ${level}`;
          if (messages) response += `\n• Minimum messages: ${messages.toLocaleString()}`;

          await interaction.reply({ content: response, ephemeral: true });
          break;
        }

        case "view": {
          const embed = new EmbedBuilder()
            .setColor("#00AE86")
            .setTitle("🛠️ Server Configuration")
            .setDescription("Current server settings");

          if (config) {
            const fields = [];
            
            if (config.boostChannelId) {
              fields.push({
                name: "Boost Channel",
                value: `<#${config.boostChannelId}>`,
                inline: true
              });
            }

            if (config.boostMessage) {
              fields.push({
                name: "Boost Message",
                value: config.boostMessage.length > 100 ? 
                  config.boostMessage.substring(0, 100) + "..." : 
                  config.boostMessage,
                inline: false
              });
            }

            if (config.boosterRoleId) {
              fields.push({
                name: "Booster Role",
                value: `<@&${config.boosterRoleId}>`,
                inline: true
              });
            }

            if (config.levelRequirement) {
              fields.push({
                name: "Giveaway Level Requirement",
                value: `${config.levelRequirement}`,
                inline: true
              });
            }

            if (config.messageRequirement) {
              fields.push({
                name: "Giveaway Message Requirement",
                value: `${config.messageRequirement.toLocaleString()}`,
                inline: true
              });
            }

            const roleConfigs = await storage.getRoleConfigs(guildId);
            if (roleConfigs.levelRoles.length > 0) {
              const levelRoles = roleConfigs.levelRoles
                .map(lr => `Level ${lr.level}: <@&${lr.roleId}>`)
                .join("\n");
              fields.push({
                name: "Level Roles",
                value: levelRoles,
                inline: false
              });
            }

            if (roleConfigs.messageRoles.length > 0) {
              const messageRoles = roleConfigs.messageRoles
                .map(mr => `${mr.messageCount.toLocaleString()} messages: <@&${mr.roleId}>`)
                .join("\n");
              fields.push({
                name: "Message Roles",
                value: messageRoles,
                inline: false
              });
            }

            if (fields.length === 0) {
              embed.setDescription("No configuration set yet. Use the config commands to set up your server!");
            } else {
              embed.addFields(fields);
            }
          } else {
            embed.setDescription("No configuration set yet. Use the config commands to set up your server!");
          }

          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        }
      }
    } catch (error) {
      console.error("Error in config command:", error);
      await interaction.reply({ content: "An error occurred while updating configuration.", ephemeral: true });
    }
  }
};

export const configCommands: SlashCommand[] = [configCommand];