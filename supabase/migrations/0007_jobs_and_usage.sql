-- 0.7: evaluation jobs table (Netlify Background Function queue)
CREATE TABLE IF NOT EXISTS evaluation_jobs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id            UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  reference_profile_id UUID REFERENCES reference_profiles(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'queued'
                         CHECK (status IN ('queued', 'running', 'done', 'failed')),
  error                TEXT,
  result_evaluation_id UUID REFERENCES evaluations(id) ON DELETE SET NULL,
  kind                 TEXT NOT NULL DEFAULT 'full_eval'
                         CHECK (kind IN ('full_eval', 'extract_only')),
  requested_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_ip         TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_artist  ON evaluation_jobs(artist_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_status  ON evaluation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_ip_time ON evaluation_jobs(submitter_ip, created_at)
  WHERE submitter_ip IS NOT NULL;

-- 0.6: LLM usage log
CREATE TABLE IF NOT EXISTS usage_log (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model            TEXT NOT NULL,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd  NUMERIC(12, 8),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address       TEXT,
  route            TEXT NOT NULL,
  job_id           UUID REFERENCES evaluation_jobs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_user    ON usage_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_job     ON usage_log(job_id);

-- 0.6: per-user daily quota stored alongside scoring config
ALTER TABLE scoring_config
  ADD COLUMN IF NOT EXISTS daily_eval_limit INTEGER NOT NULL DEFAULT 10;

-- 0.1: RLS defense-in-depth (deny anon; authenticated users via service role)
ALTER TABLE evaluation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log       ENABLE ROW LEVEL SECURITY;

-- Deny all anon access — server uses service role which bypasses RLS
CREATE POLICY "deny anon evaluation_jobs" ON evaluation_jobs
  FOR ALL TO anon USING (false);

CREATE POLICY "deny anon usage_log" ON usage_log
  FOR ALL TO anon USING (false);

-- Authenticated staff can read their own jobs (needed for Realtime upgrade path)
CREATE POLICY "staff read own jobs" ON evaluation_jobs
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- User management: track invited users (Supabase auth.users is the source of truth)
CREATE TABLE IF NOT EXISTS user_invites (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'team', 'kol')),
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny anon user_invites" ON user_invites
  FOR ALL TO anon USING (false);
