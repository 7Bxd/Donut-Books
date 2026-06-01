CREATE TABLE farms (
  farm_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE active_farm_selections (
  discord_user_id TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discord_user_id, scope_id)
);

-- Payouts table (referenced by expenses and sales)
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT NOT NULL REFERENCES farms(farm_id),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_expenses DECIMAL NOT NULL DEFAULT 0,
  total_revenue DECIMAL NOT NULL DEFAULT 0,
  total_profit DECIMAL NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT NOT NULL REFERENCES farms(farm_id),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  item TEXT NOT NULL CHECK (item IN ('Bone Blocks', 'Bones', 'Blaze Rods', 'Chests', 'Shulker Shells', 'Shulkers')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_cost DECIMAL NOT NULL CHECK (total_cost > 0),
  payout_id UUID REFERENCES payouts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT NOT NULL REFERENCES farms(farm_id),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_revenue DECIMAL NOT NULL CHECK (total_revenue > 0),
  payout_id UUID REFERENCES payouts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (bot uses service_role key which bypasses RLS)
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_farm_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Index for fast unsettled queries
CREATE INDEX idx_expenses_unsettled ON expenses(farm_id, payout_id) WHERE payout_id IS NULL;
CREATE INDEX idx_sales_unsettled ON sales(farm_id, payout_id) WHERE payout_id IS NULL;
CREATE INDEX idx_payouts_farm_id ON payouts(farm_id);
CREATE INDEX idx_active_farm_selections_expires_at ON active_farm_selections(expires_at);
