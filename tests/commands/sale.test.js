import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
}));

const { mockState } = vi.hoisted(() => ({
  mockState: {
    activeFarm: { farm_id: "kelp-2", expires_at: "2099-01-01T00:00:00Z" },
    existingFarms: ["kelp-1", "kelp-2"],
  },
}));

vi.mock("../../src/lib/supabase.js", () => {
  const maybeSingleActiveFarm = vi.fn().mockImplementation(() => ({
    data: mockState.activeFarm,
    error: null,
  }));

  const maybeSingleFarmByEq = vi.fn().mockImplementation((farmId) => ({
    data: mockState.existingFarms.includes(farmId) ? { farm_id: farmId } : null,
    error: null,
  }));

  return {
    default: {
      from: vi.fn((table) => {
        if (table === "active_farm_selections") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleActiveFarm }),
              }),
            }),
          };
        }

        if (table === "farms") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_, farmId) => ({
                maybeSingle: vi.fn().mockResolvedValue(maybeSingleFarmByEq(farmId)),
              })),
            }),
          };
        }

        if (table === "sales") {
          return { insert: mockInsert };
        }

        return {};
      }),
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
  it("uses_active_farm_when_farm_id_is_omitted", async () => {
    mockState.activeFarm = { farm_id: "kelp-2", expires_at: "2099-01-01T00:00:00Z" };
    mockState.existingFarms = ["kelp-1", "kelp-2"];

    const interaction = {
      member: {
        user: { id: "123456", username: "TestUser" },
      },
      data: {
        options: [
          { name: "quantity", value: 20 },
          { name: "total", value: "2k" },
        ],
      },
    };

    const result = await handleSale(interaction);

    expect(result.data.embeds[0].title).toBe("Sale Logged");
    expect(result.data.embeds[0].fields).toContainEqual({ name: "Farm ID", value: "kelp-2", inline: true });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ farm_id: "kelp-2" }));
  });

  it("returns_missing_farm_when_no_explicit_or_active_farm", async () => {
    mockState.activeFarm = null;

    const interaction = {
      member: {
        user: { id: "123456", username: "TestUser" },
      },
      data: {
        options: [
          { name: "quantity", value: 20 },
          { name: "total", value: "2k" },
        ],
      },
    };

    const result = await handleSale(interaction);
    expect(result.data.embeds[0].title).toBe("Missing farm");

    mockState.activeFarm = { farm_id: "kelp-2", expires_at: "2099-01-01T00:00:00Z" };
  });

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
