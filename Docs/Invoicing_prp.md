PRP v2 — Finom-Style Invoicing + BTW-Prep inside Plumbing Agent



Version: 2.0 • Date: 3 Sep 2025 (Europe/Amsterdam) • Owner: Plumbing Agent

Template base: Ultimate PRP v3.x (with validation gates \& rollback)



Executive Summary



Deliver a Finom-style invoicing experience fully inside our dashboard. Plumbers issue invoices, chase payments, and prep VAT—all with our AI—while Moneybird / e-Boekhouden / WeFact (and Peppol fallback) handle numbering, legal PDFs/UBL, storage, and filing. We keep the UX moat; providers keep compliance. This PRP reflects your choices (see “Key Decisions”) and upgrades v1 with tighter branding, a professional “plumber-sends” feel, and invoice-only bundling.



Key Decisions (locked for v2)



Look \& feel: Finom-like visual language (clean, bright, bold totals, colored chips). ✔️ (A)



Customer invoice page: Our hosted page with provider pay link (keeps brand). ✔️ (B)



Onboarding tiles default: Show all (no opinionated default). ✔️ (D)



WeFact visibility: Hidden engine (no separate login). ✔️ (A)



Referrals: Show in-app (MB/eB trials \& perks). ✔️ (A)



Default send mode: We-send (email/WhatsApp) so it looks like it comes from the plumber. ✔️ (B)



Reminders: Our AI cadence by default (disable provider reminders). ✔️ (A)



Payments: iDEAL-first presentation. ✔️ (A)



External payment URL: Accept external domain (WeFact/Mollie). ✔️ (A)



Expenses capture: Photo/email-in → AI parse → push to provider. ✔️ (A)



BTW hand-off: Minimal widget + deep-link to provider’s draft. ✔️ (A)



Peppol: Add Access Point integration (Storecove/eConnect) as a standards fallback. ✔️ (A)



Download UBL: Expose to all. ✔️ (A)



Storage: Metadata-only our side; fetch PDF/UBL on demand. ✔️ (A)



Languages: nl-NL only (for now). ✔️ (A)



WeFact bundling: We pay \& rebill inside Premium. ✔️ (A)



Moneybird/e-Boekhouden: BYO subscription (they pay). ✔️ (A)



Next priorities (after v2): Customer Portal (C) then Credit Notes \& Deposits/Progress (B). ✔️



Business Outcomes (B)



Cash in faster: Finom-style “send then chase” lowers median time-to-paid and overdue %.



Low legal surface: Providers store official PDFs/UBL \& assign numbers; we store metadata.



Broader market fit: Plug into Moneybird, e-Boekhouden, or WeFact (bundled invoice-only); standards fallback via Peppol.



BTW-ready without accounting bloat: Light expenses capture + “Prepare BTW pack” → file in provider.



Measures (M)



Cash: Median send→paid < 24h; overdue ratio ↓ 30% vs baseline.



Adoption: ≥ 70% tenants connect a provider in week 1; ≥ 50% use AI draft.



Compliance: 100% of issued invoices have provider PDF/UBL; VIES result logged on send.



Perf: P95 API < 200ms on invoice actions; end-to-end stable.



What the User Sees (Finom-style “feel”)



Invoice editor: clean white canvas, bold totals, VAT per line, colored status chips.



Send dialog: “From YourBusiness.nl” (we-send), toggle channel (email/WhatsApp), reminder cadence preview.



Invoice detail: timeline (Created → Sent → Viewed → Paid), Download PDF, Download UBL, Pay now (iDEAL-first).



Expenses (light): “Add receipt” (camera/email-in) → AI pre-fills → OK → pushed to provider.



BTW widget: “Collected vs Paid” this quarter + Prepare BTW pack (opens provider’s draft to file).



Customer landing: our branded invoice page with embedded provider pay link.

(UX standards: nl-NL locale, Europe/Amsterdam, AA contrast, 44pt targets.)



Scope (Functional Requirements)



FR1 — Provider adapters (behind one interface)



Moneybird (headless): OAuth; create/update draft; send (numbering); fetch PDF/UBL; payment link; webhooks for status.



e-Boekhouden: API keys; create/send; leave number blank → auto-number; fetch PDF; poll status.



WeFact (bundled engine): API key + IP allow-list; draft→send; capture PaymentURL; PDF/UBL download; Peppol on send where applicable. (Hidden to plumber.)



Peppol fallback: Generate UBL for all invoices; integrate one NL Access Point; store message IDs \& hash.



FR2 — Invoicing UX (Finom-style)



Our hosted invoice page + provider payment link; we-send by default; single reminder engine (our AI).



FR3 — Expenses \& BTW (light)



Receipt intake (photo/email) → AI parse → user confirms → push to provider as purchase doc.



VAT widget + Prepare BTW pack deep-link to provider’s filing UI.



FR4 — Referrals \& packaging



In-app tiles for MB/eB/WeFact (+ referral perks where relevant). Tenant can switch providers later.



Out of scope (v2): Direct tax filing from our app; deep purchase-ledger features; multi-currency.



Non-Functional Requirements



Security: No client secrets; webhook signature verify; org isolation; audit logs; idempotent handlers.



Compliance: nl-NL everywhere; Europe/Amsterdam time; GDPR retention jobs; provider = system of record.



Performance: P95 < 200ms API; AI < 2s; PDF fetch < 3s.



Accessibility: AA contrast, focus rings, SR labels; mobile-first ergonomics.



Architecture (High-Level)



InvoiceProvider abstraction with adapters: Moneybird, e-Boekhouden, WeFact, PeppolAP. Dashboard code is provider-agnostic.



