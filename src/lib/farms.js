import supabase from "./supabase.js";

export const FARM_ID_OPTION_NAME = "farm_id";
export const ACTIVE_FARM_DURATION_SECONDS = 60 * 60;
export const ACTIVE_FARM_DURATION_MS = ACTIVE_FARM_DURATION_SECONDS * 1000;
const FARM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export async function listFarmIds() {
  const { data, error } = await supabase
    .from("farms")
    .select("farm_id")
    .order("farm_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load farms: ${error.message}`);
  }

  return data.map((farm) => farm.farm_id);
}

export function buildFarmIdOption({ required = true, description = "Farm ID", farmIds = [] } = {}) {
  const option = {
    name: FARM_ID_OPTION_NAME,
    description,
    type: 3,
    required,
  };

  if (farmIds.length > 0) {
    option.choices = farmIds.slice(0, 25).map((farmId) => ({
      name: farmId,
      value: farmId,
    }));
  }

  return option;
}

export function normalizeFarmId(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateFarmId(farmId) {
  if (!farmId) {
    return "Farm ID is required.";
  }

  if (farmId.length > 32) {
    return "Farm ID must be 32 characters or fewer.";
  }

  if (!FARM_ID_PATTERN.test(farmId)) {
    return "Farm ID can only include letters, numbers, hyphens, and underscores.";
  }

  return null;
}

export function getFarmIdOptionValue(options = []) {
  return normalizeFarmId(options.find((option) => option.name === FARM_ID_OPTION_NAME)?.value);
}

function getInteractionUserId(interaction) {
  return interaction.member?.user?.id ?? interaction.user?.id ?? null;
}

function getInteractionScopeId(interaction) {
  if (interaction.guild_id) {
    return `guild:${interaction.guild_id}`;
  }

  if (interaction.channel_id) {
    return `dm:${interaction.channel_id}`;
  }

  return "dm:unknown";
}

export async function setActiveFarmSelection(interaction, farmId) {
  const discordUserId = getInteractionUserId(interaction);
  if (!discordUserId) {
    throw new Error("Could not determine the Discord user for active farm selection.");
  }

  const scopeId = getInteractionScopeId(interaction);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ACTIVE_FARM_DURATION_MS).toISOString();

  const { error } = await supabase.from("active_farm_selections").upsert(
    {
      discord_user_id: discordUserId,
      scope_id: scopeId,
      farm_id: farmId,
      expires_at: expiresAt,
      updated_at: nowIso,
    },
    {
      onConflict: "discord_user_id,scope_id",
    },
  );

  if (error) {
    throw new Error(`Failed to save active farm: ${error.message}`);
  }

  return { expiresAt };
}

export async function getActiveFarmSelection(interaction) {
  const discordUserId = getInteractionUserId(interaction);
  if (!discordUserId) {
    return null;
  }

  const scopeId = getInteractionScopeId(interaction);

  const { data, error } = await supabase
    .from("active_farm_selections")
    .select("farm_id, expires_at")
    .eq("discord_user_id", discordUserId)
    .eq("scope_id", scopeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active farm: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const expiresAtMs = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    await supabase
      .from("active_farm_selections")
      .delete()
      .eq("discord_user_id", discordUserId)
      .eq("scope_id", scopeId);

    return null;
  }

  return data.farm_id;
}

async function farmExists(farmId) {
  const { data, error } = await supabase
    .from("farms")
    .select("farm_id")
    .eq("farm_id", farmId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify farm: ${error.message}`);
  }

  return Boolean(data);
}

export async function resolveFarmIdForCommand(interaction) {
  const options = interaction.data?.options || [];
  const explicitFarmId = getFarmIdOptionValue(options);
  if (explicitFarmId) {
    const validationError = validateFarmId(explicitFarmId);
    if (validationError) {
      return { error: validationError };
    }

    if (!(await farmExists(explicitFarmId))) {
      return { error: `Farm ID \`${explicitFarmId}\` does not exist.` };
    }

    return { farmId: explicitFarmId };
  }

  const activeFarmId = await getActiveFarmSelection(interaction);
  if (activeFarmId) {
    if (!(await farmExists(activeFarmId))) {
      return { error: `Your active farm \`${activeFarmId}\` no longer exists. Provide \`farm_id\` or run \`/farm\` again.` };
    }

    return { farmId: activeFarmId };
  }

  return {
    error: "No farm selected. Provide `farm_id` on this command or run `/farm` first (lasts 1 hour).",
  };
}