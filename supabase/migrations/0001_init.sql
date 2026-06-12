-- True Motion: A&R evaluation and outreach pipeline schema

create extension if not exists "uuid-ossp";

create table if not exists artists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  alias text,
  instagram_handle text,
  region text,
  style_tags text[] not null default '{}',
  niche text,
  affiliations text,
  lyrical_focus text,
  signed_status text not null default 'unknown'
    check (signed_status in ('independent', 'signed', 'unknown')),
  follower_count integer,
  avg_engagement numeric,
  monthly_listeners integer,
  release_count integer,
  ig_url text,
  track_url text,
  epk_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_instagram_handle_idx
  on artists (lower(instagram_handle))
  where instagram_handle is not null and instagram_handle <> '';

create table if not exists evaluations (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references artists(id) on delete cascade,
  created_at timestamptz not null default now(),

  craft_score numeric not null,
  craft_rationale text not null,
  traction_score numeric not null,
  traction_rationale text not null,
  culture_fit_score numeric not null,
  culture_fit_rationale text not null,
  readiness_score numeric not null,
  readiness_rationale text not null,
  strategic_fit_score numeric not null,
  strategic_fit_rationale text not null,

  composite_score numeric not null,
  confidence_score integer not null,
  tier text not null check (tier in ('SIGN', 'NURTURE', 'GUIDE', 'NOT_READY', 'PASS')),

  archetype_blend jsonb not null default '[]',
  archetype_justification text not null default '',
  growth_path jsonb not null default '[]',

  weights_used jsonb not null,
  missing_fields text[] not null default '{}'
);

create index if not exists evaluations_artist_id_idx on evaluations (artist_id);
create index if not exists evaluations_created_at_idx on evaluations (created_at);

create table if not exists message_drafts (
  id uuid primary key default uuid_generate_v4(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  tone text not null check (tone in ('warm', 'professional', 'hype')),
  content text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'edited', 'archived')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists message_drafts_evaluation_id_idx on message_drafts (evaluation_id);
create index if not exists message_drafts_artist_id_idx on message_drafts (artist_id);

create table if not exists scoring_config (
  id integer primary key default 1,
  weights jsonb not null,
  tier_bands jsonb not null,
  updated_at timestamptz not null default now(),
  constraint scoring_config_single_row check (id = 1)
);

insert into scoring_config (id, weights, tier_bands)
values (
  1,
  '{"craft": 0.25, "traction": 0.20, "culture_fit": 0.20, "readiness": 0.15, "strategic_fit": 0.20}',
  '[
    {"tier": "SIGN", "min": 8.5, "max": 10.0},
    {"tier": "NURTURE", "min": 6.5, "max": 8.499999},
    {"tier": "GUIDE", "min": 4.5, "max": 6.499999},
    {"tier": "NOT_READY", "min": 2.5, "max": 4.499999},
    {"tier": "PASS", "min": 0, "max": 2.499999}
  ]'
)
on conflict (id) do nothing;

-- Keep updated_at fresh on artists
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists artists_set_updated_at on artists;
create trigger artists_set_updated_at
  before update on artists
  for each row
  execute function set_updated_at();
