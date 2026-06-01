import { buildFarmIdOption } from "./farms.js";

export function buildApplicationCommands(farmIds = []) {
  return [
    {
      name: "expense",
      description: "Log a supply purchase for the kelp farm",
      options: [
        buildFarmIdOption({ farmIds }),
        {
          name: "item",
          description: "What you bought",
          type: 3,
          required: true,
          choices: [
            { name: "Bone Blocks", value: "Bone Blocks" },
            { name: "Bones", value: "Bones" },
            { name: "Blaze Rods", value: "Blaze Rods" },
            { name: "Chests", value: "Chests" },
            { name: "Shulker Shells", value: "Shulker Shells" },
            { name: "Shulkers", value: "Shulkers" },
          ],
        },
        {
          name: "quantity",
          description: "How many you bought",
          type: 4,
          required: true,
        },
        {
          name: "total",
          description: "Total amount spent (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
        {
          name: "price_per_item",
          description: "Cost per item (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "sale",
      description: "Log a Dried Kelp Block sale",
      options: [
        buildFarmIdOption({ farmIds }),
        {
          name: "quantity",
          description: "How many Dried Kelp Blocks sold",
          type: 4,
          required: true,
        },
        {
          name: "total",
          description: "Total amount earned (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
        {
          name: "price_per_item",
          description: "Price per item sold (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "balance",
      description: "View current cycle expenses, revenue, and profit breakdown",
      options: [buildFarmIdOption({ farmIds })],
    },
    {
      name: "payout",
      description: "Settle the current cycle and calculate who gets what",
      options: [buildFarmIdOption({ farmIds })],
    },
    {
      name: "calculate",
      description: "Calculate how many Blaze Rods you need for your Bones/Bone Blocks",
      options: [
        {
          name: "bones",
          description: "Number of Bones",
          type: 4,
          required: false,
        },
        {
          name: "bone_blocks",
          description: "Number of Bone Blocks",
          type: 4,
          required: false,
        },
      ],
    },
    {
      name: "history",
      description: "View transaction history and profit trends",
      options: [buildFarmIdOption({ farmIds })],
    },
    {
      name: "calculate-ratio",
      description: "Calculate optimal Bones or Bone Blocks / Blaze Rod split for a budget",
      options: [
        {
          name: "budget",
          description: "Total amount to spend (supports 1k, 2.5m, 3b)",
          type: 3,
          required: true,
        },
        {
          name: "blaze_rod_price",
          description: "Price per Blaze Rod (supports 1k, 2.5m, 3b)",
          type: 3,
          required: true,
        },
        {
          name: "bone_price",
          description: "Price per Bone (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
        {
          name: "bone_block_price",
          description: "Price per Bone Block (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "calculate-profit",
      description: "Estimate kelp output and profit from a budgeted recipe run",
      options: [
        {
          name: "budget",
          description: "Total amount to spend (supports 1k, 2.5m, 3b)",
          type: 3,
          required: true,
        },
        {
          name: "blaze_rod_price",
          description: "Price per Blaze Rod (supports 1k, 2.5m, 3b)",
          type: 3,
          required: true,
        },
        {
          name: "kelp_block_price",
          description: "Price per Dried Kelp Block (supports 1k, 2.5m, 3b)",
          type: 3,
          required: true,
        },
        {
          name: "bone_price",
          description: "Price per Bone (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
        {
          name: "bone_block_price",
          description: "Price per Bone Block (supports 1k, 2.5m, 3b)",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "new",
      description: "Create bookkeeping resources",
      options: [
        {
          type: 1,
          name: "farm",
          description: "Create a farm ID",
          options: [
            {
              name: "farm_id",
              description: "New farm ID",
              type: 3,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "delete",
      description: "Delete bookkeeping resources",
      options: [
        {
          type: 1,
          name: "farm",
          description: "Delete a farm ID",
          options: [
            buildFarmIdOption({
              farmIds,
              description: "Farm ID to delete",
            }),
          ],
        },
      ],
    },
  ];
}