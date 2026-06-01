import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockState } = vi.hoisted(() => ({
  mockState: {
    activeFarm: { farm_id: "kelp-1", expires_at: "2099-01-01T00:00:00Z" },
  },
}));

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "active_farm_selections") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockState.activeFarm, error: null }),
            }),
          }),
        }),
      };
    }

    if (table === "farms") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_, farmId) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: farmId === "kelp-1" ? { farm_id: farmId } : null,
              error: null,
            }),
          })),
        }),
      };
    }

    if (table === "expenses") {
      const isMock = vi.fn().mockResolvedValue({
        data: [
          { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
          { discord_user_id: "2", discord_username: "Alex", total_cost: 3000000 },
          { discord_user_id: "1", discord_username: "David", total_cost: 2000000 },
        ],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ is: isMock }),
        }),
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
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handleBalance } from "../../src/commands/balance.js";

describe("handleBalance", () => {
  it("uses_active_farm_when_farm_id_is_omitted", async () => {
    const interaction = { data: { options: [] }, member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.embeds[0].fields).toContainEqual({ name: "Farm ID", value: "kelp-1", inline: true });
  });

  it("returns_missing_farm_when_no_explicit_or_active_farm", async () => {
    mockState.activeFarm = null;

    const interaction = { data: { options: [] }, member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.data.embeds[0].title).toBe("Missing farm");

    mockState.activeFarm = { farm_id: "kelp-1", expires_at: "2099-01-01T00:00:00Z" };
  });

  it("shows_proportional_breakdown_in_embed", async () => {
    const interaction = { data: { options: [{ name: "farm_id", value: "kelp-1" }] }, member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Current Cycle");
    expect(embed.fields).toContainEqual({ name: "Farm ID", value: "kelp-1", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Expenses", value: "$15,000,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Revenue", value: "$20,000,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Profit", value: "$5,000,000", inline: true });

    const breakdown = embed.fields.find((f) => f.name === "Player Breakdown");
    expect(breakdown.value).toContain("David");
    expect(breakdown.value).toContain("Alex");

    const salesBreakdown = embed.fields.find((f) => f.name === "Sales Breakdown");
    expect(salesBreakdown.value).toContain("David");
    expect(salesBreakdown.value).toContain("$20,000,000");
  });
});
