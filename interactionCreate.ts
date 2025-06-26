import { Client, Events, CommandInteraction } from "discord.js";
import { ExtendedClient } from "../types";
import { logger } from "../utils/logger";

export function setupInteractionCreateEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const extendedClient = client as ExtendedClient;
    const command = extendedClient.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      await interaction.reply({ 
        content: "❌ Unknown command. This command might have been removed or is temporarily unavailable.", 
        ephemeral: true 
      });
      return;
    }

    try {
      logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      const errorMessage = "❌ There was an error executing this command. Please try again later.";
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });
}
