-- MDC matching engine: additive migration — no existing tables dropped or destructively altered.

create extension if not exists "uuid-ossp";

-- MDC category enum
do $$ begin
  create type mdc_category as enum ('genre', 'region', 'theme', 'adjective', 'affiliation', 'intelligence');
exception when duplicate_object then null;
end $$;

-- Reference profile type enum
do $$ begin
  create type reference_profile_type as enum ('master', 'archetype', 'campaign');
exception when duplicate_object then null;
end $$;

-- Canonical MDC vocabulary
create table if not exists mdc_taxonomy (
  id uuid primary key default uuid_generate_v4(),
  category mdc_category not null,
  canonical_term text not null,
  synonyms text[] not null default '{}',
  weight numeric not null default 1.0,
  created_at timestamptz not null default now()
);

create unique index if not exists mdc_taxonomy_category_term_idx
  on mdc_taxonomy (category, lower(canonical_term));

-- Reference profiles (Source Major / Source 1)
create table if not exists reference_profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type reference_profile_type not null default 'master',
  narrative text,
  mdc jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reference_profiles_name_idx
  on reference_profiles (lower(name));

drop trigger if exists reference_profiles_set_updated_at on reference_profiles;
create trigger reference_profiles_set_updated_at
  before update on reference_profiles
  for each row execute function set_updated_at();

-- Extend artists: free-text narrative + normalized MDC
alter table artists
  add column if not exists narrative text,
  add column if not exists mdc jsonb not null default '[]';

-- Extend evaluations: reference profile link + match output
alter table evaluations
  add column if not exists reference_profile_id uuid references reference_profiles(id),
  add column if not exists match_score numeric,
  add column if not exists match_checklist jsonb not null default '[]';

create index if not exists evaluations_reference_profile_idx
  on evaluations (reference_profile_id);

