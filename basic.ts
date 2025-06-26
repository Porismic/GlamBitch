import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong! and shows bot latency"),
  
  async execute(interaction: CommandInteraction) {
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "Bot Latency", value: `${latency}ms`, inline: true },
        { name: "API Latency", value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "ping",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands and their descriptions"),
  
  async execute(interaction: CommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle("🤖 Bot Commands")
      .setDescription("Here are all the available commands:")
      .addFields(
        {
          name: "📋 Basic Commands",
          value: "`/ping` - Check bot latency\n`/help` - Show this help message\n`/serverinfo` - Display server information",
          inline: false
        },
        {
          name: "🛡️ Moderation Commands",
          value: "`/kick` - Kick a member\n`/ban` - Ban a member\n`/unban` - Unban a user\n`/mute` - Mute a member\n`/unmute` - Unmute a member",
          inline: false
        },
        {
          name: "🎮 Fun Commands",
          value: "`/roll` - Roll a dice\n`/joke` - Get a random joke\n`/fact` - Get a random fact\n`/coinflip` - Flip a coin",
          inline: false
        },
        {
          name: "🔧 Utility Commands",
          value: "`/userinfo` - Get user information\n`/avatar` - Show user's avatar\n`/stats` - Show bot statistics",
          inline: false
        },
        {
          name: "🎉 Giveaway Commands",
          value: "`/giveaway-create` - Create comprehensive giveaways\n`/giveaway-list` - List server giveaways\n`/giveaway-end` - End giveaways early",
          inline: false
        }
      )
      .setFooter({ text: "Use slash commands by typing / followed by the command name" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "help",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const serverInfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Display information about the current server"),
  
  async execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ This command can only be used in a server!", ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    
    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`📊 ${guild.name} Server Information`)
      .setThumbnail(guild.iconURL() || null)
      .addFields(
        { name: "👑 Owner", value: `${owner.user.tag}`, inline: true },
        { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "👥 Members", value: `${guild.memberCount}`, inline: true },
        { name: "💬 Channels", value: `${guild.channels.cache.size}`, inline: true },
        { name: "🎭 Roles", value: `${guild.roles.cache.size}`, inline: true },
        { name: "🎨 Emojis", value: `${guild.emojis.cache.size}`, inline: true },
        { name: "🔐 Verification Level", value: guild.verificationLevel.toString(), inline: true },
        { name: "📍 Region", value: guild.preferredLocale || "Unknown", inline: true },
        { name: "🆔 Server ID", value: guild.id, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    await storage.recordCommandUsage({
      commandName: "serverinfo",
      guildId: interaction.guildId!,
      userId: interaction.user.id,
    });
  },
};

export const basicCommands: SlashCommand[] = [pingCommand, helpCommand, serverInfoCommand];
