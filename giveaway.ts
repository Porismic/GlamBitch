import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits, GuildMember, Role, Colors } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";
import { requirePermission } from "../utils/permissions";
import { logger } from "../utils/logger";

// Helper function to parse duration
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// Helper function to format time remaining
function formatTimeRemaining(endTime: Date): string {
  const now = new Date();
  const diff = endTime.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper function to validate color
function validateColor(color: string): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (/^[0-9A-F]{6}$/i.test(hex)) {
      return color;
    }
  }
  
  const colorNames: Record<string, string> = {
    'red': '#FF0000',
    'green': '#00FF00',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'purple': '#800080',
    'orange': '#FFA500',
    'pink': '#FFC0CB',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'lime': '#00FF00',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    'black': '#000000',
    'white': '#FFFFFF'
  };
  
  return colorNames[color.toLowerCase()] || '#00AE86';
}

// Create giveaway command
const createGiveawayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway-create")
    .setDescription("Create a comprehensive giveaway with customization options")
    .addStringOption(option =>
      option.setName("prize")
        .setDescription("The prize for the giveaway")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("duration")
        .setDescription("Duration (e.g., 1h, 30m, 7d)")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("winners")
        .setDescription("Number of winners (default: 1)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false))
    .addStringOption(option =>
      option.setName("title")
        .setDescription("Custom title for the giveaway")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("description")
        .setDescription("Custom description for the giveaway")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("color")
        .setDescription("Embed color (hex code or color name)")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("emoji")
        .setDescription("Button emoji (default: 🎉)")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("button_text")
        .setDescription("Button text (default: 'Enter Giveaway')")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("required_roles")
        .setDescription("Required roles (comma-separated role IDs or names)")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("bonus_roles")
        .setDescription("Bonus entry roles (comma-separated role IDs or names)")
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName("bonus_entries")
        .setDescription("Extra entries for bonus roles (default: 1)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false))
    .addStringOption(option =>
      option.setName("winner_message")
        .setDescription("Custom winner announcement (use {winner} and {prize})")
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName("preview")
        .setDescription("Preview the giveaway before posting")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.ManageEvents, "Manage Events")) return;
    
    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({ content: "❌ This command can only be used in a server channel!", ephemeral: true });
      return;
    }

    const prize = interaction.options.getString("prize", true);
    const durationStr = interaction.options.getString("duration", true);
    const winnerCount = interaction.options.getInteger("winners") || 1;
    const title = interaction.options.getString("title") || `🎉 ${prize} Giveaway!`;
    const description = interaction.options.getString("description");
    const colorInput = interaction.options.getString("color") || "#00AE86";
    const emoji = interaction.options.getString("emoji") || "🎉";
    const buttonText = interaction.options.getString("button_text") || "Enter Giveaway";
    const requiredRolesInput = interaction.options.getString("required_roles");
    const bonusRolesInput = interaction.options.getString("bonus_roles");
    const bonusEntries = interaction.options.getInteger("bonus_entries") || 1;
    const winnerMessage = interaction.options.getString("winner_message") || "Congratulations {winner}! You won **{prize}**!";
    const preview = interaction.options.getBoolean("preview") || false;

    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (durationMs === 0) {
      await interaction.reply({ 
        content: "❌ Invalid duration format! Use: 30s, 15m, 2h, 7d", 
        ephemeral: true 
      });
      return;
    }

    // Validate duration limits
    if (durationMs < 60000) { // 1 minute minimum
      await interaction.reply({ 
        content: "❌ Giveaway duration must be at least 1 minute!", 
        ephemeral: true 
      });
      return;
    }

    if (durationMs > 30 * 24 * 60 * 60 * 1000) { // 30 days maximum
      await interaction.reply({ 
        content: "❌ Giveaway duration cannot exceed 30 days!", 
        ephemeral: true 
      });
      return;
    }

    const endTime = new Date(Date.now() + durationMs);
    const color = validateColor(colorInput);

    // Parse roles
    let requiredRoles: string[] = [];
    let bonusRoles: string[] = [];

    if (requiredRolesInput) {
      const roleInputs = requiredRolesInput.split(',').map(r => r.trim());
      for (const roleInput of roleInputs) {
        const role = interaction.guild.roles.cache.find(r => 
          r.id === roleInput || r.name.toLowerCase() === roleInput.toLowerCase()
        );
        if (role) {
          requiredRoles.push(role.id);
        }
      }
    }

    if (bonusRolesInput) {
      const roleInputs = bonusRolesInput.split(',').map(r => r.trim());
      for (const roleInput of roleInputs) {
        const role = interaction.guild.roles.cache.find(r => 
          r.id === roleInput || r.name.toLowerCase() === roleInput.toLowerCase()
        );
        if (role) {
          bonusRoles.push(role.id);
        }
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color as any)
      .addFields(
        { name: "🎁 Prize", value: prize, inline: true },
        { name: "🏆 Winners", value: winnerCount.toString(), inline: true },
        { name: "⏰ Ends", value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true },
        { name: "👤 Hosted by", value: `<@${interaction.user.id}>`, inline: true },
        { name: "👥 Entries", value: "0", inline: true },
        { name: "⏱️ Time Left", value: formatTimeRemaining(endTime), inline: true }
      )
      .setTimestamp(endTime)
      .setFooter({ text: "Ends at" });

    if (description) {
      embed.setDescription(description);
    }

    // Add requirements info
    let requirementsText = "";
    if (requiredRoles.length > 0) {
      const roleNames = requiredRoles.map(roleId => {
        const role = interaction.guild!.roles.cache.get(roleId);
        return role ? `@${role.name}` : roleId;
      }).join(", ");
      requirementsText += `**Required Roles:** ${roleNames}\n`;
    }

    if (bonusRoles.length > 0) {
      const roleNames = bonusRoles.map(roleId => {
        const role = interaction.guild!.roles.cache.get(roleId);
        return role ? `@${role.name}` : roleId;
      }).join(", ");
      requirementsText += `**Bonus Roles:** ${roleNames} (+${bonusEntries} entries)\n`;
    }

    if (requirementsText) {
      embed.addFields({ name: "📋 Requirements", value: requirementsText, inline: false });
    }

    // Create buttons
    const enterButton = new ButtonBuilder()
      .setCustomId("giveaway_enter")
      .setLabel(buttonText)
      .setEmoji(emoji)
      .setStyle(ButtonStyle.Primary);

    const viewButton = new ButtonBuilder()
      .setCustomId("giveaway_participants")
      .setLabel("View Participants")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(enterButton, viewButton);

    if (preview) {
      // Show preview
      await interaction.reply({
        content: "🔍 **Giveaway Preview:**",
        embeds: [embed],
        components: [row],
        ephemeral: true
      });

      // Add confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId("giveaway_confirm")
        .setLabel("Post Giveaway")
        .setStyle(ButtonStyle.Success);

      const cancelButton = new ButtonBuilder()
        .setCustomId("giveaway_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger);

      const confirmRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(confirmButton, cancelButton);

      await interaction.followUp({
        content: "Do you want to post this giveaway?",
        components: [confirmRow],
        ephemeral: true
      });

      // Store preview data temporarily
      (global as any).giveawayPreview = {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        prize,
        winnerCount,
        endTime,
        title,
        description,
        embedColor: color,
        buttonEmoji: emoji,
        buttonText,
        requiredRoles,
        bonusRoles,
        bonusEntries,
        winnerMessage,
        embed,
        components: [row]
      };

    } else {
      // Post giveaway immediately
      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      // Save to storage
      try {
        await storage.createGiveaway({
          messageId: message.id,
          channelId: interaction.channelId!,
          guildId: interaction.guildId!,
          hostId: interaction.user.id,
          title,
          description,
          prize,
          winnerCount,
          endTime,
          embedColor: color,
          buttonEmoji: emoji,
          buttonText,
          requiredRoles,
          bonusRoles,
          bonusEntries,
          winnerMessage,
          isActive: true
        });

        logger.info(`Giveaway created: ${title} in ${interaction.guild!.name}`);
      } catch (error) {
        logger.error("Error creating giveaway:", error);
      }
    }

    // Record command usage
    await storage.recordCommandUsage({
      commandName: "giveaway-create",
      guildId: interaction.guildId!,
      userId: interaction.user.id,
    });
  },
};

// List giveaways command
const listGiveawaysCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway-list")
    .setDescription("List all giveaways in this server")
    .addBooleanOption(option =>
      option.setName("active_only")
        .setDescription("Show only active giveaways")
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ This command can only be used in a server!", ephemeral: true });
      return;
    }

    const activeOnly = interaction.options.getBoolean("active_only") || false;
    
    try {
      const giveaways = activeOnly 
        ? await storage.getActiveGiveaways(interaction.guildId)
        : await storage.getAllGiveaways(interaction.guildId);

      if (giveaways.length === 0) {
        await interaction.reply({ 
          content: activeOnly ? "No active giveaways found." : "No giveaways found in this server.",
          ephemeral: true 
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${activeOnly ? 'Active ' : ''}Giveaways`)
        .setColor('#00AE86')
        .setDescription(`Found ${giveaways.length} giveaway${giveaways.length !== 1 ? 's' : ''}`)
        .setTimestamp();

      for (let i = 0; i < Math.min(giveaways.length, 10); i++) {
        const giveaway = giveaways[i];
        const participantCount = await storage.getGiveawayParticipantCount(giveaway.id);
        const status = giveaway.isActive && giveaway.endTime > new Date() ? "🟢 Active" : "🔴 Ended";
        const timeLeft = giveaway.endTime > new Date() ? formatTimeRemaining(giveaway.endTime) : "Ended";
        
        embed.addFields({
          name: `${giveaway.title}`,
          value: `**Prize:** ${giveaway.prize}\n**Status:** ${status}\n**Participants:** ${participantCount}\n**Time Left:** ${timeLeft}\n**ID:** ${giveaway.id}`,
          inline: true
        });
      }

      if (giveaways.length > 10) {
        embed.setFooter({ text: `Showing first 10 of ${giveaways.length} giveaways` });
      }

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      logger.error("Error listing giveaways:", error);
      await interaction.reply({ content: "❌ Error retrieving giveaways.", ephemeral: true });
    }

    // Record command usage
    await storage.recordCommandUsage({
      commandName: "giveaway-list",
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
  },
};

// End giveaway command
const endGiveawayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway-end")
    .setDescription("End a giveaway early")
    .addIntegerOption(option =>
      option.setName("id")
        .setDescription("Giveaway ID")
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    if (!requirePermission(interaction, PermissionFlagsBits.ManageEvents, "Manage Events")) return;
    
    const giveawayId = interaction.options.getInteger("id", true);
    
    try {
      const giveaway = await storage.getGiveaway(giveawayId);
      
      if (!giveaway) {
        await interaction.reply({ content: "❌ Giveaway not found.", ephemeral: true });
        return;
      }

      if (giveaway.guildId !== interaction.guildId) {
        await interaction.reply({ content: "❌ This giveaway doesn't belong to this server.", ephemeral: true });
        return;
      }

      if (!giveaway.isActive) {
        await interaction.reply({ content: "❌ This giveaway has already ended.", ephemeral: true });
        return;
      }

      // End the giveaway
      await storage.updateGiveaway(giveawayId, { isActive: false });
      
      // Select winners and announce
      await selectAndAnnounceWinners(giveaway, interaction);

    } catch (error) {
      logger.error("Error ending giveaway:", error);
      await interaction.reply({ content: "❌ Error ending giveaway.", ephemeral: true });
    }

    // Record command usage
    await storage.recordCommandUsage({
      commandName: "giveaway-end",
      guildId: interaction.guildId!,
      userId: interaction.user.id,
    });
  },
};

// Helper function to select and announce winners
async function selectAndAnnounceWinners(giveaway: any, interaction: CommandInteraction) {
  try {
    const entries = await storage.getGiveawayEntries(giveaway.id);
    
    if (entries.length === 0) {
      await interaction.reply({ content: `❌ No one entered the giveaway for **${giveaway.prize}**!` });
      return;
    }

    // Create weighted array for selection
    const weightedEntries: string[] = [];
    entries.forEach(entry => {
      for (let i = 0; i < entry.entries; i++) {
        weightedEntries.push(entry.userId);
      }
    });

    // Select unique winners
    const winners = new Set<string>();
    const maxWinners = Math.min(giveaway.winnerCount, entries.length);
    
    while (winners.size < maxWinners && weightedEntries.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const winnerId = weightedEntries[randomIndex];
      winners.add(winnerId);
      
      // Remove all entries for this user to prevent duplicate wins
      for (let i = weightedEntries.length - 1; i >= 0; i--) {
        if (weightedEntries[i] === winnerId) {
          weightedEntries.splice(i, 1);
        }
      }
    }

    // Create winner announcement
    const winnersList = Array.from(winners).map(id => `<@${id}>`).join(", ");
    let announcementMessage = giveaway.winnerMessage
      .replace(/\{winner\}/g, winnersList)
      .replace(/\{prize\}/g, giveaway.prize);

    const embed = new EmbedBuilder()
      .setTitle("🎉 Giveaway Ended!")
      .setDescription(announcementMessage)
      .addFields(
        { name: "🎁 Prize", value: giveaway.prize, inline: true },
        { name: "🏆 Winner(s)", value: winnersList, inline: true },
        { name: "👥 Total Entries", value: entries.length.toString(), inline: true }
      )
      .setColor(giveaway.embedColor || '#00AE86')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Try to update the original message
    try {
      const channel = await interaction.client.channels.fetch(giveaway.channelId);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(giveaway.messageId);
        
        const endedEmbed = new EmbedBuilder()
          .setTitle(`${giveaway.title} (ENDED)`)
          .setDescription(giveaway.description || null)
          .addFields(
            { name: "🎁 Prize", value: giveaway.prize, inline: true },
            { name: "🏆 Winner(s)", value: winnersList, inline: true },
            { name: "👥 Total Entries", value: entries.length.toString(), inline: true }
          )
          .setColor('#FF0000')
          .setTimestamp()
          .setFooter({ text: "Giveaway ended" });

        await message.edit({ embeds: [endedEmbed], components: [] });
      }
    } catch (error) {
      logger.warn("Could not update original giveaway message:", error);
    }

  } catch (error) {
    logger.error("Error selecting winners:", error);
    await interaction.followUp({ content: "❌ Error selecting winners.", ephemeral: true });
  }
}

// Helper function to select winners
function selectWinners(entries: any[], count: number): string[] {
  const weightedEntries: string[] = [];
  
  entries.forEach(entry => {
    const entryCount = entry.entries || 1;
    for (let i = 0; i < entryCount; i++) {
      weightedEntries.push(entry.userId);
    }
  });

  const winners = new Set<string>();
  const maxWinners = Math.min(count, entries.length);
  
  while (winners.size < maxWinners && weightedEntries.length > 0) {
    const randomIndex = Math.floor(Math.random() * weightedEntries.length);
    const winnerId = weightedEntries[randomIndex];
    winners.add(winnerId);
    
    // Remove all entries for this user to prevent duplicate wins
    for (let i = weightedEntries.length - 1; i >= 0; i--) {
      if (weightedEntries[i] === winnerId) {
        weightedEntries.splice(i, 1);
      }
    }
  }

  return Array.from(winners);
}

const rerollGiveawayCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway-reroll")
    .setDescription("Reroll giveaway winners")
    .addStringOption(option =>
      option.setName("giveaway_id")
        .setDescription("Giveaway ID to reroll")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Reroll all winners or specific positions")
        .setRequired(false)
        .addChoices(
          { name: "All Winners", value: "all" },
          { name: "Specific Position", value: "position" }
        )
    )
    .addIntegerOption(option =>
      option.setName("position")
        .setDescription("Winner position to reroll (1st, 2nd, etc.)")
        .setRequired(false)
        .setMinValue(1)
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const giveawayId = parseInt(interaction.options.getString("giveaway_id", true));
    const rerollType = interaction.options.getString("type") || "all";
    const position = interaction.options.getInteger("position");

    if (rerollType === "position" && !position) {
      return await interaction.reply({
        content: "Please specify the position to reroll when using 'Specific Position' type!",
        ephemeral: true
      });
    }

    try {
      const giveaway = await storage.getGiveaway(giveawayId);
      if (!giveaway) {
        return await interaction.reply({
          content: "Giveaway not found!",
          ephemeral: true
        });
      }

      if (giveaway.isActive) {
        return await interaction.reply({
          content: "Cannot reroll winners for an active giveaway! End it first.",
          ephemeral: true
        });
      }

      // Get all entries for this giveaway
      const entries = await storage.getGiveawayEntries(giveawayId);
      if (entries.length === 0) {
        return await interaction.reply({
          content: "No entries found for this giveaway!",
          ephemeral: true
        });
      }

      // Get current winners
      const currentWinners = await storage.getGiveawayWinners(giveawayId);
      
      let newWinners: string[] = [];
      let rerolledPositions: number[] = [];

      if (rerollType === "all") {
        // Reroll all winners
        newWinners = selectWinners(entries, giveaway.winnerCount || 1);
        rerolledPositions = Array.from({ length: giveaway.winnerCount || 1 }, (_, i) => i + 1);
        
        // Mark all current winners as rerolled
        for (const winner of currentWinners) {
          await storage.markWinnerAsRerolled(winner.id);
        }
      } else {
        // Reroll specific position
        const positionToReroll = position!;
        if (positionToReroll > (giveaway.winnerCount || 1)) {
          return await interaction.reply({
            content: `Invalid position! This giveaway only has ${giveaway.winnerCount || 1} winner(s).`,
            ephemeral: true
          });
        }

        // Get eligible users (exclude other current winners)
        const otherWinnerIds = currentWinners
          .filter(w => w.position !== positionToReroll && !w.rerolled)
          .map(w => w.userId);
        
        const eligibleEntries = entries.filter(entry => !otherWinnerIds.includes(entry.userId));
        
        if (eligibleEntries.length === 0) {
          return await interaction.reply({
            content: "No eligible users to reroll for this position!",
            ephemeral: true
          });
        }

        // Select new winner for this position
        const newWinner = selectWinners(eligibleEntries, 1)[0];
        newWinners = [newWinner];
        rerolledPositions = [positionToReroll];

        // Mark the specific winner as rerolled
        const winnerToReroll = currentWinners.find(w => w.position === positionToReroll);
        if (winnerToReroll) {
          await storage.markWinnerAsRerolled(winnerToReroll.id);
        }
      }

      // Add new winners to database
      for (let i = 0; i < newWinners.length; i++) {
        await storage.addGiveawayWinner({
          giveawayId,
          userId: newWinners[i],
          position: rerolledPositions[i],
          rerolled: false
        });
      }

      // Send reroll announcement
      const channel = await interaction.client.channels.fetch(giveaway.channelId);
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor("#FF6B35")
          .setTitle("🔄 Giveaway Reroll!")
          .setDescription(`**${giveaway.title}**\n${giveaway.description || ""}`);

        if (rerollType === "all") {
          let winnerText = "";
          for (let i = 0; i < newWinners.length; i++) {
            winnerText += `${i + 1}. <@${newWinners[i]}>\n`;
          }
          embed.addFields({ 
            name: `🎉 New Winner${newWinners.length > 1 ? 's' : ''}`, 
            value: winnerText, 
            inline: false 
          });
        } else {
          embed.addFields({ 
            name: `🎉 New Winner (Position ${position})`, 
            value: `<@${newWinners[0]}>`, 
            inline: false 
          });
        }

        embed.setFooter({ text: `Prize: ${giveaway.prize}` });

        await channel.send({ embeds: [embed] });
      }

      const rerollMessage = rerollType === "all" 
        ? `Successfully rerolled all winners for giveaway #${giveawayId}!`
        : `Successfully rerolled position ${position} for giveaway #${giveawayId}!`;

      await interaction.reply({ content: rerollMessage, ephemeral: true });

    } catch (error) {
      console.error("Error rerolling giveaway:", error);
      await interaction.reply({
        content: "An error occurred while rerolling the giveaway.",
        ephemeral: true
      });
    }
  }
};

export const giveawayCommands: SlashCommand[] = [
  createGiveawayCommand,
  listGiveawaysCommand,
  endGiveawayCommand,
  rerollGiveawayCommand,
];