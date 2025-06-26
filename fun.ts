import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { storage } from "../../server/storage";
import { checkRateLimit } from "../utils/permissions";

const rollCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption(option =>
      option.setName("sides")
        .setDescription("Number of sides on the dice (default: 6)")
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName("count")
        .setDescription("Number of dice to roll (default: 1)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)),
  
  async execute(interaction: CommandInteraction) {
    if (!checkRateLimit(interaction.user.id, "roll", 10, 60000)) {
      await interaction.reply({ content: "❌ You're rolling too fast! Please wait.", ephemeral: true });
      return;
    }

    const sides = interaction.options.getInteger("sides") || 6;
    const count = interaction.options.getInteger("count") || 1;
    
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    const average = (total / count).toFixed(1);
    
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle("🎲 Dice Roll")
      .addFields(
        { name: "Dice", value: `${count}d${sides}`, inline: true },
        { name: "Results", value: rolls.join(", "), inline: true },
        { name: "Total", value: total.toString(), inline: true }
      );
    
    if (count > 1) {
      embed.addFields({ name: "Average", value: average, inline: true });
    }
    
    embed.setFooter({ text: `Rolled by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "roll",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const jokeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Get a random joke"),
  
  async execute(interaction: CommandInteraction) {
    if (!checkRateLimit(interaction.user.id, "joke", 5, 60000)) {
      await interaction.reply({ content: "❌ Too many jokes! Please wait a bit.", ephemeral: true });
      return;
    }

    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "Why did the scarecrow win an award? He was outstanding in his field!",
      "Why don't eggs tell jokes? They'd crack each other up!",
      "What do you call a fake noodle? An impasta!",
      "Why did the math book look so sad? Because it had too many problems!",
      "What do you call a bear with no teeth? A gummy bear!",
      "Why don't programmers like nature? It has too many bugs!",
      "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "What did the ocean say to the beach? Nothing, it just waved!",
      "Why don't skeletons fight each other? They don't have the guts!",
      "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks!",
      "Why did the coffee file a police report? It got mugged!",
      "What do you call a sleeping bull? A bulldozer!",
      "Why don't scientists trust stairs? Because they're always up to something!"
    ];

    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    
    const embed = new EmbedBuilder()
      .setColor(0xFFE135)
      .setTitle("😂 Random Joke")
      .setDescription(randomJoke)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "joke",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const factCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("fact")
    .setDescription("Get a random interesting fact"),
  
  async execute(interaction: CommandInteraction) {
    if (!checkRateLimit(interaction.user.id, "fact", 5, 60000)) {
      await interaction.reply({ content: "❌ Too many facts! Please wait a bit.", ephemeral: true });
      return;
    }

    const facts = [
      "A group of flamingos is called a 'flamboyance'.",
      "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
      "Octopuses have three hearts and blue blood.",
      "A day on Venus is longer than its year.",
      "Bananas are berries, but strawberries aren't.",
      "There are more possible games of chess than atoms in the observable universe.",
      "Dolphins have names for each other.",
      "The shortest war in history lasted only 38-45 minutes.",
      "Your stomach gets an entirely new lining every 3-4 days.",
      "A group of pandas is called an 'embarrassment'.",
      "Sea otters hold hands when they sleep to keep from drifting apart.",
      "The human brain contains approximately 86 billion neurons.",
      "A single cloud can weigh more than a million pounds.",
      "Butterflies taste with their feet.",
      "The Great Wall of China isn't visible from space with the naked eye."
    ];

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    
    const embed = new EmbedBuilder()
      .setColor(0x4ECDC4)
      .setTitle("🧠 Did You Know?")
      .setDescription(randomFact)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "fact",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

const coinflipCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),
  
  async execute(interaction: CommandInteraction) {
    if (!checkRateLimit(interaction.user.id, "coinflip", 10, 60000)) {
      await interaction.reply({ content: "❌ Stop flipping so much! Please wait.", ephemeral: true });
      return;
    }

    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? "🟡" : "⚪";
    
    const embed = new EmbedBuilder()
      .setColor(result === "Heads" ? 0xFFD700 : 0xC0C0C0)
      .setTitle("🪙 Coin Flip")
      .setDescription(`${emoji} **${result}**`)
      .setFooter({ text: `Flipped by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Record command usage
    if (interaction.guildId) {
      await storage.recordCommandUsage({
        commandName: "coinflip",
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
    }
  },
};

export const funCommands: SlashCommand[] = [
  rollCommand,
  jokeCommand,
  factCommand,
  coinflipCommand,
];
