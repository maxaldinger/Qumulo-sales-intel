# Q-Intel — Handoff Document

**For:** the next Claude instance picking up this project.
**From:** the previous Claude (Sonnet 4.5) and Max Aldinger.
**Date of handoff:** 2026-05-09.

Read this file end-to-end before touching any code. It tells you what is real,
what is hallucinated, what works, what is broken, and what the user actually
needs next.

---

## 1. Context — why this exists

Max is preparing to engage with **Qumulo** (Seattle-based unstructured-data
storage platform). The platform you're looking at, **Q-Intel**, is a forked
and rebranded version of Max's earlier **StarIntel** project (built for
Stardog, a knowledge-graph company). Q-Intel is the same architecture
re-pointed at Qumulo's positioning, competitive landscape, and Southwest
commercial territory (AZ, NM, UT, CO, $500M-$2B band).

Max's intent for the platform:
- Show Doug Gourlay (Qumulo CEO) and Michelle Palleschi (COO) a working,
  Qumulo-branded sales-intelligence tool he built.
- Use it during territory planning conversations to demonstrate AE-level
  thinking about discovery, displacement, and stakeholder mapping.
- Eventually use it as his actual day-to-day tool if he joins Qumulo.

**This is not a production product. It is a portfolio piece + working
prototype.** Reliability matters less than coherence and credibility.

---

## 2. Where everything lives

| Thing | Path / URL |
|---|---|
| Source repo | `C:\Users\Max\Desktop\Qumulo sales intelligence\qumulo-intel\` |
| GitHub | https://github.com/maxaldinger/Qumulo-sales-intel |
| Vercel (deployed) | `<something>-intel.vercel.app` (Max has the exact URL) |
| Original StarIntel (parent) | `C:\Users\Max\Desktop\Star lead\stargraph\` |
| Local env | `qumulo-intel/.env.local` (gitignored) |
| Supabase project | `lfyldhhlpviiqdaosnpb.supabase.co` (shared with StarIntel) |

**Important:** Q-Intel runs against the **same Supabase project as StarIntel**.
The DB tables are `sg_*` (e.g. `sg_territory_accounts`, `sg_contacts`,
`sg_contact_roles`, `sg_account_plans`, `sg_company_intel`,
`sg_signal_timeline`, `sg_feed_cache`). The `migration.sql` in the repo
defines a `q_*` parallel schema that **does not exist on the live DB** —
treat it as documentation only, not as the source of truth. The code
queries `sg_*`.

A column in `sg_territory_accounts` is named `stardog_fit` — leave it alone,
the UI labels it "Qumulo Fit" but the DB column name still says stardog.

The tenant constant in `src/lib/account-planning.ts` is exported as
`QUMULO_TENANT_ID` but its UUID value (`00000000-...001`) is the same as
StarIntel's tenant. That's intentional — same tenant, same data.

---

## 3. Stack

- **Next.js 14.2.5** App Router, TypeScript, Tailwind.
- **Anthropic Claude Haiku 4.5** for every AI call. Model id:
  `claude-haiku-4-5-20251001`. Single shared context lives in
  `src/lib/qumulo-context.ts`.
- **Supabase** for caches, account data, contact roles, RLS-enforced
  tenancy. Service-role key in env.
- **Leaflet** for the territory map.
- **lucide-react** for icons.

Single Tailwind brand color `sherpa: #003E51` plus cyan accents. The Qumulo
mark lives at `public/qumulo-mark.svg`. **Do not** reintroduce orange or
"qumulo-navy/qumulo-orange" classes — Max already rejected that palette.

---

## 4. File map

