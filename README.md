# True Motion

True Motion is the A&R evaluation and outreach pipeline for TRP.L (The Rap Project Label). It gives a small team a single place to discover, evaluate, track, and act on artists — from first contact through signed deal.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Stack](#stack)
3. [Setup](#setup)
4. [User guide](#user-guide)
   - [Signing in](#signing-in)
   - [Pipeline — the home view](#pipeline--the-home-view)
   - [Adding an artist](#adding-an-artist)
   - [Running an evaluation](#running-an-evaluation)
   - [Reading an evaluation card](#reading-an-evaluation-card)
   - [CTA workflow](#cta-workflow)
   - [CTA queue](#cta-queue)
   - [Scheduling events](#scheduling-events)
   - [Deals and commissions](#deals-and-commissions)
   - [Analytics dashboard](#analytics-dashboard)
   - [Drafting outreach messages](#drafting-outreach-messages)
   - [Reference profiles](#reference-profiles)
   - [Scoring config](#scoring-config)
5. [Navigation reference](#navigation-reference)
6. [Roles](#roles)
7. [Data model](#data-model)
8. [Tiers](#tiers)
9. [Archetypes](#archetypes)

---

## What it does

```
Add artist → extract MDC tags → run evaluation → assign CTA → schedule events → track deal
```

Each artist is stored permanently. Every evaluation is a snapshot in time — you can re-evaluate as the artist grows and compare scores across runs. Nothing is sent to an artist automatically; every outreach message requires a human to approve or edit it first.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend / Backend | Next.js 16 (App Router) + TypeScript |
| Database | Supabase (Postgres) |
| LLM | Anthropic API (Claude) |
| Auth | Supabase Auth (email + password) |

---

## Setup

### Prerequisites

- Node.js 20+
- A Supabase project
- An Anthropic API key

### Steps

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:

   ```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role key from Project Settings → API>
   ANTHROPIC_API_KEY=<your Anthropic key>
   ```

3. Apply all migrations in order via the Supabase SQL editor:

   ```
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_mdc_matching.sql
   supabase/migrations/0003_cta_workflow.sql
   supabase/migrations/0004_phase3.sql
   ```

4. Create at least one user in **Supabase dashboard → Authentication → Users**, then assign them a role via the SQL editor:

   ```sql
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'you@example.com';
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) — you will be redirected to the login page.

---

## User guide

### Signing in

Go to `/login`. Enter your email and password. Accounts are created by an admin in the Supabase dashboard; there is no self-signup. After signing in you are redirected to the Pipeline.

To sign out, click your username in the top-right corner of the nav bar and select **Sign out**.

---

### Pipeline — the home view

The home page (`/`) shows every artist in the system as a card grid with their latest evaluation tier, composite score, top archetype, and confidence score.

**Filtering and sorting:**

- Click any **tier chip** (Sign, Nurture, Guide, Not Ready, Pass) to filter the grid to that tier.
- Click **Filters & sort** to open the advanced panel:
  - **Archetype contains** — filter by any archetype name substring (e.g. "Griot")
  - **Region** — filter to a specific region
  - **Min confidence** — slider to hide low-confidence evaluations
  - **Sort by** — Date added (default), Composite score, Confidence, Name

Artists with no evaluation yet show a `—` ring and "Not evaluated yet."

---

### Adding an artist

Click **New artist** in the nav bar or the floating button on the Pipeline page.

**Required fields:**
- Name

**Recommended fields** (each increases the confidence score and gives the evaluator more to work with):
- Instagram handle, follower count, average engagement rate
- Monthly listeners
- Region, style tags, niche
- Affiliations / cosigns
- Lyrical focus
- Signed status
- Links: Instagram URL, track URL, EPK URL
- Scout notes

**Narrative & MDC section (bottom of the form):**

Paste a free-text artist bio, press release, or scout write-up into the **Narrative** field, then click **Extract MDC**. The app calls Claude to extract structured Meta Data Criteria (MDC) tags — genre, region, theme, adjective, affiliation, and intelligence labels — from the text. These tags are used later to score how well the artist matches TRP's reference profile.

You can remove individual tags with the × button. Any tags that couldn't be matched to the canonical taxonomy are shown in amber as a warning.

Click **Add artist** to save.

---

### Running an evaluation

From any artist's detail page, click **Run evaluation**. The pipeline:

1. Computes a **confidence score** based on how many profile fields are filled in.
2. Runs **MDC extraction** on the artist's narrative (if they have one and no MDC tags yet).
3. Computes a **match score** against the TRP master reference profile (or a specific profile you select).
4. Sends everything to Claude, which scores the artist on five axes and returns an archetype blend, growth path, and justification.
5. Stores the result and refreshes the page.

Evaluation takes 5–15 seconds depending on profile richness.

You can re-evaluate an artist at any time. Each run creates a new evaluation record — prior runs are preserved in the **Evaluation history** section.

**Selecting a reference profile:**

By default, evaluations are matched against the TRP master profile. To use a different profile (e.g. a campaign-specific or archetype-specific one), click the dropdown on the Evaluate button and select a profile before running.

---

### Reading an evaluation card

Each evaluation is shown as a collapsible card. Click anywhere on the summary bar to expand it.

**Summary bar:**
- Tier badge (SIGN / NURTURE / GUIDE / NOT_READY / PASS)
- Composite score (0–10)
- Confidence percentage
- Timestamp

**Inside the card:**

| Section | What it shows |
|---|---|
| Tier description | Plain-English meaning of the tier |
| Missing fields | Which profile fields were absent at evaluation time |
| Axis scores | Score (0–10) + one-line rationale for each of the five axes, with a mini progress bar and the weight used |
| Archetype blend | Percentage breakdown across TRP's 13 archetypes with horizontal bars, plus Claude's justification |
| Growth path | 2–4 concrete next steps (shown only for GUIDE and NURTURE tiers) |
| MDC match | Match score badge + chips for each reference term (✓ = artist matches it, · = not in artist profile). Only shown when a match was computed. |
| CTA | Call-to-action buttons (see below) |
| Outreach | Button to draft outreach messages |

---

### CTA workflow

A **CTA (Call to Action)** is the team's decision about what to do with an artist based on their evaluation.

**Available actions:**

| Action | When to use |
|---|---|
| Reach Out | Artist is ready to contact now (typically SIGN tier) |
| Develop Relationship | High potential, begin cultivating (typically NURTURE) |
| Watch | Monitor the artist, don't engage yet (typically GUIDE / NOT_READY) |
| Pass | No action needed |

**How it works:**

1. The evaluation card shows a primary action button (pre-selected based on tier) and three secondary options.
2. Clicking an action **queues the CTA** — status becomes Pending.
3. A team member with `team` or `admin` role can click **Agree** to advance it to Agreed.
4. An `admin` can click **Mark done** to mark it as Actioned.
5. Clicking **Change** removes the current CTA so you can pick a different one.

Each evaluation can only have one active CTA at a time. Changing it replaces the previous one.

---

### CTA queue

The queue page (`/queue`) shows all CTAs across all artists, grouped by status:

- **Pending** — queued but not yet agreed
- **Agreed** — team has aligned, ready to act
- **Actioned** — completed

Each row shows the artist name, tier badge, composite score, region, Instagram handle, and the CTA panel inline so you can update status directly from the queue without navigating to the artist's page.

---

### Scheduling events

On any artist's detail page, scroll to the **Schedule** section.

Click **+ Add event** to open the inline form:

- **Title** — what the event is (e.g. "Intro call", "Studio session review")
- **Type** — Call, Meeting, Follow-up, Showcase, Other
- **Date & time** — datetime picker
- **Notes** — optional context

Upcoming events appear in the main list. Past events (scheduled date has passed or marked complete) collapse under a **Past (N)** toggle.

Click **Done** next to any event to mark it complete. Click **×** to delete it.

**Cross-artist view:** `/events` shows all upcoming and past events across every artist, sorted by date, with a link back to each artist's profile.

---

### Deals and commissions

On any artist's detail page, scroll to the **Deals** section.

#### Adding a deal

Click **+ Add deal**:

- **Title** — deal name (e.g. "Album deal", "Single licensing")
- **Status** — Prospecting / Negotiating / Closed / Passed
- **Deal value** — total contract value in USD
- **Commission %** — TRP's commission percentage
- **Notes** — optional

The projected commission (deal value × commission %) is shown automatically.

#### Logging payments

Inside an expanded deal card, click **+ Add** next to **Payments**:

- **Type** — Advance, Royalty, Milestone, Other
- **Amount** — in USD
- **Expected date** — when the payment is due

Click **Mark received** on any payment to record that it was received today. The deal card updates its **Received** and **Outstanding** totals instantly.

#### Team splits

Inside a deal, click **+ Add** next to **Team splits** to record who on the team gets what percentage of the commission:

- **Name** — team member or party name
- **Split %** — their percentage

When payments have been received, each split row shows the calculated payout amount.

#### Commissions summary page

`/commissions` shows a summary table of every deal across all artists with columns for deal value, projected commission, received, and outstanding. The header cards show totals across the entire ledger.

---

### Analytics dashboard

`/analytics` gives an aggregate view of the full pipeline.

**Stat cards (top row):**
- Total artists
- Evaluated count
- Average composite score
- Average confidence score
- CTA queue depth (pending count)
- Open deals count and total value

**Charts:**
- **Tier breakdown** — horizontal bar chart showing how many artists are in each tier and what percentage of the total that represents
- **Score distribution** — histogram of composite scores across all evaluations in five buckets (0–2, 2–4, 4–6, 6–8, 8–10)
- **Top archetypes** — horizontal bars ranking the most frequently assigned archetypes (counted when an archetype is ≥20% of an evaluation's blend)
- **CTA queue** — pending / agreed / actioned counts
- **Commission ledger** — total expected vs total received across all deals

---

### Drafting outreach messages

From any evaluation card, click **Draft outreach messages** at the bottom.

Claude drafts 2–3 tone variants (warm, professional, hype) personalised to the artist's profile, tier, and archetype blend. For PASS-tier artists, drafting is blocked by default with a manual override option.

Drafts are stored under the artist and viewable at `/artists/:id/messages`. Each draft can be:
- **Approved** — marked as ready to send
- **Edited** — you've modified the text
- **Archived** — dismissed

Nothing is sent automatically. Drafts are for reference and copy-paste use only.

---

### Reference profiles

`/config/profiles` manages the MDC reference profiles that artists are matched against during evaluation.

**Profile types:**
- **Master** — the primary TRP identity profile. One master profile is seeded by default. All evaluations fall back to this profile if no specific profile is selected.
- **Archetype** — a profile representing a specific artist archetype or lane.
- **Campaign** — a profile for a specific project or campaign.

#### Creating or editing a profile

1. Go to `/config/profiles` and click **New profile**.
2. Enter a name and select a type.
3. (Optional) Paste a narrative description of what this profile represents, then click **Extract MDC** to auto-generate its tag set from the text.
4. You can also add and remove tags manually.
5. Click **Save**.

The tag set on a reference profile defines what terms are used to score artists. A match means the artist's MDC includes that term; absent means it doesn't. The match score (0–10) drives the Culture Fit and Strategic Fit axis prompts during evaluation.

---

### Scoring config

`/config` lets you adjust how the composite score is calculated.

**Axis weights** — the percentage weight given to each of the five axes when computing the composite score. Weights must sum to 100%. Changes apply to future evaluations only; past evaluations store the weights used at the time.

**Tier bands** — the composite score thresholds that determine which tier an artist falls into. The defaults are:

| Tier | Range |
|---|---|
| SIGN | 8.5 – 10.0 |
| NURTURE | 6.5 – 8.4 |
| GUIDE | 4.5 – 6.4 |
| NOT_READY | 2.5 – 4.4 |
| PASS | 0.0 – 2.4 |

---

## Navigation reference

### Desktop nav bar (top)

| Link | Page | Purpose |
|---|---|---|
| Pipeline | `/` | Artist grid with filters |
| Analytics | `/analytics` | Aggregate stats and charts |
| Queue | `/queue` | Cross-artist CTA board |
| Events | `/events` | Cross-artist schedule |
| Commissions | `/commissions` | Full deal ledger |
| New artist | `/artists/new` | Add a new artist |
| Profiles | `/config/profiles` | Reference profile CRUD |
| Config | `/config` | Scoring weights and tier bands |

### Mobile bottom nav

| Tab | Page |
|---|---|
| Pipeline | `/` |
| New | `/artists/new` |
| Queue | `/queue` |
| Config | `/config` |

### Artist detail page sections

| Section | What it contains |
|---|---|
| Profile | Identity, stats, links, scout notes |
| Schedule | Events (calls, meetings, follow-ups) |
| Deals | Commission ledger for this artist |
| Evaluation history | All evaluation runs, newest first |

---

## Roles

| Role | Permissions |
|---|---|
| `kol` | View everything, add artists, run evaluations, create CTAs |
| `team` | All KOL permissions + agree on CTAs |
| `admin` | All team permissions + mark CTAs as actioned, full config access |

Roles are assigned by an admin in the Supabase SQL editor:

```sql
-- Assign a role
INSERT INTO user_roles (user_id, role)
SELECT id, 'team'   -- or 'kol' or 'admin'
FROM auth.users
WHERE email = 'teammate@example.com';

-- Update an existing role
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');

-- View all roles
SELECT u.email, r.role
FROM auth.users u
JOIN user_roles r ON r.user_id = u.id;
```

---

## Data model

| Table | Purpose |
|---|---|
| `artists` | Artist profiles with identity, stats, narrative, and MDC tags |
| `evaluations` | Scored evaluation snapshots (one per run) |
| `message_drafts` | Claude-drafted outreach messages per evaluation |
| `scoring_config` | Axis weights and tier-band thresholds (single row) |
| `mdc_taxonomy` | Canonical MDC terms with categories, synonyms, and weights |
| `reference_profiles` | MDC profiles for matching (master / archetype / campaign) |
| `user_roles` | Maps Supabase Auth users to app roles |
| `ctas` | One active CTA per evaluation (reach_out / nurture / watchlist / pass) |
| `cta_audit_log` | History of every CTA status change with actor |
| `events` | Scheduled calls, meetings, and follow-ups per artist |
| `deals` | Commission deals per artist |
| `deal_payments` | Individual payment events per deal (advance / royalty / milestone) |
| `deal_splits` | Team member commission split percentages per deal |

---

## Tiers

| Tier | Composite | Meaning |
|---|---|---|
| SIGN | 8.5 – 10.0 | Bring to TRP immediately |
| NURTURE | 6.5 – 8.4 | Massive potential — develop the relationship |
| GUIDE | 4.5 – 6.4 | Has potential — needs guidance and time |
| NOT_READY | 2.5 – 4.4 | Track but don't engage yet |
| PASS | 0.0 – 2.4 | Not a fit (internal label, never shared with artist) |

---

## Archetypes

TRP uses 13 archetypes to classify an artist's style. Every evaluation returns a percentage blend across all 13 — artists are rarely a single archetype.

| Archetype | Reference | Description |
|---|---|---|
| Drill Insurgent | Chief Keef / Pop Smoke | Raw regional street movements, energy over polish |
| Martyr-Prophet | Tupac | Thug-poet duality, emotional revolutionary, spiritual rage |
| Griot | Nas | Street poet, knowledge-of-self, cinematic realism |
| Hustler-Mogul | Jay-Z | Streets-to-boardroom, Black capitalism |
| Warrior | Ice Cube / N.W.A | Gangsta, ghetto reportage, protest through aggression |
| Cosmic Trickster | OutKast / André 3000 | Southern avant-garde, genre-bending |
| Technical Assassin | Eminem | Battle-rap purist, pure mechanics |
| Divine Feminine | Lauryn Hill | Soul-conscious, spiritual depth |
| Shapeshifter | Lil Wayne | Punchline savant, melodic/auto-tune godfather |
| Vulnerable Crossover | Drake | Melodic, emo, pop-rap |
| Trap Architect | Gucci Mane | Street economics, regional dominance |
| Masked Mystic | MF DOOM | Underground villain mythology, abstract, anti-celebrity |
| Feminine Sovereign | Nicki / Megan | Sex-positive, alter-ego theatrics, pop dominance |
