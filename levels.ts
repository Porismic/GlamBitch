import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, User } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";

function calculateLevel(experience: number): number {
  // Formula: level = floor(sqrt(experience / 100))
  return Math.floor(Math.sqrt(experience / 100)) + 1;
}

function experienceForLevel(level: number): number {
  // Formula: experience = (level - 1)^2 * 100
  return Math.pow(level - 1, 2) * 100;
}

function experienceToNextLevel(currentExp: number): number {
  const currentLevel = calculateLevel(currentExp);
  const nextLevelExp = experienceForLevel(currentLevel + 1);
  return nextLevelExp - currentExp;
}

const levelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Check user level and experience")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check level for")
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guildId;
    
    if (!guildId) {
      return interaction.reply({ content: "This command can only be used in servers!", ephemeral: true });
    }

    try {
      const userLevel = await storage.getUserLevel(targetUser.id, guildId);
      
      if (!userLevel) {
        return interaction.reply({ 
          content: `${targetUser.username} hasn't sent any messages yet!`, 
          ephemeral: true 
        });
      }

      const currentLevel = userLevel.level;
      const experience = userLevel.experience;
      const expNeeded = experienceToNextLevel(experience);
      const nextLevelExp = experienceForLevel(currentLevel + 1);
      const currentLevelExp = experienceForLevel(currentLevel);
      const progressExp = experience - currentLevelExp;
      const levelExpRange = nextLevelExp - currentLevelExp;
      
      const progressBar = "█".repeat(Math.floor((progressExp / levelExpRange) * 20)) + 
                         "░".repeat(20 - Math.floor((progressExp / levelExpRange) * 20));

      const embed = new EmbedBuilder()
        .setColor("#00AE86")
        .setTitle(`${targetUser.username}'s Level`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "Level", value: `${currentLevel}`, inline: true },
          { name: "Experience", value: `${experience.toLocaleString()}`, inline: true },
          { name: "Messages", value: `${userLevel.totalMessages.toLocaleString()}`, inline: true },
          { name: "Progress", value: `${progressBar}\n${progressExp}/${levelExpRange} XP to level ${currentLevel + 1}`, inline: false }
        )
        .setFooter({ text: `${expNeeded.toLocaleString()} XP needed for next level` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching user level:", error);
      await interaction.reply({ content: "An error occurred while fetching level data.", ephemeral: true });
    }
  }
};

const levelLeaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("level-leaderboard")
    .setDescription("Show the server level leaderboard")
    .addStringOption(option =>
      option.setName("period")
        .setDescription("Time period for leaderboard")
        .setRequired(false)
        .addChoices(
          { name: "All Time", value: "all" },
          { name: "This Month", value: "month" },
          { name: "This Week", value: "week" }
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
      
      const leaderboard = await storage.getLevelLeaderboard(guildId, period, 10);
      
      if (leaderboard.length === 0) {
        return interaction.editReply("No level data found for this server!");
      }

      const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`🏆 Level Leaderboard - ${period === "all" ? "All Time" : period === "month" ? "This Month" : "This Week"}`)
        .setDescription("Top users by level and experience");

      let description = "";
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        
        try {
          const discordUser = await interaction.client.users.fetch(user.userId);
          description += `${medal} **${discordUser.username}** - Level ${user.level} (${user.experience.toLocaleString()} XP)\n`;
        } catch {
          description += `${medal} **Unknown User** - Level ${user.level} (${user.experience.toLocaleString()} XP)\n`;
        }
      }

      embed.setDescription(description);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching level leaderboard:", error);
      await interaction.editReply("An error occurred while fetching the leaderboard.");
    }
  }
};

export const levelCommands: SlashCommand[] = [levelCommand, levelLeaderboardCommand];