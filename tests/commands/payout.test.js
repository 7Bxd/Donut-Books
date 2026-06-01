import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const mockExpenseUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    is: vi.fn().mockResolvedValue({ error: null }),
  }),
});

const mockSaleUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    is: vi.fn().mockResolvedValue({ error: null }),
  }),
});

const mockPayoutInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: { id: "payout-uuid" },
      error: null,
    }),
  }),
});

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      const isMock = vi.fn().mockResolvedValue({
        data: [
          { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
          { discord_user_id: "2", discord_username: "Alex", total_cost: 5000000 },
        ],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ is: isMock }),
        }),
        update: mockExpenseUpdate,
      };
    }
    if (table === "sales") {
      const isMock = vi.fn().mockResolvedValue({
        data: [{ discord_user_id: "1", discord_username: "David", total_revenue: 20000000 }],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ is: isMock }),
        }),
        update: mockSaleUpdate,
      };
    }
    if (table === "payouts") {
      return {
        insert: mockPayoutInsert,
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handlePayout } from "../../src/commands/payout.js";

describe("handlePayout", () => {
  it("settles_cycle_and_shows_embed_breakdown", async () => {
    const interaction = {
      data: { options: [{ name: "farm_id", value: "kelp-1" }] },
      member: { user: { id: "1" } },
    };
    const result = await handlePayout(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Payout Settled");
    expect(embed.fields).toContainEqual({ name: "Farm ID", value: "kelp-1", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Expenses", value: "$15,000,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Revenue", value: "$20,000,000", inline: true });

    const breakdown = embed.fields.find((f) => f.name === "Player Breakdown");
    expect(breakdown.value).toContain("David");
    expect(breakdown.value).toContain("Alex");

    // David sold $20M, owed $13.33M -> pays Alex $6,666,667
    const settlements = embed.fields.find((f) => f.name === "Settlements");
    expect(settlements.value).toContain("**David** → **Alex**");
    expect(mockPayoutInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: "kelp-1" }));
  });
});