```
src/
  app/
    layout.tsx                 # metadata, body bg
    page.tsx                   # tab shell: Signal Feed / Sales Assist / Territory / Account Planning (+ admin Architecture)
    globals.css
    api/
      feed/route.ts            # GET. RSS scan + USAspending → Claude → cache. Hardcoded VERTICALS.
      analyze/route.ts         # POST. Scrape + news + contracts → Claude. Returns Intel object.
      timeline/route.ts        # GET. Per-company signal history.
      meddpicc/route.ts        # POST. Notes → MEDDPICC scorecard + LOU + threading + next steps.
      sa-chat/route.ts         # POST. Generic sales-coach chat. Used by Sales Assist tools.
      sa-product-fit/route.ts  # POST. Notes → fit scoring across 6 Qumulo dimensions.
      sa-pricebook-quote/route.ts # POST. Line items → quote summary.
      sa-lou/route.ts          # POST. Transcript → LOU rows.
      sa-proposal/route.ts     # POST. Notes → structured proposal.
      sa-threading/route.ts    # POST. Contact list → threading score + recommendations.
      account-planning/
        accounts/route.ts        # GET. List of accounts with coverage scores.
        contacts/route.ts        # POST/DELETE. Add/remove contacts.
        detail/[id]/route.ts     # GET. Single account + contacts + plan.
        role/route.ts            # POST. Update a contact's role/stance/influence.
        suggest-role/route.ts    # POST. Claude classifies a contact into the role taxonomy.
        intel/route.ts           # POST. Save the free-text intel brief on an account.
        generate-brief/route.ts  # POST. Claude rewrites notes as a structured brief.
  components/
    page-level: signal-feed, sales-assist, territory-plan, account-planning, account-planning-detail, knowledge-graph
    builders:   sa-lou-builder, sa-threading-builder, sa-proposal-builder, sa-product-fit-builder, sa-deck-builder, sa-meddpicc-builder, sa-pricebook-builder
    helpers:    sa-input-bar, sa-description-select, sa-follow-up-chat, intel-card, company-search, territory-map, meddpicc-builder
  lib/
    qumulo-context.ts          # SINGLE SOURCE OF TRUTH for Qumulo positioning. All API prompts import it.
    types.ts                   # VERTICALS, color tokens, Intel/Company/Signal/Contact interfaces.
    account-planning.ts        # Roles, stances, coverage scoring. Exports QUMULO_TENANT_ID.
    db.ts                      # Supabase client.
    strip-em.ts                # Em-dash sanitizer.
public/
  qumulo-mark.svg              # Logo.
migration.sql                  # q_* schema. Documentation only, not run against live DB.
.env.local                     # Gitignored. Contains live Anthropic + Supabase keys.
```

---

## 5. What is REAL vs HALLUCINATED

**Read this section carefully. Max specifically asked about it.**

### Real
- All Qumulo company facts in `qumulo-context.ts` (HQ, founding, funding, CEO/COO bios, products, multi-cloud reach, hardware partners, OPEX channels). Sourced from Max's original brief and verifiable public record.
- Qumulo's competitive set (Isilon, NetApp ONTAP, Pure FlashBlade, VAST, Weka, Nasuni, Panzura, CTERA, FSx, Azure NetApp Files, Filestore). Real.
- Company **names, cities, states, and coordinates** in the territory account list. All real entities at real locations.
- All code, API routes, schema, plumbing.

### Hallucinated (plausible fiction, NOT researched)
For each of the 10 default accounts in `territory-plan.tsx`:
- `data_challenge` — claims about **what storage incumbent each account currently runs and what specific pain that creates**. Pattern-matched from vertical, not researched. Examples: "TGen runs Isilon," "Micron Lehi has ONTAP cluster sprawl," "Sandia replicates to Livermore on legacy NAS." **Treat as hypothesis, not fact.**
- `stardog_fit` — Qumulo capabilities (real) mapped onto the guessed pain. The capabilities exist; the claim they solve *this* account's *specific* problem is inferred.
- `entry_strategy` — plausible tactics, no actual relationship/signal data behind them.
- `key_personas` — **role titles only, no real names anywhere**.
- `est_acv` — fabricated ranges based on rough deal-size patterns.
- Revenue figures — approximate from memory, not pulled from current sources.

