import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_BOT_TOKEN と DISCORD_CLIENT_ID を .env に設定してください。");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const body = commands.map((c) => c.data.toJSON());

async function main() {
  if (guildId) {
    // ギルド限定登録は反映が早いため開発時向け
    await rest.put(Routes.applicationGuildCommands(clientId!, guildId), { body });
    console.log(`Registered ${body.length} commands to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId!), { body });
    console.log(`Registered ${body.length} global commands`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
