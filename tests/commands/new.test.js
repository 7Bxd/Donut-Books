import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockInsert, mockRegisterApplicationCommands } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
  mockRegisterApplicationCommands: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "farms") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ farm_id: "kelp-1" }],
            error: null,
          }),
        }),
        insert: mockInsert,
      };
    }
  });

  return { default: { from: fromMock } };
});

vi.mock("../../src/lib/command-registration.js", () => ({
  registerApplicationCommands: mockRegisterApplicationCommands,
}));

import { handleNew } from "../../src/commands/new.js";

function makeInteraction(farmId) {
  return {
    data: {
      options: [
        {
          name: "farm",
          options: [{ name: "farm_id", value: farmId }],
        },
      ],
    },
  };
}

describe("handleNew", () => {
  it("creates_a_farm_and_refreshes_commands", async () => {
    const result = await handleNew(makeInteraction("kelp-2"));

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.embeds[0].title).toBe("Farm Created");
    expect(mockInsert).toHaveBeenCalledWith({ farm_id: "kelp-2" });
    expect(mockRegisterApplicationCommands).toHaveBeenCalledWith({ farmIds: ["kelp-1", "kelp-2"] });
  });

  it("rejects_duplicate_farms", async () => {
    const result = await handleNew(makeInteraction("kelp-1"));

    expect(result.data.embeds[0].title).toBe("Farm already exists");
  });
});