### Customer references in `qumulo-context.ts`
Lines like "Wellcome Sanger, Hudson Alpha, and Memorial Sloan Kettering on Qumulo for genomics" and "NREL is a Qumulo customer" — **not verified against qumulo.com/customers**. Some are likely real public references but I did not check. **Verify before citing in front of Doug.**

### Runtime AI output
The Signal Feed and `/api/analyze` use real Google News RSS + USAspending.gov + a website scrape as grounding, then ask Claude to synthesize an Intel object. Anything in the synthesis (incumbent vendor, internal pain, target contacts, competitor risk) that isn't quoted from the source material is Claude inferring. Treat AI output as a starting point for discovery, not as ground truth.

---

## 6. What works right now

- Local dev server runs cleanly: `cd qumulo-intel && npm run dev` → http://localhost:3000.
- All four user-facing tabs load: **Signal Feed**, **Sales Assist**, **Territory Plan**, **Account Planning**.
- Architect mode (Ctrl+Shift+G) reveals the Architecture knowledge-graph view.
- `/api/account-planning/accounts` returns rows from the shared Supabase (Bloomberg, Eli Lilly, First Citizens Bank, etc. — these are leftover StarIntel data; see Open Issues below).
- MEDDPICC builder + Sales Assist follow-up chat: chat panel has expand-to-fullscreen modal (X button or Esc), drag-to-resize handle, and a 420px default. Don't shrink it again.
- Vercel auto-deploys on push to `main`.

---

## 7. Known broken / unfinished

### A. Vercel deployment ANTHROPIC_API_KEY is stale
Max's most recent local key is in `.env.local`. The Vercel deployment still has the **old, expired** key, so any AI call from the deployed site returns 401.

**Fix:** Vercel dashboard → project settings → Environment Variables → set `ANTHROPIC_API_KEY` (Production + Preview + Development) → redeploy.

The current valid key was provided by Max in the prior session. He keeps it in his local `.env.local`. Ask him for it; do not paste it into git.

### B. Local `.env.local` is partially loaded by Next.js dev server
We saw a weird symptom on Node v24.13: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were read fine but `ANTHROPIC_API_KEY` was treated as missing on plain `npx next dev`. The workaround that worked was inlining the env vars on the command line:

```bash
ANTHROPIC_API_KEY="sk-ant-..." NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npx next dev -p 3000
```

This may have been a stale `.next/` cache or a Next 14.2.5 + Node 24 quirk. If Max sees "Missing ANTHROPIC_API_KEY" in dev logs, this is the workaround. Long-term fix: pin Node to LTS (20 or 22), then `.env.local` should load normally.

### C. Account Planning shows StarIntel-era accounts
The accounts visible in the Account Planning tab (Bloomberg, Eli Lilly, First Citizens Bank, etc.) are leftover Stardog-era target accounts that were inserted into `sg_territory_accounts` during the StarIntel build. They are **not** the Qumulo Southwest territory accounts.

The Qumulo territory accounts (TGen, LANL, Sandia, NREL, Lockheed Martin Space, Micron Lehi, Intel Chandler, Halliburton, U of Utah, CSU) are **only hardcoded in `src/components/territory-plan.tsx`** as `DEFAULT_ACCOUNTS`. They are not in the database.

If Max wants Account Planning to map to his actual Qumulo territory, someone needs to:
1. Decide whether to clear `sg_territory_accounts` and seed it with the Qumulo accounts, or
2. Wire the Territory Plan tab's "Import" feature to also INSERT into `sg_territory_accounts` so imported accounts flow into Account Planning, or
3. Add a separate seed script.

This is an **open product decision**, not a bug. Ask Max which way he wants it before taking action.

