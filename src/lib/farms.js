import supabase from "./supabase.js";

export const FARM_ID_OPTION_NAME = "farm_id";
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