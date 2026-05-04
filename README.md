# Q-Intel — Qumulo Sales Intelligence

A territory-intelligence platform purpose-built for selling Qumulo, the unified
global file system for unstructured data at exabyte scale. Built for the
Southwest commercial territory (AZ, NM, UT, CO, $500M-$2B band).

## What it does

| Tab               | What it gives the rep                                                |
|-------------------|----------------------------------------------------------------------|
| **CEO Demo**      | 5 high-fit accounts in territory, ready to walk through with Doug.   |
| **Signal Feed**   | Live RSS + federal contract scan filtered to Qumulo ICP signals.     |
| **Sales Assist**  | LOU drafter, threading map, MEDDPICC scorecard, proposal builder, product fit, deck builder, pricebook quote. All grounded in Qumulo positioning. |
| **Territory Plan**| 10 pre-researched accounts in territory with displacement stories.   |
| **Account Planning** | Stakeholder mapping, role coverage, AI-suggested role classification. |

Architect mode (Ctrl+Shift+G) reveals the platform-architecture knowledge graph.

## Stack

- **Next.js 14** App Router, TypeScript.
- **Anthropic Claude Haiku 4.5** for every intelligence call.
- **Supabase** for caches, account data, contact roles, RLS-enforced tenancy.
- **Tailwind** with Qumulo navy + orange accent palette.
- **Leaflet** for the territory map.

## Setup

```bash
cd qumulo-intel
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev
```

### Required environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Supabase setup

Run `migration.sql` in the Supabase SQL editor against a fresh project. It
creates tables prefixed `q_` so it does not collide with prior installations.

## Where Qumulo positioning lives

All Claude prompts pull from a single shared context file:

- [`src/lib/qumulo-context.ts`](src/lib/qumulo-context.ts) &mdash; company description,
  products, differentiators, ICP, competitive frame, common objections.
- [`src/lib/demo-accounts.ts`](src/lib/demo-accounts.ts) &mdash; the 5 CEO-demo
  accounts (TGen, LANL, defense services in CO Springs, Micron Lehi, CSU).
- [`src/components/territory-plan.tsx`](src/components/territory-plan.tsx) &mdash;
  10 default Southwest accounts with displacement narratives.
- [`src/components/sa-pricebook-builder.tsx`](src/components/sa-pricebook-builder.tsx)
  &mdash; indicative Qumulo pricebook for proposal modeling.

When Qumulo positioning shifts, edit `qumulo-context.ts` and the rest of the
platform inherits it.

## Validation

To run a quick smoke test of the core analysis path against three accounts in
the territory:

```bash
npm run dev
# In a second terminal:
curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"company":"TGen"}' | jq '.intel | {company_name, primary_vertical, relevance_score, qumulo_fit}'

curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"company":"Micron Technology"}' | jq '.intel | {company_name, primary_vertical, relevance_score, qumulo_fit}'

curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"company":"NREL"}' | jq '.intel | {company_name, primary_vertical, relevance_score, qumulo_fit}'
```

A clean run returns a vertical that maps to the new Qumulo taxonomy
(`lifesciences`, `semiconductor`, `research`, etc.), a 60+ relevance score,
and a `qumulo_fit` blurb that names the likely incumbent and the displacement
wedge.

## Provenance

Forked from the StarIntel knowledge-graph sales platform. Architecture is
identical; positioning, verticals, competitive frame, target accounts, and
displacement stories are Qumulo-specific.
