import { InteractionResponseType } from "discord-interactions";

import {
  ACTIVE_FARM_DURATION_SECONDS,
  getFarmIdOptionValue,
  listFarmIds,
  setActiveFarmSelection,
} from "../lib/farms.js";

function buildEmbed(title, description, color) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{ title, description, color }],
    },
  };
}

export async function handleFarm(interaction) {
  const options = interaction.data.options || [];
  const farmId = getFarmIdOptionValue(options);

  if (!farmId) {
    return buildEmbed("Missing farm", "Pick a farm ID for `/farm`.", 0xff0000);
  }

  let farmIds;
  try {
    farmIds = await listFarmIds();
  } catch (error) {
    return buildEmbed("Failed to load farms", error.message, 0xff0000);
  }

  if (!farmIds.includes(farmId)) {
    return buildEmbed("Farm not found", `Farm ID \`${farmId}\` does not exist.`, 0xffaa00);
  }

  try {
    await setActiveFarmSelection(interaction, farmId);
  } catch (error) {
    return buildEmbed("Failed to set active farm", error.message, 0xff0000);
  }

  return buildEmbed(
    "Active Farm Set",
    `Using farm \`${farmId}\` for the next ${Math.floor(ACTIVE_FARM_DURATION_SECONDS / 60)} minutes when \`farm_id\` is omitted.`,
    0x57f287,
  );
}