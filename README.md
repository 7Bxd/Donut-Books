# Donut Books

A Discord bot for tracking shared expenses, sales, and profits across a team. Built for the DonutSMP Minecraft kelp farm operation — log what you spend, record what you sell, and let the bot calculate fair payouts based on each player's investment.

## How It Works

Players share the costs of running a kelp farm. When supplies are bought, the buyer logs the expense. When dried kelp blocks are sold, the seller logs the sale. At the end of a cycle, `/payout` calculates how much each player is owed (proportional to their investment) and shows the exact transfers needed — who pays whom and how much.

Each ledger is now scoped by `farm_id`, so expenses, sales, balances, payout runs, and history stay isolated per farm.

## Commands

| Command | Description |
|---------|-------------|
| `/farm farm_id:<id>` | Set your active farm for the next hour |
| `/expense farm_id:<id?> item:<item> quantity:<number> total:<amount> or price_per_item:<amount>` | Log a supply purchase for one farm. If `farm_id` is omitted, your active `/farm` selection is used. Monetary fields support `k`, `m`, and `b` suffixes like `1k` or `2.5m` |
| `/sale farm_id:<id?> quantity:<number> total:<amount> or price_per_item:<amount>` | Log a Dried Kelp Block sale for one farm. If `farm_id` is omitted, your active `/farm` selection is used. Monetary fields support `k`, `m`, and `b` suffixes like `1k` or `2.5m` |
| `/balance farm_id:<id?>` | View the current cycle's expenses, revenue, and per-player breakdown for one farm (uses active `/farm` when omitted) |
| `/payout farm_id:<id?>` | Settle the cycle — shows each player's share and who needs to pay whom for one farm (uses active `/farm` when omitted) |
| `/history farm_id:<id?>` | View transaction history, past cycle summaries, and a profit trend chart for one farm (uses active `/farm` when omitted) |
| `/calculate` | Calculate blaze rod requirements |
| `/calculate-ratio budget:<amount> bone_price:<amount> or bone_block_price:<amount> blaze_rod_price:<amount>` | Calculate optimal Bones or Bone Blocks / Blaze Rod split for a budget (4:3 ratio). Monetary fields support `k`, `m`, and `b` suffixes |
| `/new farm farm_id:<id>` | Create a farm ID and refresh the farm dropdown |
| `/delete farm farm_id:<id>` | Remove an unused farm ID and refresh the farm dropdown |

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Hosting:** Vercel (serverless, Discord Interactions Endpoint)
- **Database:** Supabase (Postgres)
- **Libraries:** discord-interactions, @supabase/supabase-js
- **Testing:** vitest

## Setup

### 1. Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Under **Bot**, create a bot and copy the token
4. Under **General Information**, copy the Application ID and Public Key
5. Under **OAuth2 > URL Generator**, select `bot` and `applications.commands` scopes
6. Use the generated URL to invite the bot to your server

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. For a new database, run `supabase/schema.sql` in the SQL Editor
3. For an existing database with live data, run `supabase/migrations/20260601_add_farms_and_scope_ledgers.sql`
4. Copy your project URL and anon key from **Settings > API**

Create at least one farm with `/new farm farm_id:<id>` and then set your active farm with `/farm farm_id:<id>` before logging expenses or sales.

### 3. Environment Variables

```bash
cp .env.example .env
```

Fill in the values:

```
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

### 4. Install & Register Commands

```bash
npm install
npm run register
```

### 5. Deploy

```bash
npx vercel
```

Set the same environment variables in Vercel under **Settings > Environment Variables**.

Then in your Discord application settings, set the **Interactions Endpoint URL** to:

```
https://your-vercel-app.vercel.app/interactions
```

## Development

```bash
npm test          # run tests
npm run test:watch # run tests in watch mode
```

## Project Structure

```
api/
  interactions.js     # Vercel serverless endpoint
src/
  commands/
    balance.js        # /balance command
    calculate.js      # /calculate command
    expense.js        # /expense command
    payout.js         # /payout command (with settlement transfers)
    sale.js           # /sale command
    history.js        # /history command (transactions, past cycles, chart)
    calculate-ratio.js # /calculate-ratio command (budget-based purchasing)
  lib/
    discord.js        # Request verification + helpers
    settlements.js    # Settlement transfer algorithm
    chart.js          # QuickChart.io URL builder for profit trends
    supabase.js       # Database client
  register.js         # Slash command registration script
supabase/
  schema.sql          # Database schema
tests/                # Test files mirroring src/ structure
```

## License

ISC
