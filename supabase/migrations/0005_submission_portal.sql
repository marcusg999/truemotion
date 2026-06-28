-- Phase 4: public artist submission portal

ALTER TABLE artists ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS email  text;
