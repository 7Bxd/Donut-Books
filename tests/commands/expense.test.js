import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("../../src/lib/supabase.js", () => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { farm_id: "kelp-2", expires_at: "2099-01-01T00:00:00Z" }, error: null });

  const fromMock = vi.fn((table) => {
    if (table === "active_farm_selections") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      };
    }

    if (table === "expenses") {
      return { insert: mockInsert };
    }

    return {};
  });

  return {
    default: {
      from: fromMock,
    },
  };
});

import { handleExpense } from "../../src/commands/expense.js";

function makeInteraction(farmId, item, quantity, pricingOptions) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "farm_id", value: farmId },
        { name: "item", value: item },
        { name: "quantity", value: quantity },
        ...pricingOptions,
      ],
    },
  };
}

describe("handleExpense", () => {
  it("logs_an_expense_from_total_and_returns_embed", async () => {
    const interaction = makeInteraction("kelp-1", "Bone Blocks", 300000, [
      { name: "total", value: "10m" },
    ]);
    const result = await handleExpense(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Expense Logged");
    expect(embed.fields).toContainEqual({ name: "Farm ID", value: "kelp-1", inline: true });
    expect(embed.fields).toContainEqual({ name: "Item", value: "Bone Blocks", inline: true });
    expect(embed.fields).toContainEqual({ name: "Quantity", value: "300,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total", value: "$10,000,000", inline: true });
    expect(embed.footer.text).toContain("TestUser");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: "kelp-1" }));
  });

  it("shows_per_unit_price", async () => {
    const interaction = makeInteraction("kelp-1", "Blaze Rods", 500, [
      { name: "total", value: "75k" },
    ]);
    const result = await handleExpense(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$150", inline: true });
  });

  it("logs_an_expense_from_price_per_item", async () => {
    const interaction = makeInteraction("kelp-1", "Blaze Rods", 500, [
      { name: "price_per_item", value: "150" },
    ]);
    const result = await handleExpense(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Total", value: "$75,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$150", inline: true });
  });

  it("rejects_missing_or_duplicate_pricing_inputs", async () => {
    const missingPricingInteraction = makeInteraction("kelp-1", "Bone Blocks", 300000, []);
    const duplicatePricingInteraction = makeInteraction("kelp-1", "Bone Blocks", 300000, [
      { name: "total", value: "10m" },
      { name: "price_per_item", value: "33.3333" },
    ]);

    const missingPricingResult = await handleExpense(missingPricingInteraction);
    const duplicatePricingResult = await handleExpense(duplicatePricingInteraction);

    expect(missingPricingResult.data.embeds[0].title).toBe("Invalid expense input");
    expect(duplicatePricingResult.data.embeds[0].title).toBe("Invalid expense input");
  });

  it("rejects_invalid_abbreviated_amounts", async () => {
    const interaction = makeInteraction("kelp-1", "Blaze Rods", 500, [
      { name: "price_per_item", value: "fifty" },
    ]);

    const result = await handleExpense(interaction);
    expect(result.data.embeds[0].description).toContain("must be valid");
  });

  it("uses_active_farm_when_farm_id_is_omitted", async () => {
    const interaction = {
      member: {
        user: { id: "123456", username: "TestUser" },
      },
      data: {
        options: [
          { name: "item", value: "Blaze Rods" },
          { name: "quantity", value: 10 },
          { name: "total", value: "1k" },
        ],
      },
    };

    const result = await handleExpense(interaction);

    expect(result.data.embeds[0].title).toBe("Expense Logged");
    expect(result.data.embeds[0].fields).toContainEqual({ name: "Farm ID", value: "kelp-2", inline: true });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: "kelp-2" }));
  });
});
