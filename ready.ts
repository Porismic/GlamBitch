import { Client, Events, ActivityType } from "discord.js";
import { logger } from "../utils/logger";
import { storage } from "../../server/storage";

export function setupReadyEvent(client: Client): void {
  client.once(Events.ClientReady, async (readyClient) => {
    logger.success(`🤖 Bot is ready! Logged in as ${readyClient.user.tag}`);
    logger.info(`📊 Serving ${readyClient.guilds.cache.size} guilds with ${readyClient.users.cache.size} users`);

    // Set bot status
    const activities = [
      { name: "with Discord.js", type: ActivityType.Playing },
      { name: "your commands", type: ActivityType.Listening },
      { name: "the server", type: ActivityType.Watching },
      { name: "/help for commands", type: ActivityType.Playing },
    ];

    let currentActivityIndex = 0;
    
    const updateActivity = () => {
      const activity = activities[currentActivityIndex];
      readyClient.user.setActivity(activity.name, { type: activity.type });
      currentActivityIndex = (currentActivityIndex + 1) % activities.length;
    };

    // Set initial activity
    updateActivity();
    
    // Update activity every 30 minutes
    setInterval(updateActivity, 30 * 60 * 1000);

    // Initialize guilds in storage
    for (const guild of readyClient.guilds.cache.values()) {
      const existingGuild = await storage.getGuild(guild.id);
      if (!existingGuild) {
        await storage.createGuild({
          id: guild.id,
          name: guild.name,
          prefix: "!",
          moderationEnabled: true,
        });
        logger.info(`📝 Initialized guild: ${guild.name} (${guild.id})`);
      }
    }
  });
}
