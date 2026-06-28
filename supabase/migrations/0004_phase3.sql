-- Phase 3: events, deals, payments, splits

CREATE TABLE IF NOT EXISTS events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    uuid        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  event_type   text        NOT NULL DEFAULT 'call',
  notes        text,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_type_check CHECK (event_type IN ('call', 'meeting', 'follow_up', 'showcase', 'other'))
);

CREATE TABLE IF NOT EXISTS deals (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id      uuid         NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title          text         NOT NULL,
  status         text         NOT NULL DEFAULT 'prospecting',
  deal_value     numeric(12,2),
  commission_pct numeric(5,2),
  notes          text,
  created_by     uuid         REFERENCES auth.users(id),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT deals_status_check CHECK (status IN ('prospecting', 'negotiating', 'closed', 'passed'))
);

CREATE TABLE IF NOT EXISTS deal_payments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        uuid        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  payment_type   text        NOT NULL DEFAULT 'advance',
  amount         numeric(12,2) NOT NULL,
  expected_date  date,
  received_date  date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_payments_type_check CHECK (payment_type IN ('advance', 'royalty', 'milestone', 'other'))
);

CREATE TABLE IF NOT EXISTS deal_splits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id),
  split_pct  numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_splits_pct_check CHECK (split_pct >= 0 AND split_pct <= 100)
);
