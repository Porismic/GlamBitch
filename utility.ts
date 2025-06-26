import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";

const userinfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to get information about")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ This command can only be used in a server!", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!member) {
      await interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || 0x00AE86)
      .setTitle(`👤 ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
      .addFields(
        { name: "🆔 User ID", value: targetUser.id, inline: true },
        { name: "📅 Account Created", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "📅 Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: true },
        { name: "🎭 Roles", value: member.roles.cache.filter(role => role.name !== "@everyone").map(role => role.name).join(", ") || "None", inline: false },
        { name: "🚫 Timeout", value: member.isCommunicationDisabled() ? "Yes" : "No", inline: true },
        { name: "🤖 Bot", value: targetUser.bot ? "Yes" : "No", inline: true }
      );

    if (member.premiumSince) {
      embed.addFields({ name: "💎 Nitro Booster Since", value: `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:F>`, inline: true });
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    await storage.recordCommandUsage({
      commandName: "userinfo",
      guildId: interaction.guildId!,
      userId: interaction.user.id,
    });
  },
};

const avatarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's avatar")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user whose avatar to show")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    
    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`🖼️ ${targetUser.tag}'s Avatar`)
      .setImage(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
      .setDescription(`[Download Link](${targetUser.displayAvatarURL({ extension: 'png', size: 4096 })})`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "avatar",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const statsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show bot statistics for this server"),
  
  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ This command can only be used in a server!", ephemeral: true });
      return;
    }

    try {
      const stats = await storage.getCommandStats(interaction.guildId);
      const totalCommands = stats.length;
      
      // Count commands by type
      const commandCounts: Record<string, number> = {};
      stats.forEach(stat => {
        commandCounts[stat.commandName] = (commandCounts[stat.commandName] || 0) + 1;
      });

      // Get top 5 most used commands
      const sortedCommands = Object.entries(commandCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("📊 Bot Statistics")
        .addFields(
          { name: "📈 Total Commands Used", value: totalCommands.toString(), inline: true },
          { name: "🤖 Bot Guilds", value: interaction.client.guilds.cache.size.toString(), inline: true },
          { name: "👥 Bot Users", value: interaction.client.users.cache.size.toString(), inline: true }
        );

      if (sortedCommands.length > 0) {
        const topCommandsText = sortedCommands
          .map(([cmd, count], index) => `${index + 1}. \`${cmd}\` - ${count} uses`)
          .join("\n");
        
        embed.addFields({ 
          name: "🏆 Top Commands (This Server)", 
          value: topCommandsText, 
          inline: false 
        });
      }

      // Bot uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      embed.addFields({ 
        name: "⏱️ Uptime", 
        value: `${days}d ${hours}h ${minutes}m`, 
        inline: true 
      });

      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Record command usage
      await storage.recordCommandUsage({
        commandName: "stats",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

    } catch (error) {
      await interaction.reply({ content: "❌ Failed to fetch statistics.", ephemeral: true });
    }
  },
};

export const utilityCommands: SlashCommand[] = [
  userinfoCommand,
  avatarCommand,
  statsCommand,
];
