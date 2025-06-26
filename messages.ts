import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";

const messagesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Check user message count")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check messages for")
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName("period")
        .setDescription("Time period to check")
        .setRequired(false)
        .addChoices(
          { name: "All Time", value: "all" },
          { name: "This Month", value: "month" },
          { name: "This Week", value: "week" },
          { name: "Today", value: "today" }
        )
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const period = interaction.options.getString("period") || "all";
    const guildId = interaction.guildId;
    
    if (!guildId) {
      return interaction.reply({ content: "This command can only be used in servers!", ephemeral: true });
    }

    try {
      let messageCount = 0;
      let periodText = "";

      if (period === "all") {
        const userLevel = await storage.getUserLevel(targetUser.id, guildId);
        messageCount = userLevel?.totalMessages || 0;
        periodText = "All Time";
      } else {
        messageCount = await storage.getMessageCount(targetUser.id, guildId, period);
        periodText = period === "today" ? "Today" : 
                    period === "week" ? "This Week" : 
                    period === "month" ? "This Month" : "All Time";
      }

      const embed = new EmbedBuilder()
        .setColor("#00AE86")
        .setTitle(`${targetUser.username}'s Messages`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "Period", value: periodText, inline: true },
          { name: "Messages", value: `${messageCount.toLocaleString()}`, inline: true }
        );

      if (period === "all") {
        const userLevel = await storage.getUserLevel(targetUser.id, guildId);
        if (userLevel) {
          embed.addFields(
            { name: "Level", value: `${userLevel.level}`, inline: true },
            { name: "Experience", value: `${userLevel.experience.toLocaleString()}`, inline: true }
          );
        }
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching message data:", error);
      await interaction.reply({ content: "An error occurred while fetching message data.", ephemeral: true });
    }
  }
};

const messageLeaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("message-leaderboard")
    .setDescription("Show the server message leaderboard")
    .addStringOption(option =>
      option.setName("period")
        .setDescription("Time period for leaderboard")
        .setRequired(false)
        .addChoices(
          { name: "All Time", value: "all" },
          { name: "This Month", value: "month" },
          { name: "This Week", value: "week" },
          { name: "Today", value: "today" }
        )
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const guildId = interaction.guildId;
    const period = interaction.options.getString("period") || "all";
    
    if (!guildId) {
      return interaction.reply({ content: "This command can only be used in servers!", ephemeral: true });
    }

    try {
      await interaction.deferReply();
      
      const leaderboard = await storage.getMessageLeaderboard(guildId, period, 10);
      
      if (leaderboard.length === 0) {
        return interaction.editReply("No message data found for this server!");
      }

      const periodText = period === "today" ? "Today" : 
                        period === "week" ? "This Week" : 
                        period === "month" ? "This Month" : "All Time";

      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle(`📝 Message Leaderboard - ${periodText}`)
        .setDescription("Top users by message count");

      let description = "";
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        
        try {
          const discordUser = await interaction.client.users.fetch(user.userId);
          const messageCount = period === "all" ? user.totalMessages : user.messageCount;
          description += `${medal} **${discordUser.username}** - ${messageCount?.toLocaleString() || 0} messages\n`;
        } catch {
          const messageCount = period === "all" ? user.totalMessages : user.messageCount;
          description += `${medal} **Unknown User** - ${messageCount?.toLocaleString() || 0} messages\n`;
        }
      }

      embed.setDescription(description);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching message leaderboard:", error);
      await interaction.editReply("An error occurred while fetching the leaderboard.");
    }
  }
};

export const messageCommands: SlashCommand[] = [messagesCommand, messageLeaderboardCommand];