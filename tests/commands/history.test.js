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
      const limitMock = vi.fn().mockResolvedValue({
        data: [
          {
            discord_username: "David",
            item: "Bone Blocks",
            quantity: 64,
            total_cost: 2000000,
            created_at: "2026-03-18T10:00:00Z",
          },
        ],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: limitMock }),
            }),
          }),
        }),
      };
    }
    if (table === "sales") {
      const limitMock = vi.fn().mockResolvedValue({
        data: [
          {
            discord_username: "Alex",
            quantity: 128,
            total_revenue: 5000000,
            created_at: "2026-03-19T14:00:00Z",
          },
        ],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: limitMock }),
            }),
          }),
        }),
      };
    }
    if (table === "payouts") {
      const limitMock = vi.fn().mockResolvedValue({
        data: [
          {
            settled_at: "2026-03-15T00:00:00Z",
            total_revenue: 20000000,
            total_profit: 5000000,
          },
        ],
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ limit: limitMock }),
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handleHistory } from "../../src/commands/history.js";

describe("handleHistory", () => {
  it("uses_active_farm_when_farm_id_is_omitted", async () => {
    const result = await handleHistory({
      member: { user: { id: "1" } },
      data: { options: [] },
    });

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.embeds[0].description).toContain("kelp-1");
  });

  it("returns_missing_farm_when_no_explicit_or_active_farm", async () => {
    mockState.activeFarm = null;

    const result = await handleHistory({
      member: { user: { id: "1" } },
      data: { options: [] },
    });
    expect(result.data.embeds[0].title).toBe("Missing farm");

    mockState.activeFarm = { farm_id: "kelp-1", expires_at: "2099-01-01T00:00:00Z" };
  });

  it("shows_current_transactions_and_past_cycles", async () => {
    const result = await handleHistory({ data: { options: [{ name: "farm_id", value: "kelp-1" }] } });

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("History");
    expect(embed.description).toContain("kelp-1");

    const transactions = embed.fields.find((f) => f.name === "Current Cycle");
    expect(transactions.value).toContain("David");
    expect(transactions.value).toContain("Bone Blocks");
    expect(transactions.value).toContain("Alex");
    expect(transactions.value).toContain("sold");

    const pastCycles = embed.fields.find((f) => f.name === "Past Cycles");
    expect(pastCycles.value).toContain("$5,000,000");

    expect(embed.image.url).toContain("quickchart.io");
  });
});
