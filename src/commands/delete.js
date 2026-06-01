import { InteractionResponseType } from "discord-interactions";

import { registerApplicationCommands } from "../lib/command-registration.js";
import { listFarmIds, normalizeFarmId } from "../lib/farms.js";
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

export async function handleDelete(interaction) {
  if (interaction.data.options?.[0]?.name !== "farm") {
    return buildEmbed("Invalid command", "Only `/delete farm` is supported right now.", 0xff0000);
  }

  const farmId = getNestedFarmId(interaction);

  let existingFarmIds;
  try {
    existingFarmIds = await listFarmIds();
  } catch (error) {
    return buildEmbed("Failed to load farms", error.message, 0xff0000);
  }

  if (!existingFarmIds.includes(farmId)) {
    return buildEmbed("Farm not found", `Farm ID \`${farmId}\` does not exist.`, 0xffaa00);
  }

  const { error } = await supabase.from("farms").delete().eq("farm_id", farmId);
  if (error) {
    return buildEmbed("Failed to delete farm", error.message, 0xff0000);
  }

  void registerApplicationCommands({
      farmIds: existingFarmIds.filter((existingFarmId) => existingFarmId !== farmId),
    }).catch((refreshError) => {
      console.error("Failed to refresh commands after farm deletion:", refreshError);
    });

  const description = `Farm ID \`${farmId}\` was removed. Dropdown refresh is running in the background and may take up to a minute.`;

  return buildEmbed("Farm Deleted", description, 0x57f287);
}