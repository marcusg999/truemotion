-- Phase 5: archetypes table (replaces hardcoded config array)

CREATE TABLE IF NOT EXISTS archetypes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  reference     text        NOT NULL DEFAULT '',
  description   text        NOT NULL DEFAULT '',
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed with the original 13 archetypes
INSERT INTO archetypes (name, reference, description, display_order) VALUES
  ('Drill Insurgent',     'Chief Keef / Pop Smoke', 'Raw regional street movements, energy over polish',                                                         0),
  ('Martyr-Prophet',      'Tupac',                  'Thug-poet duality, emotional revolutionary, spiritual rage',                                                 1),
  ('Griot',               'Nas',                    'Street poet, knowledge-of-self, cinematic realism (Biggie, Wu-Tang, Mobb Deep)',                             2),
  ('Hustler-Mogul',       'Jay-Z',                  'Streets-to-boardroom, Black capitalism (50, Master P, Rick Ross, Diddy)',                                    3),
  ('Warrior',             'Ice Cube / N.W.A',       'Gangsta, ghetto reportage, protest through aggression (The Game, Snoop)',                                    4),
  ('Cosmic Trickster',    'OutKast / André 3000',   'Southern avant-garde, genre-bending (Tyler, Missy)',                                                         5),
  ('Technical Assassin',  'Eminem',                 'Battle-rap purist, pure mechanics (Black Thought, Big Pun, Royce)',                                          6),
  ('Divine Feminine',     'Lauryn Hill',            'Soul-conscious, spiritual depth (Erykah Badu, Rapsody, Jean Grae)',                                          7),
  ('Shapeshifter',        'Lil Wayne',              'Punchline savant, melodic/auto-tune godfather, mentor figure',                                               8),
  ('Vulnerable Crossover','Drake',                  'Melodic, emo, pop-rap (Kid Cudi, Juice WRLD, melodic Future)',                                               9),
  ('Trap Architect',      'Gucci Mane',             'Street economics, regional dominance (Jeezy, T.I., Future)',                                                10),
  ('Masked Mystic',       'MF DOOM',                'Underground villain mythology, abstract, anti-celebrity',                                                   11),
  ('Feminine Sovereign',  'Nicki / Megan',          'Sex-positive, alter-ego theatrics, pop dominance (Lil Kim, Cardi)',                                         12);
