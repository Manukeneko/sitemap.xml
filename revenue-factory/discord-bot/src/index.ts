import { Client, GatewayIntentBits, Events } from "discord.js";
import { commands } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN を .env に設定してください。");
  process.exit(1);
}

const commandMap = new Map(commands.map((c) => [c.data.name, c]));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`AI収益工場 Discord Bot 起動: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`command ${interaction.commandName} failed`, err);
    const message = `エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

client.login(token);