Data stored our side: external\_id, status, totals\_cents, payment\_url, timestamps, VIES result, AI metadata. No legal PDFs—fetch on demand.



Send modes: default we-send (professional “from plumber”); optionally provider-sends per tenant.



Reminders: exclusive switch—our AI or provider (never both).



Payments: iDEAL-first (provider/Mollie links).



Locale/TZ: enforced at boundaries (Temporal); nl-NL formatting.



Flows (Happy Paths)



Draft → Send (we-send)

User approves → provider assigns number \& stores PDF/UBL → we render our invoice page with pay link → webhooks/poll update status chips.



Reminders

Our AI cadence (e.g., +3d, +7d, +14d), WhatsApp/email. Provider reminders off.



Expense → BTW

Snap/email receipt → AI parse → push to provider → quarterly widget → Prepare BTW pack (opens provider’s draft filing).



Peppol

If buyer requires e-invoicing, Send via Peppol (AP) using our UBL. Store message IDs.



Pricing \& Packaging (for your plans)



Moneybird / e-Boekhouden: BYO subscription (plumber pays).



WeFact: We pay and rebill inside Premium for a “no setup, invoice-only” experience.



Peppol AP: pass-through per-message cost or include in higher tiers.



Risks \& Mitigations



Token expiry / webhook outages → health checks, retries, alerting, idempotency, circuit breakers.



Totals drift vs provider → provider becomes source of truth after send; lock edits post-issuance.



Peppol edge cases → store AP message IDs \& hashes; fall back to email-PDF where allowed.



Milestones (Phased)



M1 — Moneybird (headless): OAuth, draft/send, PDF/UBL, webhooks, our hosted invoice page, we-send, AI reminders.



M2 — WeFact (bundled engine): hidden, PaymentURL, PDF/UBL, optional Peppol on send.



M3 — e-Boekhouden: keys + polling; PDF; VAT widget hook-up.



M4 — Peppol AP: UBL gen + send; store message IDs.



M5 — Expenses (light): receipt AI → provider; quarterly VAT widget \& deep-link.



Deliverables (D)



UI: Connect tiles; Finom-style invoice editor; Send dialog (we-send); Invoice detail (timeline, Download PDF/UBL, Copy pay link); Reminders panel; Expenses intake; BTW widget.



Back-end: Provider adapters; webhook/polling workers; VIES check; Peppol AP client.



Ops: Monitoring \& alerts; GDPR retention cron; referral surfaces.



Final Validation Checklist (pre-ship)



100% issued invoices have provider PDF \& UBL accessible in our UI.



Moneybird webhooks verified; e-Boekhouden polling ≤ 5 min lag; WeFact PaymentURL captured.



We-send emails/WhatsApps deliver as plumber; provider reminders OFF when ours ON.



VAT widget matches provider figures (±1% tolerance).



nl-NL formats; Europe/Amsterdam time; no client secrets; audit logs present.

(Use the template’s gates \& rollback routine.)



Rollout



Pilot: 3 plumbers (MB, eB, WeFact).



Feature flags: INVOICING\_MB, INVOICING\_EB, INVOICING\_WEFACT, PEPPOL\_AP, EXPENSES\_LIGHT.



Metrics to watch: time-to-paid, overdue %, webhook success, PDF fetch latency.



How Claude implements this (clear playbook)



Claude follows the Ultimate PRP pattern with checkpoints, MCP servers, and validation gates.



1\) Create the provider abstraction + Moneybird first (M1)



Define InvoiceProvider interface; implement Moneybird methods: createDraft, send, getPdf, getUbl, getPaymentLink, onWebhook.



Build “Connect Moneybird” (OAuth), admin picker, token storage.



Ship we-send path: finalize at provider (get number + links), we email/WhatsApp with our branding.



Add AI reminders and disable provider reminders by default.



Checkpoints: commit after each step; run gates from the template.



2\) Add WeFact (M2) as hidden invoice engine



API key + IP allow-list; draft→send; capture PaymentURL; fetch PDF/UBL.



Keep it invisible (no tenant login); all actions happen in our dashboard.



3\) Add e-Boekhouden (M3)



API keys; create/send; PDF; polling job for statuses; surface referral.



4\) Peppol AP (M4)



Generate UBL for each invoice; one Access Point integration; store message IDs \& hashes.



5\) Expenses \& VAT widget (M5)



Receipt camera/email-in; AI parse; confirm; push to provider; “Prepare BTW pack” deep-link.



Engineering rules Claude must honor



nl-NL \& Europe/Amsterdam enforced; no Date.now()—use Temporal; AA contrast; i18n rules.



Security \& ops: webhook signature verification, idempotency, audit logs, Sentry, performance budgets.



No mock data—use skeleton/empty states; validate AI JSON with Zod; provider is source of truth post-send.



Self-validation before each merge



Functional \& perf checks from the template (tests, lint, type, GDPR, Dutch requirements).



E2E happy-path: connect → draft → send (we-send) → pay (iDEAL) → PDF/UBL → reminders → VAT widget.



Roadmap after v2 (your picks)



Customer Portal (self-serve, branded invoice \& pay history, address \& contact updates).



Credit Notes \& Deposits/Progress (Jobber-grade flows, Finom feel).



TL;DR



We ship a Finom-style invoicing \& BTW-prep inside our app.



Moneybird / e-Boekhouden / WeFact (and Peppol) do numbering, PDF/UBL, storage, and filing.



We-send by default so it looks professional—from the plumber.



Claude has a concrete, checkpointed playbook to implement this PRP safely and fast.

