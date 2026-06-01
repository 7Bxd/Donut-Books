import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockDeleteEq, mockRegisterApplicationCommands } = vi.hoisted(() => ({
  mockDeleteEq: vi.fn().mockResolvedValue({ error: null }),
  mockRegisterApplicationCommands: vi.fn().mockResolvedValue([]),
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
        delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
      };
    }
  });

  return { default: { from: fromMock } };
});

vi.mock("../../src/lib/command-registration.js", () => ({
  registerApplicationCommands: mockRegisterApplicationCommands,
}));

import { handleDelete } from "../../src/commands/delete.js";

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

describe("handleDelete", () => {
  it("deletes_a_farm_and_refreshes_commands", async () => {
    const result = await handleDelete(makeInteraction("kelp-2"));

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.embeds[0].title).toBe("Farm Deleted");
    expect(mockDeleteEq).toHaveBeenCalledWith("farm_id", "kelp-2");
    expect(mockRegisterApplicationCommands).toHaveBeenCalledWith({ farmIds: ["kelp-1"] });
  });

  it("rejects_unknown_farms", async () => {
    const result = await handleDelete(makeInteraction("kelp-9"));

    expect(result.data.embeds[0].title).toBe("Farm not found");
  });
});