-- Phase 2: CTA workflow + user roles

CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'team',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_role_check CHECK (role IN ('kol', 'team', 'admin')),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS ctas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid        NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  artist_id     uuid        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  action        text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending',
  note          text,
  created_by    uuid        REFERENCES auth.users(id),
  agreed_by     uuid        REFERENCES auth.users(id),
  actioned_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ctas_action_check CHECK (action IN ('reach_out', 'nurture', 'watchlist', 'pass')),
  CONSTRAINT ctas_status_check CHECK (status IN ('pending', 'agreed', 'actioned')),
  UNIQUE (evaluation_id)
);

CREATE TABLE IF NOT EXISTS cta_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_id      uuid        NOT NULL REFERENCES ctas(id) ON DELETE CASCADE,
  action_type text        NOT NULL,
  actor_id    uuid        REFERENCES auth.users(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
