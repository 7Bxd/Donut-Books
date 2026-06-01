BEGIN;

-- Create farms lookup table.
CREATE TABLE IF NOT EXISTS farms (
  farm_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a default farm exists before backfilling legacy rows.
INSERT INTO farms (farm_id)
VALUES ('main')
ON CONFLICT (farm_id) DO NOTHING;

-- Add farm scope columns if missing.
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS farm_id TEXT;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS farm_id TEXT;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS farm_id TEXT;

-- Backfill legacy rows into the default farm.
UPDATE payouts
SET farm_id = 'main'
WHERE farm_id IS NULL;

UPDATE expenses
SET farm_id = 'main'
WHERE farm_id IS NULL;

UPDATE sales
SET farm_id = 'main'
WHERE farm_id IS NULL;

-- Enforce not-null + referential integrity.
ALTER TABLE payouts
  ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE payouts
  DROP CONSTRAINT IF EXISTS payouts_farm_id_fkey;
ALTER TABLE payouts
  ADD CONSTRAINT payouts_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id);

ALTER TABLE expenses
  ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_farm_id_fkey;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id);

ALTER TABLE sales
  ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_farm_id_fkey;
ALTER TABLE sales
  ADD CONSTRAINT sales_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id);

-- Rebuild unsettled indexes with farm scoping.
DROP INDEX IF EXISTS idx_expenses_unsettled;
DROP INDEX IF EXISTS idx_sales_unsettled;

CREATE INDEX IF NOT EXISTS idx_expenses_unsettled
  ON expenses(farm_id, payout_id)
  WHERE payout_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sales_unsettled
  ON sales(farm_id, payout_id)
  WHERE payout_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_farm_id
  ON payouts(farm_id);

CREATE TABLE IF NOT EXISTS active_farm_selections (
  discord_user_id TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discord_user_id, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_active_farm_selections_expires_at
  ON active_farm_selections(expires_at);

COMMIT;
