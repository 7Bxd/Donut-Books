import "dotenv/config";

import { buildApplicationCommands } from "./commands.js";
import { listFarmIds } from "./farms.js";

const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function registerApplicationCommands({ farmIds } = {}) {
  const resolvedFarmIds = farmIds ?? await listFarmIds();
  const commands = buildApplicationCommands(resolvedFarmIds);
  const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to register commands: ${response.status} ${text}`);
  }

  return response.json();
}