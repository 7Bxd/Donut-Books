import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("../../src/lib/supabase.js", () => {
  return {
    default: {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    },
  };
});

import { handleSale } from "../../src/commands/sale.js";

function makeInteraction(farmId, quantity, pricingOptions) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "farm_id", value: farmId },
        { name: "quantity", value: quantity },
        ...pricingOptions,
      ],
    },
  };
}

describe("handleSale", () => {
  it("logs_a_sale_from_total_and_returns_embed", async () => {
    const interaction = makeInteraction("kelp-1", 5000, [
      { name: "total", value: "3.75m" },
    ]);
    const result = await handleSale(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Sale Logged");
    expect(embed.fields).toContainEqual({ name: "Farm ID", value: "kelp-1", inline: true });
    expect(embed.fields).toContainEqual({ name: "Item", value: "Dried Kelp Blocks", inline: true });
    expect(embed.fields).toContainEqual({ name: "Quantity", value: "5,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total", value: "$3,750,000", inline: true });
    expect(embed.footer.text).toContain("TestUser");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: "kelp-1" }));
  });

  it("logs_a_sale_from_price_per_item", async () => {
    const interaction = makeInteraction("kelp-1", 5000, [
      { name: "price_per_item", value: "750" },
    ]);
    const result = await handleSale(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Total", value: "$3,750,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$750", inline: true });
  });

  it("rejects_missing_or_duplicate_pricing_inputs", async () => {
    const missingPricingInteraction = makeInteraction("kelp-1", 5000, []);
    const duplicatePricingInteraction = makeInteraction("kelp-1", 5000, [
      { name: "total", value: "3750000" },
      { name: "price_per_item", value: "750" },
    ]);

    const missingPricingResult = await handleSale(missingPricingInteraction);
    const duplicatePricingResult = await handleSale(duplicatePricingInteraction);

    expect(missingPricingResult.data.embeds[0].title).toBe("Invalid sale input");
    expect(duplicatePricingResult.data.embeds[0].title).toBe("Invalid sale input");
  });

  it("rejects_invalid_abbreviated_amounts", async () => {
    const interaction = makeInteraction("kelp-1", 5000, [
      { name: "total", value: "3.5x" },
    ]);

    const result = await handleSale(interaction);
    expect(result.data.embeds[0].description).toContain("must be valid");
  });
});
