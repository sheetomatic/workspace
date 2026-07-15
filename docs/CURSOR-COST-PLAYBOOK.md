# Cursor cost playbook (Sheetomatic)

**Goal:** Make **Pro+ (~$60/mo)** last the full billing month — not burn out in ~10 days — **without** slowing product work or shipping broken code.

Official references (prices change): [cursor.com/pricing](https://cursor.com/pricing), [Usage limits](https://cursor.com/help/models-and-usage/usage-limits), dashboard [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage).

Repo agent memory: `.cursor/rules/cursor-cost.mdc`  
Related: `docs/VERCEL-COST-PLAYBOOK.md` (hosting $).

---

## How Cursor burns the $60

Plans include a **monthly API / agent usage budget** (Pro+ is the ~$60 tier / ~3× Pro usage). Usage is charged like model API cost:

| Consumes included budget fast | Usually cheaper / separate pool |
|------------------------------|----------------------------------|
| Manually picking **frontier** models (Claude Opus, heavy Sonnet, GPT‑5, etc.) | **Auto** / **Composer** / first‑party pool (often more generous) |
| **Max Mode** / huge context windows | Normal context, @-mention few files |
| Long **Agent** / **Cloud Agent** loops (many tool turns) | Short focused tasks; Ask mode for questions |
| **Parallel** multi-agents + Bugbot on usage billing | One agent; Bugbot only when needed |
| Re-reading giant files (`globals.css`, huge actions) every turn | Targeted reads; follow `sheetomatic.mdc` |

Tab completions alone are rarely what empties Pro+ in 10 days. **Agent + premium model + fat context** is.

---

## Dashboard hygiene (do once, then weekly)

1. Open [Usage](https://cursor.com/dashboard/usage) — which model and which days burned most?
2. Settings → spend / on-demand:
   - Prefer a **hard or soft cap** so overage doesn’t surprise you after included $ is gone
   - If included budget hits early, switch to **Auto/Composer** for the rest of the month instead of paying overage by default
3. Disable or pause **Bugbot** / automations you aren’t actively using (they can be usage-based)
4. Don’t run overlapping Cloud Agents on the same feature “just in case”

---

## Daily workflow (human) — stretch Pro+ to 30 days

### Default mode ladder (cheapest → spendiest)

| Work type | Use | Avoid |
|-----------|-----|--------|
| Typos, renames, small CSS, “where is X?” | Tab + **Ask** + **Auto/Composer** | Opus / Max / Cloud Agent |
| One-file bugfix, small UI polish | **Agent** on Auto/Composer, @ one file | Whole-repo explore |
| CRM/DB/auth hard bug, schema design | One strong model Agent, tight scope | 4 parallel agents + Max |
| Multi-module feature | One plan → implement in slices; specialists only when files don’t overlap | “Build everything” mega-prompt |
| Docs / pricing / research | Ask mode, short answers | Cloud Agent + full repo index |

### Prompt habits that cut tokens

- **@-mention** the 1–3 files that matter; don’t say “search the whole codebase” first
- One job per chat; new chat when topic changes (stale long threads re-send huge history)
- Paste the error + file path; don’t attach entire logs unless asked
- Prefer “fix X in `path`” over “improve the CRM”
- Stop runaway agents early if they’re looping on the same lint

### Cloud Agents

- Use for **shippable** batches (PR-sized), not every question
- Don’t start a new Cloud Agent to answer “what’s the root cause?” — use IDE Ask first
- Avoid stacking Frontend + Backend + Quality + SaaS + Release for a **small** change
- One Cloud Agent with a clear acceptance check beats three overlapping ones

### Model choice (rule of thumb)

- **80% of day:** Auto / Composer / Grok-class (included-friendly)
- **15%:** Strong Sonnet / GPT for multi-file logic
- **5%:** Opus / Max / multi-agent — architecture, nasty prod incidents, migrations

If you’re on Opus for every chat, Pro+ will die in ~1–2 weeks.

---

## Agent / repo rules (already enforced via `.cursor/rules`)

Agents must:

1. Prefer **smallest diff**; no drive-by refactors  
2. **Not** read `src/app/globals.css` (~4k lines) for SaaS-only fixes — use workspace CSS  
3. **Not** `Glob **/*` the repo root; targeted paths only  
4. Launch parallel subagents **only** when scopes don’t overlap and the task is large  
5. Use **readonly explore** for “where is / why” before full edit agents  
6. Avoid re-fetching the same docs/pages repeatedly in one turn  
7. Don’t run `npm run build` unless routes/auth/schema or user asked  
8. Don’t spam Bugbot / security-review unless user asked  

Orchestration (`multi-agent-orchestration.mdc`) is for **large** features — not every ticket.

---

## What empties Pro+ in ~10 days (typical Sheetomatic pattern)

| Habit | Fix |
|-------|-----|
| Cloud Agents all day on frontier models | Cap: 1–2 focused Cloud runs/day; IDE Auto for the rest |
| “Explore whole CRM / HRMS” open-ended | Point at file + symptom (“Connection closed on /app/leads”) |
| Max Mode always on | Off unless you need huge context |
| Many parallel specialists for a one-line fix | Skip orchestration; one Agent |
| Long chat with full PR history attached | New chat + link to PR/files |
| Re-asking the same deploy/hosting question | Point to `docs/RAILWAY.md` / `docs/VERCEL-COST-PLAYBOOK.md` |

---

## Monthly budget sketch (Pro+ ~$60)

Rough pacing so included usage lasts ~30 days:

| Week | Budget mindset |
|------|----------------|
| Days 1–7 | Heavy shipping OK; still prefer Auto for glue work |
| Days 8–14 | Check Usage mid-cycle; if &gt;50% gone, switch default model to Auto |
| Days 15–21 | Frontier only for blockers; Cloud Agents PR-sized only |
| Days 22–30 | Protect remaining budget; Ask mode + small Agents |

If you’re consistently out by day 10 **after** these habits, options are: raise plan (Ultra), enable controlled on-demand with a cap, or cut Cloud Agent hours — not “use a worse product.”

---

## Anti-patterns (don’t do these to “save”)

| Anti-pattern | Why it’s bad |
|--------------|--------------|
| Skip tests / skip review to save tokens | Prod incidents cost more than Cursor $ |
| Never use a strong model on auth/DB | Wrong migrations / tenant bugs |
| Delete Cursor rules that keep diffs small | Ironically increases token burn later |
| Run without Privacy Mode if policy requires it | Compliance risk ≠ cost win |

---

## Quick checklist (pin this)

- [ ] Default model: **Auto/Composer**  
- [ ] Max Mode: **off** unless needed  
- [ ] On-demand: **capped** or off after included $  
- [ ] Usage dashboard: check **weekly**  
- [ ] Cloud Agents: **PR-sized**, not chatty  
- [ ] @ files instead of whole-repo explores  
- [ ] Parallel agents: **large tasks only**  
- [ ] Bugbot/automations: on only when you use the output  

---

## For agents reading this

Follow `.cursor/rules/cursor-cost.mdc`. When the user says they’re low on Cursor budget, prefer Ask/readonly, smaller scopes, fewer subagents, and Auto-tier reasoning — still ship correct, tenant-safe code.
