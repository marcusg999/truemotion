# True Motion

True Motion is an A&R evaluation and outreach pipeline for TRP.L (The Rap
Project Label). It ingests structured data about a discovered artist,
classifies their stylistic archetype against TRP's 13 archetypes, scores
their fit with TRP across five axes, rolls those into a relationship tier,
and drafts human-approved outreach messages.

It is a **persistent pipeline**, not a one-shot calculator — every evaluated
artist is stored in Postgres (via Supabase) and can be re-evaluated over time,
with full evaluation history.

## Architecture

```
ingest (manual form) → enrich (confidence scoring) → score (Claude: axis
scores + archetype blend + growth path) → draft outreach (Claude: tier- and
archetype-aware message drafts, human-gated)
```

Each stage is modular (`src/lib/pipeline/`), so automated enrichment
(Instagram scraping, audio analysis, EPK parsing) can be added later as an
optional stage without changing scoring or outreach.

## Stack

- **Frontend/Backend:** Next.js (App Router) + TypeScript
- **Database:** Supabase (Postgres)
- **LLM:** Anthropic API (Claude) — archetype classification, scoring
  rationale, and outreach drafting

## Setup

1. Create a Supabase project (or use an existing Postgres database).
2. Run the SQL in `supabase/migrations/0001_init.sql` against your database
   (Supabase SQL editor, or `psql`).
3. Copy `.env.example` to `.env.local` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `ANTHROPIC_API_KEY`
4. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Open http://localhost:3000.

## Data model

- **artists** — manually entered profile: identity, region, style tags,
  follower/engagement/listener stats, links (IG/track/EPK as references,
  not auto-parsed), and scout notes. Missing fields are tracked for
  confidence scoring.
- **evaluations** — one row per evaluation run, with a timestamp so history
  is preserved across re-scores:
  - Five axis scores (0-10) + one-line rationale each: Craft, Traction,
    Culture Fit, Readiness, Strategic Fit
  - Composite score (weighted average, weights configurable)
  - Confidence score (0-100%, based on profile completeness)
  - Tier: `SIGN` / `NURTURE` / `GUIDE` / `NOT_READY` / `PASS`
  - Archetype blend (percentages across TRP's 13 archetypes) + justification
  - Growth path (concrete next steps, for GUIDE/NURTURE tiers)
  - The weights used at evaluation time, so past evaluations stay explainable
    even if config changes later
- **message_drafts** — 2-3 tone variants (warm/professional/hype) per
  evaluation, each requiring human approval/edit (`draft` → `edited` /
  `approved` / `archived`) before use. Nothing is sent automatically.
  `PASS`-tier evaluations get no drafts unless manually overridden.
- **scoring_config** — editable axis weights and tier-band thresholds
  (`/config` page), applied to future evaluations.

## Tiers

| Tier      | Composite range | Meaning                                  |
| --------- | ---------------- | ---------------------------------------- |
| SIGN      | 8.5 – 10.0        | Bring to TRP                              |
| NURTURE   | 6.5 – 8.4         | Massive potential, develop relationship   |
| GUIDE     | 4.5 – 6.4         | Has potential, needs guidance             |
| NOT_READY | 2.5 – 4.4         | Track but don't engage yet                |
| PASS      | 0.0 – 2.4         | Not a fit (internal label only)           |

## v1 scope

Manual input → multi-axis score + confidence → tier → archetype blend →
growth path → human-gated message drafts → stored pipeline with history.

Deferred to v2: Instagram scraping, automated audio analysis, EPK parsing,
auto-enrichment.