-- -----------------------------------------------------------------------
-- Seed: MDC taxonomy (genres, regions, themes, adjectives, affiliations, intelligence)
-- -----------------------------------------------------------------------
insert into mdc_taxonomy (category, canonical_term, synonyms, weight) values
  -- genres (weight 2.0 — primary signal)
  ('genre', 'drill',         array['chicago drill','uk drill','ny drill','brooklyn drill','pop smoke drill'], 2.0),
  ('genre', 'trap',          array['trap music','trap rap','street trap','atl trap','trapping'], 2.0),
  ('genre', 'conscious_rap', array['conscious','knowledge rap','positive rap','intellectual hip-hop','woke rap'], 2.0),
  ('genre', 'gangsta_rap',   array['gangsta','west coast rap','g-rap','g funk','gangster rap'], 2.0),
  ('genre', 'melodic_rap',   array['melodic','emo rap','pop rap','singing rapper','melodic trap','sad rap'], 2.0),
  ('genre', 'underground',   array['underground rap','indie hip-hop','backpack rap','indie rap','lo-fi rap'], 2.0),
  ('genre', 'avant_garde',   array['experimental','alternative hip-hop','art rap','abstract rap','left field'], 2.0),
  ('genre', 'battle_rap',    array['battle','technical rap','lyrical rap','bars','bar rap','punch rap'], 2.0),
  ('genre', 'soul_rap',      array['soul','neo-soul rap','spiritual rap','jazz rap','r&b rap'], 2.0),
  ('genre', 'boom_bap',      array['classic hip-hop','east coast','golden era','boom bap','90s hip-hop'], 2.0),
  ('genre', 'mumble_rap',    array['mumble','auto-tune rap','lean rap','plug music'], 2.0),
  ('genre', 'southern_rap',  array['southern','dirty south','crunk','chopped and screwed','hyphy'], 2.0),
  -- regions (weight 1.8 — strong geographic signal)
  ('region', 'atlanta',      array['atl','a-town','georgia','the a','atl rap'], 1.8),
  ('region', 'chicago',      array['chi','chiraq','illinois','the chi','windy city'], 1.8),
  ('region', 'new_york',     array['nyc','ny','new york city','the bronx','brooklyn','harlem','queens','tri-state','bx'], 1.8),
  ('region', 'los_angeles',  array['la','compton','inglewood','california','west coast','cali','so cal','socalm'], 1.8),
  ('region', 'houston',      array['h-town','h town','texas','tx','the south','screwston','htx'], 1.8),
  ('region', 'detroit',      array['det','michigan','mi','metro detroit','motown'], 1.8),
  ('region', 'miami',        array['305','south florida','florida','fl','magic city','miami rap'], 1.8),
  ('region', 'memphis',      array['tennessee','tn','bluff city','memphis rap'], 1.8),
  ('region', 'new_orleans',  array['nola','louisiana','the boot','crescent city','bounce music'], 1.8),
  ('region', 'philadelphia', array['philly','pa','pennsylvania','city of brotherly love'], 1.8),
  ('region', 'uk',           array['united kingdom','britain','london','birmingham','grime','uk rap','british rap'], 1.8),
  ('region', 'toronto',      array['the 6','the six','canada','ontario','tdot','6ix'], 1.8),
  -- themes (weight 1.5)
  ('theme', 'street_life',         array['street','hood','ghetto','block','trap life','the streets','street narrative'], 1.5),
  ('theme', 'black_excellence',    array['black power','black capitalism','mogul','empire building','black wealth','black business'], 1.5),
  ('theme', 'spirituality',        array['god','faith','divine','spiritual','religion','prayer','church','gospel'], 1.5),
  ('theme', 'social_justice',      array['protest','revolution','activism','awareness','politics','police brutality','blm'], 1.5),
  ('theme', 'love_relationships',  array['love','relationships','romance','heartbreak','loyalty','devotion','toxic love'], 1.5),
  ('theme', 'struggle_resilience', array['struggle','hustle','grind','survival','resilience','come up','grinding'], 1.5),
  ('theme', 'mythology_alter_ego', array['alter ego','villain','mythology','character','persona','superhero','comic book'], 1.5),
  ('theme', 'female_empowerment',  array['feminism','women empowerment','girl power','body positivity','female rap'], 1.5),
  ('theme', 'money_success',       array['money','success','wealth','luxury','flexing','drip','lifestyle','designer'], 1.5),
  ('theme', 'introspection',       array['self-reflection','mental health','depression','anxiety','emotions','trauma','vulnerability'], 1.5),
  ('theme', 'culture_heritage',    array['culture','heritage','roots','history','knowledge of self','ancestry','afrocentrism'], 1.5),
  -- adjectives (weight 1.0 — descriptive, lower signal)
  ('adjective', 'raw',          array['unpolished','gritty','grimy','rough','authentic street','unfiltered','no features'], 1.0),
  ('adjective', 'polished',     array['refined','clean','professional','produced','studio-ready','hi-fi'], 1.0),
  ('adjective', 'lyrical',      array['lyricism','bars','wordplay','punchlines','multisyllabic','technical','flows'], 1.0),
  ('adjective', 'melodic',      array['singing','harmonies','hooks','melody','melodic flow','tuneful'], 1.0),
  ('adjective', 'aggressive',   array['hard','intense','angry','energetic','hype','turnt','lit'], 1.0),
  ('adjective', 'introspective',array['deep','thoughtful','reflective','philosophical','conscious flow','cerebral'], 1.0),
  ('adjective', 'versatile',    array['genre-bending','flexible','adaptive','range','switch up','multifaceted'], 1.0),
  ('adjective', 'authentic',    array['real','genuine','no gimmick','organic','true to self','keepin it real'], 1.0),
  ('adjective', 'commercial',   array['mainstream','pop','radio-friendly','crossover potential','chart-ready','top 40'], 1.0),
  ('adjective', 'innovative',   array['creative','original','unique','pioneering','trendsetting','fresh','avant'], 1.0),
  -- affiliations (weight 1.6)
  ('affiliation', 'ysl',               array['young stoner life','gunna','young thug','ysl records','trappist'], 1.6),
  ('affiliation', 'ovo',               array['october very own','drake','6ix','toronto label','ovo sound'], 1.6),
  ('affiliation', 'ymcmb',             array['young money','cash money','lil wayne','nicki minaj','birdman','weezy'], 1.6),
  ('affiliation', 'tde',               array['top dawg entertainment','kendrick lamar','schoolboy q','sza','ab-soul','punch'], 1.6),
  ('affiliation', 'dreamville',        array['j cole','interscope dreamville','revenge of the dreamers','bas','cozz'], 1.6),
  ('affiliation', 'g_o_o_d_music',     array['good music','kanye west','pusha t','ye','good music label'], 1.6),
  ('affiliation', 'independent',       array['indie','unsigned','self-released','self-distributed','no label','diy','grassroots'], 1.6),
  ('affiliation', 'atlantic_records',  array['atlantic records','lil uzi vert','a boogie wit da hoodie','plies'], 1.6),
  ('affiliation', 'interscope_records',array['interscope records','eminem','dr dre','snoop dogg','aftermath'], 1.6),
  ('affiliation', 'def_jam',           array['def jam recordings','roc nation','jay-z','nas def jam','def jam legacy'], 1.6),
  -- intelligence (weight 1.7 — TRP-specific signal)
  ('intelligence', 'infrastructure_platform', array['platform','ecosystem','infrastructure','technology hip-hop','tech-enabled','music tech'], 1.7),
  ('intelligence', 'culturally_grounded',     array['culture first','authentic','rooted in culture','culture forward','cultural awareness','culture keeper'], 1.7),
  ('intelligence', 'forward_looking',         array['visionary','future-focused','innovative thinking','next generation','forward thinking','next wave'], 1.7),
  ('intelligence', 'curated_taste',           array['curated','selective','quality over quantity','discerning','taste-maker','A&R eye'], 1.7),
  ('intelligence', 'hip_hop_economy',         array['hip-hop business','rap economy','hip-hop industry','music business','rap business','hip hop commerce'], 1.7),
  ('intelligence', 'artist_development',      array['development','growth','career building','long-term vision','artist growth','A&R development'], 1.7)
