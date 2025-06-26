import { Client, Events, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from "discord.js";
import { storage } from "../../server/storage";
import { logger } from "../utils/logger";

export function setupButtonInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, user, guild, message } = interaction;

    try {
      if (customId === "giveaway_enter") {
        await handleGiveawayEntry(interaction);
      } else if (customId === "giveaway_participants") {
        await handleViewParticipants(interaction);
      } else if (customId === "giveaway_confirm") {
        await handleGiveawayConfirm(interaction);
      } else if (customId === "giveaway_cancel") {
        await handleGiveawayCancel(interaction);
      }
    } catch (error) {
      logger.error("Error handling button interaction:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: "❌ An error occurred while processing your request.", 
          ephemeral: true 
        });
      }
    }
  });
}

async function handleGiveawayEntry(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.message) return;

  const giveaway = await storage.getGiveawayByMessageId(interaction.message.id);
  
  if (!giveaway) {
    await interaction.reply({ content: "❌ Giveaway not found.", ephemeral: true });
    return;
  }

  if (!giveaway.isActive || giveaway.endTime <= new Date()) {
    await interaction.reply({ content: "❌ This giveaway has ended.", ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;

  // Check required roles
  if (giveaway.requiredRoles && giveaway.requiredRoles.length > 0) {
    const hasRequiredRole = giveaway.requiredRoles.some(roleId => 
      member.roles.cache.has(roleId)
    );
    
    if (!hasRequiredRole) {
      const roleNames = giveaway.requiredRoles.map(roleId => {
        const role = interaction.guild!.roles.cache.get(roleId);
        return role ? `@${role.name}` : roleId;
      }).join(", ");
      
      await interaction.reply({ 
        content: `❌ You need one of these roles to enter: ${roleNames}`, 
        ephemeral: true 
      });
      return;
    }
  }

  // Check if user is already entered
  const existingEntry = await storage.getGiveawayEntry(giveaway.id, interaction.user.id);
  
  if (existingEntry) {
    await interaction.reply({ content: "❌ You're already entered in this giveaway!", ephemeral: true });
    return;
  }

  // Calculate entries
  let entries = 1;
  if (giveaway.bonusRoles && giveaway.bonusRoles.length > 0) {
    const hasBonusRole = giveaway.bonusRoles.some(roleId => 
      member.roles.cache.has(roleId)
    );
    
    if (hasBonusRole) {
      entries += giveaway.bonusEntries || 1;
    }
  }

  // Add entry
  try {
    await storage.createGiveawayEntry({
      giveawayId: giveaway.id,
      userId: interaction.user.id,
      entries
    });

    const participantCount = await storage.getGiveawayParticipantCount(giveaway.id);

    // Update the giveaway message
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    
    // Update entries field
    const fields = embed.data.fields || [];
    const entriesFieldIndex = fields.findIndex(field => field.name === "👥 Entries");
    if (entriesFieldIndex !== -1) {
      fields[entriesFieldIndex].value = participantCount.toString();
    }

    // Update time left field
    const timeLeftFieldIndex = fields.findIndex(field => field.name === "⏱️ Time Left");
    if (timeLeftFieldIndex !== -1) {
      const timeLeft = giveaway.endTime > new Date() 
        ? formatTimeRemaining(giveaway.endTime) 
        : "Ended";
      fields[timeLeftFieldIndex].value = timeLeft;
    }

    embed.setFields(fields);

    await interaction.update({ embeds: [embed] });

    // Send confirmation
    let confirmMessage = `✅ You're now entered in the giveaway for **${giveaway.prize}**!`;
    if (entries > 1) {
      confirmMessage += ` You have **${entries} entries** due to your bonus roles.`;
    }

    await interaction.followUp({ content: confirmMessage, ephemeral: true });

  } catch (error) {
    logger.error("Error adding giveaway entry:", error);
    await interaction.reply({ content: "❌ Error entering giveaway. Please try again.", ephemeral: true });
  }
}

async function handleViewParticipants(interaction: ButtonInteraction) {
  if (!interaction.message) return;

  const giveaway = await storage.getGiveawayByMessageId(interaction.message.id);
  
  if (!giveaway) {
    await interaction.reply({ content: "❌ Giveaway not found.", ephemeral: true });
    return;
  }

  const entries = await storage.getGiveawayEntries(giveaway.id);
  
  if (entries.length === 0) {
    await interaction.reply({ content: "No participants yet!", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`👥 Giveaway Participants`)
    .setDescription(`**Prize:** ${giveaway.prize}`)
    .setColor(giveaway.embedColor || '#00AE86')
    .addFields(
      { name: "Total Participants", value: entries.length.toString(), inline: true },
      { name: "Total Entries", value: entries.reduce((sum, entry) => sum + entry.entries, 0).toString(), inline: true }
    );

  // Show first 20 participants
  const participantList = entries.slice(0, 20).map((entry, index) => {
    const entriesText = entry.entries > 1 ? ` (${entry.entries} entries)` : "";
    return `${index + 1}. <@${entry.userId}>${entriesText}`;
  }).join("\n");

  embed.addFields({ 
    name: "Participants", 
    value: participantList || "None", 
    inline: false 
  });

  if (entries.length > 20) {
    embed.setFooter({ text: `Showing first 20 of ${entries.length} participants` });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleGiveawayConfirm(interaction: ButtonInteraction) {
  const previewData = (global as any).giveawayPreview;
  
  if (!previewData || previewData.userId !== interaction.user.id) {
    await interaction.reply({ content: "❌ Preview data not found or unauthorized.", ephemeral: true });
    return;
  }

  try {
    // Get the channel
    const channel = await interaction.client.channels.fetch(previewData.channelId);
    
    if (!channel?.isTextBased()) {
      await interaction.reply({ content: "❌ Invalid channel.", ephemeral: true });
      return;
    }

    // Post the giveaway
    const message = await channel.send({
      embeds: [previewData.embed],
      components: previewData.components
    });

    // Save to storage
    await storage.createGiveaway({
      messageId: message.id,
      channelId: previewData.channelId,
      guildId: previewData.guildId,
      hostId: previewData.userId,
      title: previewData.title,
      description: previewData.description,
      prize: previewData.prize,
      winnerCount: previewData.winnerCount,
      endTime: previewData.endTime,
      embedColor: previewData.embedColor,
      buttonEmoji: previewData.buttonEmoji,
      buttonText: previewData.buttonText,
      requiredRoles: previewData.requiredRoles,
      bonusRoles: previewData.bonusRoles,
      bonusEntries: previewData.bonusEntries,
      winnerMessage: previewData.winnerMessage,
      isActive: true
    });

    await interaction.update({ 
      content: "✅ Giveaway posted successfully!", 
      embeds: [], 
      components: [] 
    });

    // Clean up preview data
    delete (global as any).giveawayPreview;

    logger.info(`Giveaway posted: ${previewData.title}`);

  } catch (error) {
    logger.error("Error posting giveaway:", error);
    await interaction.reply({ content: "❌ Error posting giveaway.", ephemeral: true });
  }
}

async function handleGiveawayCancel(interaction: ButtonInteraction) {
  const previewData = (global as any).giveawayPreview;
  
  if (!previewData || previewData.userId !== interaction.user.id) {
    await interaction.reply({ content: "❌ Preview data not found or unauthorized.", ephemeral: true });
    return;
  }

  await interaction.update({ 
    content: "❌ Giveaway cancelled.", 
    embeds: [], 
    components: [] 
  });

  // Clean up preview data
  delete (global as any).giveawayPreview;
}

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