# AI Agent Rules & Skill Execution Policy

This repository is equipped with a suite of 21 AI engineering skills, design systems, animation references, security audit suites, and workflow orchestrators located in `skills/` and linked via `.agents/skills/`.

All AI agents working within this workspace must adhere to the following skill selection rules and execution policies.

---

## 1. Skill Selection Policy

### A. Design & UI/UX Tasks
- **Design Direction & Tokens**: Use `ui-ux-max` (`skills/01-design-ui-ux/ui-ux-max`) when initiating a new interface, defining color tokens, or structuring dashboard layouts.
- **Frontend Implementation**: Use `frontend-design` (`skills/01-design-ui-ux/frontend-design`) when writing markup and CSS. Formulate a bespoke design plan (palette, typography, layout) before coding. Avoid default AI tropes (e.g. repetitive terracotta accents, generic SaaS card grids).
- **Visual Quality & Polish**: Use `impeccable` (`skills/01-design-ui-ux/impeccable`) and `taste-skill` (`skills/01-design-ui-ux/taste-skill`) to audit alignment, contrast, visual hierarchy, and typographical rhythm.
- **Anti-Slop Enforcement**: Use `no-ai-slop` (`skills/01-design-ui-ux/no-ai-slop`) to eliminate unnecessary hero cards, fake badge clutter, and generic corporate copy.
- **Apple / Cupertino Design**: Consult `apple-design` (`skills/01-design-ui-ux/apple-design`) for Apple Human Interface Guidelines, San Francisco typography scales, SF Symbols 6, and 44×44pt touch ergonomics.
- **Design Specifications**: Use `design-md` (`skills/01-design-ui-ux/design-md`) when establishing or reading a formal `DESIGN.md` contract.
- **Curated Reference**: Consult `awesome-design` (`skills/01-design-ui-ux/awesome-design`) for external UI libraries, color palettes, and inspiration.

### B. Frontend Libraries & Animation Tasks
- **React & Next.js Motion**: Use `framer-motion` (`skills/02-frontend-libraries-motion/framer-motion`) for declarative animations, gesture handlers (`whileHover`, `whileTap`), and shared layout transitions (`layoutId`).
- **Animation Physics & Micro-Interactions**: Consult `animations-dev` (`skills/02-frontend-libraries-motion/animations-dev`) for spring parameter tuning (stiffness, damping, mass), interruption recovery, and spatial continuity.
- **Text Measurement & Layout**: Use `pretext` (`skills/02-frontend-libraries-motion/pretext`) when high-performance canvas text layout or multiline text measurement is required without DOM reflow.

### C. Security & Safety Tasks
- **Codebase Auditing**: Use `cloudflare-security-audit` (`skills/03-security/cloudflare-security-audit`) to systematically inspect code for OWASP Top 10 vulnerabilities, SSRF, authorization bypass, and client-side flaws.
- **Security Guidance & Diff Monitoring**: Use `security-guidance` (`skills/03-security/security-guidance`) to guard against hardcoded secrets, dangerous commands, or unvalidated user inputs.
- **Executive Security & Threat Modeling**: Run `gstack (/cso)` for comprehensive threat modeling (STRIDE) and pentest reviews.

### D. AI Memory & Context Optimization
- **Codebase Knowledge Graphs**: Use `graphify` (`skills/04-ai-memory-retrieval/graphify`) to extract visual dependency graphs (`graph.json`, `graph.html`) and understand unfamiliar repository architectures.
- **Up-to-Date Documentation**: Use `context7` (`skills/05-context-optimization/context7`) to fetch verified, current API documentation for rapidly evolving frameworks before relying on training memory.

### E. Agent Setup & Workflow Discipline
- **Skill Discovery**: Use `find-skills` (`skills/06-ai-agent-skills-management/find-skills`) to locate and evaluate external skills when tackling specialized domain tasks.
- **Agent Skill Authoring & Best Practices**: Use `anthropic-agent-skills` (`skills/06-ai-agent-skills-management/anthropic-agent-skills`) as the gold standard for skill structure, progressive disclosure, and evaluation prompts.
- **First-Principles Coding**: Follow `karpathy-skills` (`skills/06-ai-agent-skills-management/karpathy-skills`) for minimalist code: avoid premature abstraction, maintain linear control flow, and keep dependencies lean.
- **Structured Planning & Test Discipline**: Use `superpowers` (`skills/06-ai-agent-skills-management/superpowers`) for step-by-step implementation plans and test-driven execution.
- **Cross-Agent Orchestration**: Use `ponytail` (`skills/06-ai-agent-skills-management/ponytail`) to manage multi-agent skill parity.

### F. Garry Tan Development Workflow Suite (gstack)
Use the 27+ specialized workflows in `skills/07-development-workflow/gstack/`:
- **Ideation & Strategy**: `/office-hours` (YC 6 forcing questions), `/plan-ceo-review` (10-star product vision).
- **Architecture & Planning**: `/plan-eng-review` (architecture, failure modes), `/plan-design-review` (visual score 0-10), `/autoplan` (automated review gauntlet).
- **Code Quality & Security**: `/review` (pre-landing review), `/cso` (security audit), `/investigate` (root-cause bug investigation).
- **QA & Browser Testing**: `/browse` (fast headless browser), `/qa` (test and fix loop), `/qa-only` (report-only QA), `/design-review` (visual QA with screenshots).
- **Safety Modes**: `/careful` (destructive command warnings), `/freeze` (restrict file edits to scoped folder), `/guard` (maximum safety).
- **Release & Delivery**: `/ship` (test, version bump, PR), `/land-and-deploy` (merge & deploy), `/canary` (health metrics check), `/document-release` (docs sync).

---

## 2. Progressive Disclosure Rules

1. **Read Before Writing**: When tasked with designing, animating, or securing an application, read the relevant reference guides in `skills/` first.
2. **Document Provenance**: Every resource retains its official `SOURCE.md`. Do not synthesize fake `SKILL.md` files for pure documentation or library assets.
3. **Zero Duplication**: Reference files in `skills/` directly or via `.agents/skills/`. Never make redundant copies of full repositories.

---

## 3. Specialized Workspace Agents

### UI Specialist (`ui-specialist`)
- **Specification**: `.agents/agents/ui-specialist.md`
- **Role**: Lead UI/UX Architect & Interaction Specialist.
- **Responsibility**: Analyzes workspace design systems (`ui-ux-max`, `frontend-design`, `impeccable`, `no-ai-slop`, `apple-design`), motion libraries (`framer-motion`, `animations-dev`), and gstack review workflows (`/plan-design-review`, `/design-review`). Breaks down UI upgrades into focused subagent tasks to achieve exceptional aesthetics, tactile micro-interactions, spring physics, and cohesive visual polish across all modules.


