# Epic: PlumbingAgent Launch Site v1.0

## Purpose
Ship a conversion-focused launch website that tells the PlumbingAgent MVP story end to end: WhatsApp intake → organiser approval → Schedule-X scheduling → offline job card execution → provider-issued invoice. The site must mirror the product narrative documented in `Docs/plumbing_agent_mvp_prp.md` and `Docs/plumbing_agent_mvp_epic.md`, giving prospects a clear path to start a WhatsApp conversation or book a guided demo.

## Success Outcomes
- Visitors understand that PlumbingAgent automates intake, scheduling, job cards, and provider invoicing while organisers stay in control.
- Primary CTA (WhatsApp chat) and secondary CTA (demo booking) convert ≥5% of unique visitors during pilot launch.
- EN/NL copy parity with Dutch as the default tone; both locales ship together.
- Page loads <1.5 s on 3G with animations respecting `prefers-reduced-motion`.
- `pnpm guard` remains green and lighthouse performance stays ≥90 on mobile.

## Guardrails
- Match the feature slices, role boundaries, and AI approval workflow defined in the MVP epic.
- No dashboards, login flows, or speculative features—focus on the WhatsApp-to-job-card loop.
- Showcase real integrations only (MessageBird, Schedule-X, Moneybird, Mollie); flag pilots clearly.
- Respect GDPR messaging (retention timers, audit logs, DSAR support) and avoid over-promising automation.
- Honour existing component architecture: i18n namespaces, DTO-driven copy schema, shadcn UI primitives.

## Audience & Positioning
| Persona | Pain | Proof we show |
| --- | --- | --- |
| Organiser/Dispatcher | Missed WhatsApp leads, calendar chaos | Dual-number control desk, organiser approval before send |
| Owner | Cash flow, GDPR risk | Moneybird + Mollie loop, audit trail, retention timers |
| Field Plumber | Paper job cards, offline gaps | Mobile job card, offline sync, before/after photos |

Key message pillars:
1. **WhatsApp-first operations** – PlumbingAgent meets teams where they already work.
2. **Human-in-loop AI** – Every AI proposal requires organiser approval (confidence gating, audit trail).
3. **Schedule-X + mobile execution** – Travel-safe scheduling with offline-capable job cards.
4. **Provider invoicing** – Moneybird / WeFact / e-Boekhouden stay source of truth; iDEAL via Mollie.

## Information Architecture
1. **Hero** – Headline + WhatsApp CTA, organiser note on human approval, trust strip (GDPR, Schedule-X, Moneybird).
2. **Interactive control desk demo** – Simulated organiser chat showing approval flow and mirrored job creation.
3. **Feature grid** – AI intake, Schedule-X scheduling, digital job cards, provider invoicing, GDPR console.
4. **How it works timeline** – Intake → approve → schedule → job card → invoice.
5. **Social proof** – Testimonials + partner logos; highlight Dutch pilot crews.
6. **Pricing / Pilot cohort** – €149/mo pilot plan with cohort onboarding and white-glove setup.
7. **ROI calculator & Waitlist** – Quantify gains and capture leads directly on page.
8. **FAQ** – Objection handling (control, compliance, language, cancellation, Business API setup).
9. **Final CTA** – WhatsApp chat primary, strategy call secondary.
10. **Footer** – Legal, privacy, locale toggle.

## Content & Visual Guidance
- **Copy Tone**: Direct, operations-focused, Dutch-first phrasing with English equivalence. Use PRP keywords ("WhatsApp AI receptionist", "Schedule-X", "offline job card", "Moneybird", "Mollie iDEAL", "GDPR").
- **Visuals**: Gradient spotlight inspired by Mintlify/Reflect, device mockups showing WhatsApp control desk and job card. Use deterministic employee colours referencing `src/components/calendar/useEmployeeColors.ts`.
- **Micro-interactions**: One-time fade/slide reveals triggered on viewport, disabled when `prefers-reduced-motion` is set. CTA hover states need 44 px targets and focus outlines.
- **i18n Flow**: Maintain per-locale `launch.json` files; regenerate aggregates via `pnpm i18n:aggregate` and keep schema in sync with `LaunchCopy` Zod definition.

## Build Checklist
1. Sync with docs (`plumbing_agent_mvp_prp.md`, `plumbing_agent_mvp_epic.md`, `whatsapp_ai_unified_prp.md`, `schedule_x_prp.md`).
2. Produce content updates in `src/i18n/messages/en|nl/launch.json`; ensure meta tags cover SEO keywords.
3. Implement UI in `src/components/launch/LaunchPageContent.tsx` using shadcn primitives + framer-motion with reduced-motion support.
4. Keep launch routes (`/en/launch`, `/nl/launch`) server components that hydrate the client component with validated copy.
5. Update docs (`Docs/designing_an_engaging_product_landing_page.md`) when narrative or IA shifts.
6. Run `pnpm check` after copy or component updates; run `pnpm guard` before handoff.
7. Capture lighthouse/mobile and analytics tagging plan before go-live.

## Validation & Sign-off
- **Copy Review**: Product + marketing approve EN/NL content.
- **Legal**: Confirm GDPR statements and cookie banner wording with counsel.
- **Engineering**: `pnpm guard` + `pnpm logs:once` show no errors; service worker logs clean.
- **Stakeholder demo**: Record walkthrough aligning website sections to MVP loop and AI acceptance policy.

## Future Work (Deferred)
- Automate case study carousel once pilot telemetry is available.
- Add structured data (FAQPage, SoftwareApplication) after legal review.
- Incorporate Schedule-X live calendar snippets when public demo data is approved.
