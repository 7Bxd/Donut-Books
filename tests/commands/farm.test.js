import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockUpsert } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "farms") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ farm_id: "kelp-1" }, { farm_id: "kelp-2" }],
            error: null,
          }),
        }),
      };
    }

    if (table === "active_farm_selections") {
      return {
        upsert: mockUpsert,
      };
    }
  });

  return { default: { from: fromMock } };
});

import { handleFarm } from "../../src/commands/farm.js";

function makeInteraction(farmId) {
  return {
    guild_id: "guild-1",
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [{ name: "farm_id", value: farmId }],
    },
  };
}

describe("handleFarm", () => {
  it("sets_active_farm_for_one_hour", async () => {
    const result = await handleFarm(makeInteraction("kelp-2"));

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.embeds[0].title).toBe("Active Farm Set");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        discord_user_id: "123456",
        scope_id: "guild:guild-1",
        farm_id: "kelp-2",
      }),
      { onConflict: "discord_user_id,scope_id" },
    );
  });

  it("rejects_unknown_farm", async () => {
    const result = await handleFarm(makeInteraction("kelp-9"));

    expect(result.data.embeds[0].title).toBe("Farm not found");
  });
});