### D. Hallucinated account intel
See Section 5. The `data_challenge`, `stardog_fit`, `entry_strategy`, `key_personas`, `est_acv` fields on each `DEFAULT_ACCOUNTS` entry are educated guesses, not researched facts. If Max plans to show this to Doug, either:
1. Mark each field visually as "(unverified hypothesis)" in the UI, or
2. Replace the hardcoded fields with live `/api/analyze` output for each account, or
3. Have Max research the top 3-5 accounts manually and replace the fields with verified copy.

### E. CRLF warnings on commit
The repo has Windows line endings; git complains on every `git add`. Cosmetic. To silence: add a `.gitattributes` with `* text=auto` or run `git config core.autocrlf true`.

### F. `migration.sql` references the wrong schema
The migration creates `q_*` tables, but the live code uses `sg_*`. Either update the migration to match `sg_*`, or rewrite the code to use `q_*` and run the migration. Currently the migration is "documentation that lies." Recommend updating it to match the running schema.

---

## 8. The user's actual ask going into this session

Max ran out of patience with hallucinated demo content and wanted to know
what was real before walking into a Qumulo conversation. The previous Claude
gave him an honest audit (Section 5 of this doc). He then asked for this
handoff so a fresh Claude doesn't have to re-derive the truth.

**Open work items he's likely to give you:**

1. **De-hallucinate the territory list.** Either visually flag each unverified field, or replace hardcoded copy with live API output, or have him research the top 5 manually.
2. **Verify customer references** in `qumulo-context.ts` against the real Qumulo customer page.
3. **Decide and execute** on Account Planning data source (Section 7C).
4. **Fix Vercel env vars** so the deployed site actually serves AI responses (Section 7A).
5. **Possibly:** prep him for a specific live conversation. If he tells you which account he's about to engage, do real research (web search if available, public 10-Ks, news) on that one account and rewrite its `data_challenge` / `stardog_fit` from facts instead of pattern-match.

---

## 9. How to run locally

```bash
cd "C:\Users\Max\Desktop\Qumulo sales intelligence\qumulo-intel"
npm install                            # if needed
npm run dev                            # http://localhost:3000
```

If you see "Missing ANTHROPIC_API_KEY" in the dev log even though
`.env.local` has the key, use the workaround in Section 7B (inline env on
command line) and ask Max why his Node version is doing that.

To validate compilation:
```bash
npx next build
```

Smoke tests against live API (requires valid Anthropic key):
```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"company":"TGen"}' | jq '.intel | {company_name, primary_vertical, relevance_score, qumulo_fit}'
```

---

## 10. Things to NOT do

- Do **not** reintroduce orange / `qumulo-orange` / `qumulo-navy` Tailwind classes. Max rejected that palette. Sherpa teal + cyan only.
- Do **not** add a "CEO Demo Mode" tab back. Max removed it on purpose.
- Do **not** rename DB tables from `sg_*` to `q_*`. The live DB has `sg_*` populated.
- Do **not** commit `.env.local`. Already gitignored — verify before committing.
- Do **not** invent more account-specific intel and pass it off as researched. If you need to populate a field, either pull from a real source or label it as a hypothesis.
- Do **not** put real names of Qumulo employees in the codebase unless they're public-record (Doug Gourlay, Michelle Palleschi are fine; rank-and-file are not).

---

## 11. Quick credibility checklist before any Qumulo conversation

1. Have you verified the Qumulo customer logos cited in `qumulo-context.ts` against qumulo.com?
2. Have you flagged the territory account `data_challenge` / `stardog_fit` fields as hypotheses, or replaced them with researched content?
3. Is the Vercel deployment running on a valid Anthropic key?
4. Does the Account Planning tab show Qumulo-territory accounts (not Bloomberg / Eli Lilly leftovers)?
5. Have you confirmed which Qumulo person Max is actually meeting with, and is the demo flow tuned to that audience?

---

End of handoff. If any of this is stale by the time you read it, ask Max to
update this file before you trust it.
