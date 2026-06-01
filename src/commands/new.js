import { InteractionResponseType } from "discord-interactions";

import { registerApplicationCommands } from "../lib/command-registration.js";
import { listFarmIds, normalizeFarmId, validateFarmId } from "../lib/farms.js";
import supabase from "../lib/supabase.js";

function getNestedFarmId(interaction) {
  const subcommandOptions = interaction.data.options?.[0]?.options || [];
  return normalizeFarmId(subcommandOptions.find((option) => option.name === "farm_id")?.value);
}

function buildEmbed(title, description, color) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{ title, description, color }],
    },
  };
}

export async function handleNew(interaction) {
  if (interaction.data.options?.[0]?.name !== "farm") {
    return buildEmbed("Invalid command", "Only `/new farm` is supported right now.", 0xff0000);
  }

  const farmId = getNestedFarmId(interaction);
  const validationError = validateFarmId(farmId);
  if (validationError) {
    return buildEmbed("Invalid farm ID", validationError, 0xff0000);
  }

  let existingFarmIds;
  try {
    existingFarmIds = await listFarmIds();
  } catch (error) {
    return buildEmbed("Failed to load farms", error.message, 0xff0000);
  }

  if (existingFarmIds.includes(farmId)) {
    return buildEmbed("Farm already exists", `Farm ID \`${farmId}\` already exists.`, 0xffaa00);
  }

  if (existingFarmIds.length >= 25) {
    return buildEmbed(
      "Farm limit reached",
      "Discord choice dropdowns only support 25 farms. Delete one before creating another.",
      0xff0000,
    );
  }

  const { error } = await supabase.from("farms").insert({ farm_id: farmId });
  if (error) {
    return buildEmbed("Failed to create farm", error.message, 0xff0000);
  }

  void registerApplicationCommands({
      farmIds: [...existingFarmIds, farmId].sort((left, right) => left.localeCompare(right)),
    }).catch((refreshError) => {
      console.error("Failed to refresh commands after farm creation:", refreshError);
    });

  const description = `Farm ID \`${farmId}\` is now available. Dropdown refresh is running in the background and may take up to a minute.`;

  return buildEmbed("Farm Created", description, 0x57f287);
}