on conflict (category, lower(canonical_term)) do nothing;

-- -----------------------------------------------------------------------
-- Seed: TRP master reference profile
-- -----------------------------------------------------------------------
insert into reference_profiles (name, type, narrative, mdc)
select
  'TRP Master Profile',
  'master',
  'TRP (The Rap Project) is an infrastructure platform for the hip-hop economy. We are intelligent, culturally grounded, forward-looking, and curated — our tone is "Wired for hip-hop," not gossip, not hype-only. We seek artists who are authentic to the culture, lyrical or melodic with substance over style, and who have a story that resonates beyond the moment. We value artists with street credibility, regional roots, and the potential to become enduring voices in the hip-hop narrative. Culture fit is paramount: an artist must embody the spirit of the hip-hop economy, whether they are street, conscious, or avant-garde.',
  '[
    {"category": "intelligence", "term": "infrastructure_platform", "weight": 2.0},
    {"category": "intelligence", "term": "culturally_grounded", "weight": 2.0},
    {"category": "intelligence", "term": "forward_looking", "weight": 1.8},
    {"category": "intelligence", "term": "curated_taste", "weight": 1.8},
    {"category": "intelligence", "term": "hip_hop_economy", "weight": 1.7},
    {"category": "intelligence", "term": "artist_development", "weight": 1.5},
    {"category": "theme", "term": "culture_heritage", "weight": 1.5},
    {"category": "theme", "term": "street_life", "weight": 1.3},
    {"category": "adjective", "term": "lyrical", "weight": 1.2},
    {"category": "adjective", "term": "innovative", "weight": 1.2},
    {"category": "adjective", "term": "authentic", "weight": 1.2}
  ]'::jsonb
where not exists (select 1 from reference_profiles where lower(name) = 'trp master profile');
