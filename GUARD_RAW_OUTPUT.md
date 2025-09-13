# RAW GUARD OUTPUT (For Deep Debugging)
This file contains the complete unprocessed output from `pnpm guard-safe`.
For structured analysis, see GUARD_RESULTS.md instead.
## Combined Output
```


> plumbing-agent@0.1.0 guard-safe C:\Users\styry\plumbing-agent
> node scripts/guard-safe.mjs


▶ Running guard-safe (sequential, runs all steps)…


━━━ Biome Format ━━━
Formatted 289 files in 138ms. No fixes applied.

━━━ Biome Check ━━━
Checked 289 files in 186ms. No fixes applied.

━━━ ESLint ━━━

C:\Users\styry\plumbing-agent\src\app\jobs\JobEditorDialog.tsx
  564:28  error  Unsafe assignment of an error typed value     @typescript-eslint/no-unsafe-assignment
  564:28  error  Unsafe call of a(n) `error` type typed value  @typescript-eslint/no-unsafe-call
  586:28  error  Unsafe assignment of an error typed value     @typescript-eslint/no-unsafe-assignment
  586:28  error  Unsafe call of a(n) `error` type typed value  @typescript-eslint/no-unsafe-call

C:\Users\styry\plumbing-agent\src\components\launch\DemoStepper.tsx
  708:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  729:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  742:53  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\styry\plumbing-agent\src\components\launch\RoiCalculator.tsx
  157:12  error  Unsafe call of a(n) `error` type typed value  @typescript-eslint/no-unsafe-call

C:\Users\styry\plumbing-agent\src\components\launch\USPGrid.tsx
  86:42  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  92:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 10 problems (10 errors, 0 warnings)


━━━ Pre-TypeCheck ━━━

━━━ TypeScript Check ━━━
src/app/invoices/review/page.tsx(156,14): error TS2345: Argument of type '"review.controls.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.
src/app/invoices/review/page.tsx(157,14): error TS2345: Argument of type '"review.controls.createDrafts"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.
src/app/jobs/[id]/card/page.tsx(19,45): error TS2345: Argument of type '`job_card_mobile.${string}`' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/calendar/Legend.tsx(23,54): error TS2345: Argument of type '"legend.none"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/calendar/Legend.tsx(30,8): error TS2345: Argument of type '"legend.header"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobEditorDialog.tsx(184,24): error TS2345: Argument of type '"create.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobEditorDialog.tsx(190,22): error TS2345: Argument of type '"create.failed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobEditorDialog.tsx(196,24): error TS2345: Argument of type '"update.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobEditorDialog.tsx(202,22): error TS2345: Argument of type '"update.failed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobEditorDialog.tsx(356,22): error TS2345: Argument of type '"job.editJob"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/JobEditorDialog.tsx(356,44): error TS2345: Argument of type '"job.newJob"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/JobEditorDialog.tsx(360,15): error TS2345: Argument of type '"job.editDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/JobEditorDialog.tsx(361,15): error TS2345: Argument of type '"job.createDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/JobEditorDialog.tsx(564,28): error TS2304: Cannot find name 't'.
src/app/jobs/JobEditorDialog.tsx(586,28): error TS2304: Cannot find name 't'.
src/app/jobs/JobsTable.tsx(65,24): error TS2345: Argument of type '"delete.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobsTable.tsx(70,22): error TS2345: Argument of type '"delete.failed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/JobsTable.tsx(174,31): error TS2345: Argument of type '"job.deleteTitle"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/JobsTable.tsx(176,14): error TS2345: Argument of type '"job.deleteDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/page.tsx(106,10): error TS2345: Argument of type '"error.load"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(120,61): error TS2345: Argument of type '"title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(121,52): error TS2345: Argument of type '"description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(136,36): error TS2345: Argument of type '"filter.status.all"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(138,19): error TS2345: Argument of type '"status.planned"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/page.tsx(141,19): error TS2345: Argument of type '"status.in_progress"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/page.tsx(143,43): error TS2345: Argument of type '"status.done"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/page.tsx(145,19): error TS2345: Argument of type '"status.cancelled"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/jobs/page.tsx(177,12): error TS2345: Argument of type '"stats.today.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(187,11): error TS2345: Argument of type '"stats.today.desc"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(196,12): error TS2345: Argument of type '"stats.week.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(206,11): error TS2345: Argument of type '"stats.week.desc"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(215,12): error TS2345: Argument of type '"stats.monthCompleted.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(225,11): error TS2345: Argument of type '"stats.monthCompleted.desc"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(234,12): error TS2345: Argument of type '"stats.emergency.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(244,11): error TS2345: Argument of type '"stats.emergency.desc"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(254,21): error TS2345: Argument of type '"empty.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(255,27): error TS2345: Argument of type '"empty.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(265,12): error TS2345: Argument of type '"empty.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(284,23): error TS2345: Argument of type '"calendar.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/jobs/page.tsx(285,29): error TS2345: Argument of type '"calendar.desc"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/app/providers/wefact/setup/page.tsx(42,21): error TS2345: Argument of type '"providers.setup"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/app/settings/whatsapp/onboard/page.tsx(271,47): error TS2345: Argument of type '"title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/settings/whatsapp/onboard/page.tsx(280,51): error TS2345: Argument of type '"secret"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/settings/whatsapp/onboard/page.tsx(285,55): error TS2345: Argument of type '"missing"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/settings/whatsapp/onboard/page.tsx(296,51): error TS2345: Argument of type '"webhook"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/settings/whatsapp/onboard/page.tsx(303,23): error TS2345: Argument of type '"unreachable"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/settings/whatsapp/page.tsx(57,24): error TS2345: Argument of type '"numbers.add.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(62,25): error TS2345: Argument of type '"numbers.add.error"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(68,24): error TS2345: Argument of type '"numbers.remove.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(72,25): error TS2345: Argument of type '"numbers.remove.error"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(113,21): error TS2345: Argument of type '"numbers.remove.confirm"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(327,20): error TS2345: Argument of type '"numbers.empty.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(329,18): error TS2345: Argument of type '"numbers.empty.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(358,20): error TS2345: Argument of type '"numbers.table.actions"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(369,16): error TS2345: Argument of type '"numbers.add.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(374,18): error TS2345: Argument of type '"numbers.add.phoneNumberId.label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(382,30): error TS2345: Argument of type '"numbers.add.phoneNumberId.placeholder"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(386,18): error TS2345: Argument of type '"numbers.add.phoneNumberId.helper"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(391,18): error TS2345: Argument of type '"numbers.add.label.label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(404,20): error TS2345: Argument of type '"numbers.labels.customer"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(407,20): error TS2345: Argument of type '"numbers.labels.control"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(412,18): error TS2345: Argument of type '"numbers.add.label.helper"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(425,17): error TS2345: Argument of type '"numbers.add.submit"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "misc">'.
src/app/settings/whatsapp/page.tsx(450,17): error TS2345: Argument of type '"test.requirements.items"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "settings.what...'.
src/app/sign-in/[[...sign-in]]/page.tsx(13,58): error TS2345: Argument of type '"app.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/app/sign-in/[[...sign-in]]/page.tsx(14,43): error TS2345: Argument of type '"auth.signInSubtitle"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/app/sign-up/[[...sign-up]]/page.tsx(13,58): error TS2345: Argument of type '"app.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/app/sign-up/[[...sign-up]]/page.tsx(14,43): error TS2345: Argument of type '"auth.signUpSubtitle"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/app/whatsapp/[conversationId]/page.tsx(26,34): error TS2345: Argument of type '""' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/app/whatsapp/page.tsx(132,35): error TS2345: Argument of type '"unnamed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(57,20): error TS2345: Argument of type '"invoice.issuedSuccessfully"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(62,18): error TS2345: Argument of type '"invoice.issueFailed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(86,11): error TS2345: Argument of type '"invoice.issueActions"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(90,12): error TS2345: Argument of type '"invoice.lockedBadge"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(94,26): error TS2345: Argument of type '"invoice.lockedDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(98,10): error TS2345: Argument of type '"invoice.providerPdfNote"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(110,20): error TS2345: Argument of type '"invoice.issueActions"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(111,26): error TS2345: Argument of type '"invoice.needsProvider"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(115,10): error TS2345: Argument of type '"invoice.needsProviderDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(133,11): error TS2345: Argument of type '"invoice.issueActions"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(178,21): error TS2345: Argument of type '"invoice.issueActions"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(180,11): error TS2345: Argument of type '"invoice.issueActionsDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(201,21): error TS2345: Argument of type '"invoice.issuing"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(201,44): error TS2345: Argument of type '"invoice.issueViaMoneybird"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/IssueActions.tsx(204,9): error TS2345: Argument of type '"invoice.issueViaProviderNote"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/PaymentLinks.tsx(41,20): error TS2345: Argument of type '"payment"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/components/invoices/PaymentLinks.tsx(42,21): error TS2345: Argument of type '"notifications"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/components/invoices/PaymentLinks.tsx(43,20): error TS2345: Argument of type '"errors"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/components/invoices/PaymentLinks.tsx(45,20): error TS2345: Argument of type '"invoice"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "actions" | ... 1368 m...'.
src/components/invoices/ProviderConnectCard.tsx(69,19): error TS2345: Argument of type '"actions.configure"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "providers">'.
src/components/invoices/ProviderConnectCard.tsx(77,19): error TS2345: Argument of type '"actions.connect"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "providers">'.
src/components/invoices/ProviderConnectCard.tsx(84,18): error TS2345: Argument of type '"actions.fix"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "providers">'.
src/components/invoices/ProviderConnectCard.tsx(114,40): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "providers">'.
src/components/invoices/ProviderConnectCard.tsx(129,11): error TS2345: Argument of type '"connected.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "providers">'.
src/components/invoices/ReviewList.tsx(68,17): error TS2345: Argument of type '"invoices.review"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch" | ... 1368 mo...'.
src/components/invoices/Timeline.tsx(87,20): error TS2345: Argument of type '"invoice.timeline.heading"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(111,20): error TS2345: Argument of type '"invoice.timeline.heading"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(112,26): error TS2345: Argument of type '"invoice.timeline.loadError"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(116,10): error TS2345: Argument of type '"invoice.timeline.loadErrorDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(127,20): error TS2345: Argument of type '"invoice.timeline.heading"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(128,26): error TS2345: Argument of type '"invoice.timeline.noEvents"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(132,10): error TS2345: Argument of type '"invoice.timeline.noEventsDescription"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(142,19): error TS2345: Argument of type '"invoice.timeline.heading"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(143,25): error TS2345: Argument of type '"invoice.timeline.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/invoices/Timeline.tsx(168,13): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/JobDrawer.tsx(166,24): error TS2345: Argument of type '"delete.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/components/jobs/JobDrawer.tsx(175,52): error TS2345: Argument of type '"delete.failed"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "jobs">'.
src/components/jobs/JobDrawer.tsx(182,20): error TS2345: Argument of type '"jobs.invoice.createDraft.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(187,18): error TS2345: Argument of type '"jobs.invoice.createDraft.error"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(362,16): error TS2345: Argument of type '"jobs.details"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(387,13): error TS2345: Argument of type '"action.edit"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(398,29): error TS2345: Argument of type '"jobs.invoice.createDraft.success"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(411,16): error TS2345: Argument of type '"actions.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(412,16): error TS2345: Argument of type '"jobs.invoice.createDraft.label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(424,13): error TS2345: Argument of type '"action.delete"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(499,17): error TS2345: Argument of type '"priority.normal"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(502,17): error TS2345: Argument of type '"priority.urgent"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(505,17): error TS2345: Argument of type '"priority.emergency"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(549,20): error TS2345: Argument of type '"startTime"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "customers.for...'.
src/components/jobs/JobDrawer.tsx(566,20): error TS2345: Argument of type '"endTime"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "customers.for...'.
src/components/jobs/JobDrawer.tsx(589,19): error TS2345: Argument of type '"customer"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "customers.for...'.
src/components/jobs/JobDrawer.tsx(678,12): error TS2345: Argument of type '"jobs.calendar.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(693,15): error TS2345: Argument of type '"label.durationMinutes"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(783,12): error TS2345: Argument of type '"jobs.assignments.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(869,14): error TS2345: Argument of type '"actions.cancel"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(899,16): error TS2345: Argument of type '"jobs.invoice.createDraft.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(900,16): error TS2345: Argument of type '"jobs.invoice.createDraft.label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/JobDrawer.tsx(932,19): error TS2345: Argument of type '"deleting"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "common">'.
src/components/jobs/JobDrawer.tsx(933,13): error TS2345: Argument of type '"action.delete"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "ui">'.
src/components/jobs/Unscheduled.tsx(174,67): error TS2345: Argument of type '"whatsapp.messages"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(238,35): error TS2345: Argument of type '"cta.newJob"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(248,21): error TS2345: Argument of type '"cta.newJob"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(255,12): error TS2345: Argument of type '"jobs.unscheduled.ai.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(262,41): error TS2345: Argument of type '"tabs.whatsapp"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(276,17): error TS2345: Argument of type '"jobs.unscheduled.ai.empty"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(311,19): error TS2345: Argument of type '"priority.urgent"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(329,19): error TS2345: Argument of type '"jobs.unscheduled.ai.minutes"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(360,16): error TS2345: Argument of type '"jobs.unscheduled.ai.assign"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(373,17): error TS2345: Argument of type '"whatsapp.noMessages"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(387,39): error TS2345: Argument of type '"whatsapp.messages"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(393,16): error TS2345: Argument of type '"whatsapp.lastActivity"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(405,16): error TS2345: Argument of type '"whatsapp.createJob"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(421,13): error TS2345: Argument of type '"form.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(421,31): error TS2345: Argument of type '"form.required"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(434,13): error TS2345: Argument of type '"form.priority"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(447,15): error TS2345: Argument of type '"priority.normal"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(450,15): error TS2345: Argument of type '"priority.urgent"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(453,15): error TS2345: Argument of type '"priority.emergency"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(462,12): error TS2345: Argument of type '"form.description"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(481,13): error TS2345: Argument of type '"form.startTime"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(481,35): error TS2345: Argument of type '"form.required"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(498,13): error TS2345: Argument of type '"form.duration"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(520,12): error TS2345: Argument of type '"form.primaryEmployee"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(520,40): error TS2345: Argument of type '"form.required"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(551,12): error TS2345: Argument of type '"actions.cancel"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(559,14): error TS2345: Argument of type '"actions.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/jobs/Unscheduled.tsx(560,14): error TS2345: Argument of type '"actions.create"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, never>'.
src/components/launch/DemoStepper.tsx(271,43): error TS2345: Argument of type '"job_card.notes"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch.demo.c...'.
src/components/launch/DemoStepper.tsx(383,12): error TS2345: Argument of type '"send_pay.awaiting_payment"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch.demo.c...'.
src/components/launch/DemoStepper.tsx(390,11): error TS2345: Argument of type '"send_pay.click_pay"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch.demo.c...'.
src/components/launch/DemoStepper.tsx(431,11): error TS2345: Argument of type '"reminders.whatsapp_series"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch.demo.c...'.
src/components/launch/DemoStepper.tsx(485,32): error TS2345: Argument of type '"launch.demo_stepper"' is not assignable to parameter of type 'NamespaceKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch" | ... 1368 mo...'.
src/components/launch/DemoStepper.tsx(809,38): error TS2345: Argument of type '{ step: number; }' is not assignable to parameter of type 'undefined'.
src/components/launch/Hero.tsx(25,10): error TS2345: Argument of type '"hero.cta_demo"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(34,10): error TS2345: Argument of type '"hero.cta_waitlist"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(56,14): error TS2345: Argument of type '"hero.urgency"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(60,14): error TS2345: Argument of type '"hero.h1"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(63,14): error TS2345: Argument of type '"hero.subhead"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(80,15): error TS2345: Argument of type '"hero.social_proof"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(88,21): error TS2345: Argument of type '"trust.avg_compliant"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(92,21): error TS2345: Argument of type '"trust.ideal_certified"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(96,21): error TS2345: Argument of type '"trust.kvk_registered"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(109,16): error TS2345: Argument of type '"hero.cta_demo"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/Hero.tsx(120,16): error TS2345: Argument of type '"hero.cta_waitlist"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(95,16): error TS2345: Argument of type '"roi_calculator.title"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(98,16): error TS2345: Argument of type '"roi_calculator.subtitle"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(108,18): error TS2345: Argument of type '"roi_calculator.input_label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(111,18): error TS2345: Argument of type '"roi_calculator.rate_per_hour"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(117,19): error TS2345: Argument of type '"roi_calculator.input_label"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(142,18): error TS2345: Argument of type '"roi_calculator.calculate_button"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(154,20): error TS2345: Argument of type '"roi_calculator.admin_reduced"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(157,12): error TS2304: Cannot find name 'tROI'.
src/components/launch/RoiCalculator.tsx(166,21): error TS2345: Argument of type '"roi_calculator.time_saved"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(170,21): error TS2345: Argument of type '"roi_calculator.hours_per_week"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(177,21): error TS2345: Argument of type '"roi_calculator.extra_revenue"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(187,21): error TS2345: Argument of type '"roi_calculator.yearly_savings"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(197,21): error TS2345: Argument of type '"roi_calculator.results.total_value"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(210,22): error TS2345: Argument of type '"roi_calculator.cta_start_saving"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.
src/components/launch/RoiCalculator.tsx(218,22): error TS2345: Argument of type '"roi_calculator.placeholder_text"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "launch">'.

━━━ Check Imports ━━━
✓ Imports OK (~/ only, no @/ or parent-relative in app/).

━━━ Check Routes ━━━
✓ Routes OK (no root/(dashboard) shadow).

━━━ Check Encoding ━━━
✓ Encoding OK (UTF-8 no BOM).

━━━ Check Placeholders ━━━
[36mℹ[0m [1mPlumbing Agent[0m: Scanning for banned placeholders and patterns...

[32m✓[0m No banned placeholders or patterns found!
[36mℹ[0m Codebase appears clean of temporary/placeholder data.

━━━ i18n Prune ━━━
[i18n-prune] Done. Missing filled: 0, Pruned extras: 0

━━━ i18n Scan ━━━
🔍 Scanning codebase for i18n usage patterns...

📚 Loaded 1089 translation keys
📁 Scanning 246 files...

📊 SCAN RESULTS
================
Found 520 translation usage patterns
Found 412 issues

❌ ERRORS:
   src\app\sign-in\[[...sign-in]]\page.tsx:8 - useTranslations() called without namespace - use specific namespace
   src\app\sign-up\[[...sign-up]]\page.tsx:8 - useTranslations() called without namespace - use specific namespace
   src\app\whatsapp\page.tsx:28 - useTranslations() called without namespace - use specific namespace
   src\components\invoices\IssueActions.tsx:38 - useTranslations() called without namespace - use specific namespace
   src\components\invoices\Timeline.tsx:36 - useTranslations() called without namespace - use specific namespace
   src\components\jobs\Unscheduled.tsx:85 - useTranslations() called without namespace - use specific namespace
   src\app\customers\page.tsx:105 - Translation key "title" not found in any namespace
   src\app\customers\page.tsx:106 - Translation key "description" not found in any namespace
   src\app\customers\page.tsx:115 - Translation key "addNew" not found in any namespace
   src\app\customers\page.tsx:200 - Translation key "title" not found in any namespace
   src\app\customers\page.tsx:210 - Translation key "title" not found in any namespace
   src\app\customers\page.tsx:211 - Translation key "description" not found in any namespace
   src\app\en\launch\demo\page.tsx:33 - Translation key "back" not found in any namespace
   src\app\en\launch\demo\page.tsx:36 - Translation key "title" not found in any namespace
   src\app\en\launch\demo\page.tsx:50 - Translation key "headline" not found in any namespace
   src\app\en\launch\demo\page.tsx:53 - Translation key "subtitle" not found in any namespace
   src\app\invoices\approvals\page.tsx:190 - Translation key "selectAll" not found in any namespace
   src\app\invoices\approvals\page.tsx:192 - Translation key "selectAll" not found in any namespace
   src\app\invoices\approvals\page.tsx:195 - Translation key "selected" not found in any namespace
   src\app\jobs\page.tsx:120 - Translation key "title" not found in any namespace
   src\app\jobs\page.tsx:121 - Translation key "description" not found in any namespace
   src\app\nl\launch\demo\page.tsx:33 - Translation key "back" not found in any namespace
   src\app\nl\launch\demo\page.tsx:36 - Translation key "title" not found in any namespace
   src\app\nl\launch\demo\page.tsx:50 - Translation key "headline" not found in any namespace
   src\app\nl\launch\demo\page.tsx:53 - Translation key "subtitle" not found in any namespace
   src\app\settings\providers\page.tsx:113 - Translation key "comingSoon" not found in any namespace
   src\app\settings\providers\page.tsx:128 - Translation key "comingSoon" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:160 - Translation key "back" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:164 - Translation key "title" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:165 - Translation key "description" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:315 - Translation key "next" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:375 - Translation key "back" not found in any namespace
   src\app\settings\whatsapp\onboard\page.tsx:477 - Translation key "back" not found in any namespace
   src\app\settings\whatsapp\page.tsx:158 - Translation key "title" not found in any namespace
   src\app\settings\whatsapp\page.tsx:159 - Translation key "subtitle" not found in any namespace
   src\components\invoices\ProvidersPanel.tsx:38 - Translation key "title" not found in any namespace
   src\components\invoices\ProvidersPanel.tsx:39 - Translation key "description" not found in any namespace
   src\components\invoices\ProvidersPanel.tsx:52 - Translation key "note" not found in any namespace
   src\components\invoices\ReviewList.tsx:77 - Translation key "selectAll" not found in any namespace
   src\components\invoices\ReviewList.tsx:79 - Translation key "selectAll" not found in any namespace
   src\components\invoices\ReviewList.tsx:83 - Translation key "selected" not found in any namespace
   src\components\invoices\ReviewList.tsx:92 - Translation key "select" not found in any namespace
   src\components\invoices\ReviewList.tsx:94 - Translation key "customer" not found in any namespace
   src\components\invoices\ReviewList.tsx:95 - Translation key "job" not found in any namespace
   src\components\invoices\ReviewList.tsx:96 - Translation key "total" not found in any namespace
   src\components\invoices\ReviewList.tsx:97 - Translation key "provider" not found in any namespace
   src\components\invoices\ReviewList.tsx:98 - Translation key "created" not found in any namespace
   src\components\invoices\ReviewList.tsx:105 - Translation key "noInvoices" not found in any namespace
   src\components\invoices\ReviewList.tsx:117 - Translation key "select" not found in any namespace
   src\components\invoices\ReviewList.tsx:135 - Translation key "noJob" not found in any namespace
   src\components\invoices\ReviewList.tsx:148 - Translation key "noProvider" not found in any namespace
   src\components\launch\WaitlistForm.tsx:75 - Translation key "title" not found in any namespace
   src\components\launch\WaitlistForm.tsx:78 - Translation key "subtitle" not found in any namespace
   src\components\launch\WaitlistForm.tsx:84 - Translation key "email" not found in any namespace
   src\components\launch\WaitlistForm.tsx:102 - Translation key "phone" not found in any namespace
   src\components\launch\WaitlistForm.tsx:119 - Translation key "org" not found in any namespace
   src\components\launch\WaitlistForm.tsx:139 - Translation key "success" not found in any namespace
   src\components\launch\WaitlistForm.tsx:148 - Translation key "error" not found in any namespace
   src\components\launch\WaitlistForm.tsx:159 - Translation key "submit" not found in any namespace
   src\components\launch\WaitlistForm.tsx:162 - Translation key "gdpr" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:59 - Translation key "connect" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:71 - Translation key "reconnect" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:74 - Translation key "reconnectHelper" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:88 - Translation key "openDashboard" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:92 - Translation key "disconnect" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:109 - Translation key "title" not found in any namespace
   src\components\providers\MoneybirdTile.tsx:112 - Translation key "description" not found in any namespace
   src\components\ui\customer-picker.tsx:143 - Translation key "selectCustomer" not found in any namespace
   src\components\ui\customer-picker.tsx:161 - Translation key "selectCustomer" not found in any namespace
   src\components\ui\customer-picker.tsx:172 - Translation key "searchPlaceholder" not found in any namespace
   src\components\ui\customer-picker.tsx:271 - Translation key "noCustomersFound" not found in any namespace
   src\components\ui\customer-picker.tsx:282 - Translation key "addNew" not found in any namespace
   src\components\ui\customer-picker.tsx:288 - Translation key "recent" not found in any namespace
   src\components\ui\customer-picker.tsx:324 - Translation key "allOthers" not found in any namespace

⚠️  WARNINGS:
   src\app\jobs\[id]\card\page.tsx:19 - Dynamic key pattern detected: job_card_mobile.${key}
   src\app\customers\page.tsx:92 - Key "error.load" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:125 - Key "stats.total" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:133 - Key "stats.total" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:142 - Key "stats.thisMonth" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:152 - Key "stats.thisMonth" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:161 - Key "stats.active" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:171 - Key "stats.active" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:180 - Key "stats.archived" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:190 - Key "stats.archived" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:203 - Key "archived.tab" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:238 - Key "archived.title" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:239 - Key "archived.description" appears to contain namespace - consider splitting into namespace + key
   src\app\customers\page.tsx:246 - Key "error.load" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:39 - Key "cta.button" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:64 - Key "cta.headline" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:66 - Key "cta.subtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:72 - Key "cta.button" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:84 - Key "benefits.faster.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:87 - Key "benefits.faster.description" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:95 - Key "benefits.smarter.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:98 - Key "benefits.smarter.description" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:106 - Key "benefits.better_paid.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\demo\page.tsx:109 - Key "benefits.better_paid.description" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:17 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:18 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:19 - Key "meta.keywords" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:29 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:30 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:38 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\en\launch\page.tsx:39 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:107 - Key "approvals.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:109 - Key "approvals.subtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:117 - Key "approvals.dateFilter.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:120 - Key "approvals.dateFilter.description" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:126 - Key "approvals.dateFilter.label" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:146 - Key "approvals.actions.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:150 - Key "approvals.actions.selectedCount" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:153 - Key "approvals.actions.description" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:164 - Key "approvals.actions.sending" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:165 - Key "approvals.actions.sendSelected" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:175 - Key "approvals.list.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:178 - Key "approvals.list.loading" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:179 - Key "approvals.list.count" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:205 - Key "approvals.select" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:207 - Key "approvals.number" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:208 - Key "approvals.customer" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:210 - Key "approvals.total" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:213 - Key "approvals.created" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:223 - Key "approvals.list.loading" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:224 - Key "approvals.empty" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:237 - Key "approvals.select" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:270 - Key "approvals.results.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:277 - Key "approvals.results.total" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:285 - Key "approvals.results.sent" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:293 - Key "approvals.results.skipped" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:301 - Key "approvals.results.withPaymentLinks" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\approvals\page.tsx:311 - Key "approvals.results.errors" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:114 - Key "invoices.review.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:116 - Key "invoices.review.subtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:125 - Key "invoices.review.controls.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:128 - Key "invoices.review.controls.description" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:135 - Key "invoices.review.controls.sinceDate" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:156 - Key "review.controls.creating" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:157 - Key "review.controls.createDrafts" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:169 - Key "invoices.review.bulkActions.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:176 - Key "invoices.review.bulkActions.description" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:188 - Key "invoices.review.bulkActions.alsoWhatsApp" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:199 - Key "invoices.review.bulkActions.sending" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:210 - Key "invoices.review.list.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:213 - Key "invoices.review.list.loading" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:232 - Key "invoices.review.results.title" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:239 - Key "invoices.review.results.total" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:247 - Key "invoices.review.results.sent" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:255 - Key "invoices.review.results.skipped" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:263 - Key "invoices.review.results.withPaymentLinks" appears to contain namespace - consider splitting into namespace + key
   src\app\invoices\review\page.tsx:273 - Key "invoices.review.results.errors" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:100 - Key "jobCard.title" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:102 - Key "jobCard.jobNumber" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:108 - Key "jobCard.phone" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:123 - Key "jobCard.jobStatus" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:125 - Key "jobCard.active" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:141 - Key "jobCard.lastResponse" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:143 - Key "jobCard.approved" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:165 - Key "jobCard.urgency" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:189 - Key "jobCard.schedule" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:196 - Key "jobCard.draftInvoice" appears to contain namespace - consider splitting into namespace + key
   src\app\j\[token]\page.tsx:203 - Key "jobCard.tokenExpires" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\calendar\Legend.tsx:23 - Key "legend.none" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\calendar\Legend.tsx:30 - Key "legend.header" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:106 - Key "error.load" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:136 - Key "filter.status.all" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:177 - Key "stats.today.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:187 - Key "stats.today.desc" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:196 - Key "stats.week.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:206 - Key "stats.week.desc" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:215 - Key "stats.monthCompleted.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:225 - Key "stats.monthCompleted.desc" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:234 - Key "stats.emergency.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:244 - Key "stats.emergency.desc" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:254 - Key "empty.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:255 - Key "empty.description" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:265 - Key "empty.description" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:284 - Key "calendar.title" appears to contain namespace - consider splitting into namespace + key
   src\app\jobs\page.tsx:285 - Key "calendar.desc" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:39 - Key "cta.button" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:64 - Key "cta.headline" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:66 - Key "cta.subtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:72 - Key "cta.button" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:84 - Key "benefits.faster.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:87 - Key "benefits.faster.description" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:95 - Key "benefits.smarter.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:98 - Key "benefits.smarter.description" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:106 - Key "benefits.better_paid.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\demo\page.tsx:109 - Key "benefits.better_paid.description" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:17 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:18 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:19 - Key "meta.keywords" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:29 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:30 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:38 - Key "meta.title" appears to contain namespace - consider splitting into namespace + key
   src\app\nl\launch\page.tsx:39 - Key "meta.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:76 - Key "panel.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:78 - Key "panel.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:84 - Key "panel.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:85 - Key "panel.note" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:105 - Key "wefact.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:107 - Key "states.needs_action" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:110 - Key "wefact.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:120 - Key "eboekhouden.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:122 - Key "states.needs_action" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\providers\page.tsx:125 - Key "eboekhouden.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:56 - Key "numbers.success" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:61 - Key "numbers.error" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:67 - Key "test.success" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:71 - Key "test.error" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:120 - Key "numbers.validation" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:132 - Key "test.validation" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:144 - Key "steps.prereqs.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:145 - Key "steps.numbers.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:146 - Key "steps.test.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:147 - Key "steps.done.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:200 - Key "prereqs.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:202 - Key "prereqs.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:209 - Key "prereqs.webhookUrl" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:233 - Key "prereqs.webhookHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:239 - Key "prereqs.verifyToken" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:263 - Key "prereqs.tokenHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:328 - Key "numbers.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:330 - Key "numbers.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:335 - Key "numbers.businessLabel" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:346 - Key "numbers.businessHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:351 - Key "numbers.controlLabel" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:362 - Key "numbers.controlHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:390 - Key "numbers.save" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:403 - Key "test.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:405 - Key "test.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:410 - Key "test.phoneLabel" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:421 - Key "test.phoneHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:426 - Key "test.messageLabel" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:433 - Key "test.messagePlaceholder" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:437 - Key "test.messageHelp" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:446 - Key "test.configured" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:489 - Key "test.send" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:501 - Key "done.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:503 - Key "done.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:509 - Key "done.success" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:512 - Key "done.successDescription" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:520 - Key "done.healthSummary" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:526 - Key "done.environment" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:532 - Key "done.webhook" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:538 - Key "done.security" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\onboard\page.tsx:549 - Key "done.goToSettings" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:78 - Key "test.success.message" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:95 - Key "prereqs.webhookUrls.copied" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:189 - Key "wizard.step" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:199 - Key "prereqs.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:201 - Key "prereqs.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:207 - Key "prereqs.webhookUrls.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:210 - Key "prereqs.webhookUrls.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:216 - Key "prereqs.webhookUrls.customer" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:239 - Key "prereqs.webhookUrls.control" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:265 - Key "prereqs.credentials.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:268 - Key "prereqs.credentials.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:274 - Key "prereqs.credentials.verifyToken" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:282 - Key "prereqs.credentials.configured" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:283 - Key "prereqs.credentials.missing" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:289 - Key "prereqs.credentials.hmacSecret" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:297 - Key "prereqs.credentials.configured" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:298 - Key "prereqs.credentials.missing" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:303 - Key "prereqs.credentials.note" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:439 - Key "test.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:441 - Key "test.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:447 - Key "test.requirements.title" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:477 - Key "test.button" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:493 - Key "wizard.previous" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:499 - Key "completion.description" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:508 - Key "wizard.finish" appears to contain namespace - consider splitting into namespace + key
   src\app\settings\whatsapp\page.tsx:508 - Key "wizard.next" appears to contain namespace - consider splitting into namespace + key
   src\app\sign-in\[[...sign-in]]\page.tsx:13 - Key "app.title" appears to contain namespace - consider splitting into namespace + key
   src\app\sign-in\[[...sign-in]]\page.tsx:14 - Key "auth.signInSubtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\sign-up\[[...sign-up]]\page.tsx:13 - Key "app.title" appears to contain namespace - consider splitting into namespace + key
   src\app\sign-up\[[...sign-up]]\page.tsx:14 - Key "auth.signUpSubtitle" appears to contain namespace - consider splitting into namespace + key
   src\app\whatsapp\[conversationId]\page.tsx:237 - Key "session.expiresIn" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\InvoiceStatusCell.tsx:49 - Key "actions.pay" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:57 - Key "invoice.issuedSuccessfully" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:62 - Key "invoice.issueFailed" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:86 - Key "invoice.issueActions" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:90 - Key "invoice.lockedBadge" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:94 - Key "invoice.lockedDescription" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:98 - Key "invoice.providerPdfNote" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:110 - Key "invoice.issueActions" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:111 - Key "invoice.needsProvider" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:115 - Key "invoice.needsProviderDescription" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:133 - Key "invoice.issueActions" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:178 - Key "invoice.issueActions" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:180 - Key "invoice.issueActionsDescription" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:201 - Key "invoice.issuing" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:201 - Key "invoice.issueViaMoneybird" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\IssueActions.tsx:204 - Key "invoice.issueViaProviderNote" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderBadge.tsx:69 - Key "badges.legacy" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderBadge.tsx:75 - Key "status.draft" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderBadge.tsx:103 - Key "badges.locked_tooltip" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderConnectCard.tsx:37 - Key "moneybird.description" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderConnectCard.tsx:42 - Key "wefact.description" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderConnectCard.tsx:47 - Key "eboekhouden.description" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderConnectCard.tsx:52 - Key "peppol.description" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\ProviderConnectCard.tsx:129 - Key "connected.description" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:87 - Key "invoice.timeline.heading" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:111 - Key "invoice.timeline.heading" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:112 - Key "invoice.timeline.loadError" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:116 - Key "invoice.timeline.loadErrorDescription" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:127 - Key "invoice.timeline.heading" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:128 - Key "invoice.timeline.noEvents" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:132 - Key "invoice.timeline.noEventsDescription" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:142 - Key "invoice.timeline.heading" appears to contain namespace - consider splitting into namespace + key
   src\components\invoices\Timeline.tsx:143 - Key "invoice.timeline.description" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:362 - Key "jobs.details" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:387 - Key "action.edit" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:411 - Key "actions.creating" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:424 - Key "action.delete" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:445 - Key "form.title" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:465 - Key "field.description" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:486 - Key "field.priority" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:499 - Key "priority.normal" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:502 - Key "priority.urgent" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:505 - Key "priority.emergency" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:516 - Key "field.status" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:619 - Key "field.status" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:620 - Key "form.requiredSymbol" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:664 - Key "field.description" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:678 - Key "jobs.calendar.title" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:685 - Key "field.start" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:693 - Key "label.durationMinutes" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:710 - Key "field.customer" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:783 - Key "jobs.assignments.title" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:793 - Key "field.primaryEmployee" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:820 - Key "field.secondaryEmployees" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:829 - Key "field.primaryEmployee" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:838 - Key "field.secondaryEmployees" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:869 - Key "actions.cancel" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\JobDrawer.tsx:933 - Key "action.delete" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:174 - Key "whatsapp.messages" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:238 - Key "cta.newJob" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:248 - Key "cta.newJob" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:255 - Key "jobs.unscheduled.ai.title" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:262 - Key "tabs.whatsapp" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:276 - Key "jobs.unscheduled.ai.empty" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:311 - Key "priority.urgent" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:329 - Key "jobs.unscheduled.ai.minutes" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:360 - Key "jobs.unscheduled.ai.assign" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:373 - Key "whatsapp.noMessages" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:387 - Key "whatsapp.messages" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:393 - Key "whatsapp.lastActivity" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:405 - Key "whatsapp.createJob" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:421 - Key "form.title" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:421 - Key "form.required" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:434 - Key "form.priority" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:447 - Key "priority.normal" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:450 - Key "priority.urgent" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:453 - Key "priority.emergency" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:462 - Key "form.description" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:481 - Key "form.startTime" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:481 - Key "form.required" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:498 - Key "form.duration" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:520 - Key "form.primaryEmployee" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:520 - Key "form.required" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:551 - Key "actions.cancel" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:559 - Key "actions.creating" appears to contain namespace - consider splitting into namespace + key
   src\components\jobs\Unscheduled.tsx:560 - Key "actions.create" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:137 - Key "ai_suggestion.diagnosis" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:143 - Key "ai_suggestion.reliable" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:151 - Key "ai_suggestion.urgency" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:154 - Key "ai_suggestion.emergency" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:160 - Key "ai_suggestion.estimated_time" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:163 - Key "ai_suggestion.minutes" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:170 - Key "ai_suggestion.required_materials" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:176 - Key "ai_suggestion.quantity_format" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:200 - Key "schedule.assigned_to" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:213 - Key "schedule.start_time" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:217 - Key "schedule.end_time" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:225 - Key "schedule.auto_assigned" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:248 - Key "job_card.address" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:252 - Key "job_card.phone" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:271 - Key "job_card.notes" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:286 - Key "voice_draft.voice_transcript" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:295 - Key "voice_draft.invoice_lines" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:306 - Key "voice_draft.line_format" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:321 - Key "voice_draft.subtotal_ex_vat" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:327 - Key "voice_draft.vat_total" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:333 - Key "voice_draft.total" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:355 - Key "send_pay.invoice_sent" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:365 - Key "send_pay.invoice_id" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:380 - Key "send_pay.payment_status" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:383 - Key "send_pay.awaiting_payment" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:390 - Key "send_pay.click_pay" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:399 - Key "send_pay.pdf" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:405 - Key "send_pay.whatsapp_message" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:428 - Key "reminders.title" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:431 - Key "reminders.whatsapp_series" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:447 - Key "reminders.after_days" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:459 - Key "reminders.scheduled" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:467 - Key "reminders.automation_active" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:468 - Key "reminders.opt_out_respected" appears to contain namespace - consider splitting into namespace + key
   src\components\launch\DemoStepper.tsx:469 - Key "reminders.email_escalation" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:86 - Key "success.created" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:90 - Key "error.create" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:119 - Key "errors.name.required" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:184 - Key "create.title" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:197 - Key "form.name.label" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:201 - Key "form.name.placeholder" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:214 - Key "form.phone.label" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:218 - Key "form.phone.placeholder" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:231 - Key "form.email.label" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:235 - Key "form.email.placeholder" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:255 - Key "actions.creating" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:256 - Key "actions.create" appears to contain namespace - consider splitting into namespace + key
   src\components\ui\customer-picker.tsx:263 - Key "actions.cancel" appears to contain namespace - consider splitting into namespace + key

📈 NAMESPACE USAGE:
   invoices: 9 usages
   customers: 8 usages
   common: 8 usages
   actions: 7 usages
   misc: 6 usages
   launch: 6 usages
   jobs: 5 usages
   whatsapp: 5 usages
   providers: 4 usages
   ui: 3 usages
   customers.form: 3 usages
   launch.demo.page: 3 usages
   ui.table: 2 usages
   ui.form: 2 usages
   system: 1 usages
   auth: 1 usages
   customers.table: 1 usages
   providers.setup: 1 usages
   settings.whatsapp.onboard: 1 usages
   settings.whatsapp.health: 1 usages
   settings.whatsapp: 1 usages
   launch.cookie_consent: 1 usages
   payment: 1 usages
   notifications: 1 usages
   errors: 1 usages
   invoice: 1 usages
   providers.panel: 1 usages
   invoices.review: 1 usages
   launch.demo.content: 1 usages
   launch.demo_stepper: 1 usages
   launch.demo.content.common: 1 usages
   launch.trust: 1 usages
   launch.waitlist: 1 usages
   providers.moneybird: 1 usages
   invoices.form: 1 usages
   invoices.import: 1 usages
   invoices.import.jobDetails: 1 usages
   invoices.import.estimate: 1 usages

💥 Scan completed with 74 errors

━━━ i18n Check ━━━
[1m[36m🔍 i18n Comprehensive Validation[0m
===============================

📂 Loading translation files...
🚫 Checking for _orphans in runtime JSON...
   [32m✅ No _orphans in runtime JSON[0m
   Dutch: 1089 keys
   English: 1089 keys

🔄 Validating key parity...
   [32m✅ All keys synchronized[0m

📝 Validating ICU message formats...
   [31m❌ Potentially invalid ICU syntax in key "misc.numbers.labels.select": "{Control number}"[0m

🔍 Validating key usage...
   [31m❌ Missing translation keys (used but not defined): misc.numbers.add.success, misc.numbers.add.error, misc.numbers.remove.success, misc.numbers.remove.error, misc.numbers.remove.confirm, misc.numbers.empty.title, misc.numbers.empty.description, misc.numbers.table.actions, misc.numbers.add.title, misc.numbers.add.phoneNumberId.label, misc.numbers.add.phoneNumberId.placeholder, misc.numbers.add.phoneNumberId.helper, misc.numbers.add.label.label, misc.numbers.labels.customer, misc.numbers.labels.control, misc.numbers.add.label.helper, misc.numbers.add.submit, jobs.delete.success, jobs.delete.failed, customers.form.startTime, customers.form.endTime, customers.form.customer, common.deleting, launch.demo.content.job_card.notes, launch.demo.content.send_pay.awaiting_payment, launch.demo.content.send_pay.click_pay, launch.demo.content.reminders.whatsapp_series, launch.demo_stepper.autoplay_pause, launch.demo_stepper.autoplay_start, launch.demo_stepper.keyboard_help, launch.demo_stepper.time_estimate, launch.demo_stepper.time_average, launch.demo_stepper.done, launch.hero.cta_demo, launch.hero.cta_waitlist, launch.hero.urgency, launch.hero.h1, launch.hero.subhead, launch.hero.social_proof, launch.trust.avg_compliant, launch.trust.ideal_certified, launch.trust.kvk_registered, launch.roi_calculator.title, launch.roi_calculator.subtitle, launch.roi_calculator.input_label, launch.roi_calculator.rate_per_hour, launch.roi_calculator.calculate_button, launch.roi_calculator.time_saved, launch.roi_calculator.hours_per_week, launch.roi_calculator.extra_revenue, launch.roi_calculator.yearly_savings, launch.roi_calculator.cta_start_saving, launch.roi_calculator.placeholder_text, invoices.createError, invoices.form.customer.required, invoices.form.lineItems.required, invoices.draft.title, invoices.form.customer.title, invoices.form.customer.label, invoices.form.customer.placeholder, invoices.importFromJob, invoices.form.paymentTerms.title, invoices.form.paymentTerms.label, invoices.form.lineItems.title, invoices.form.lineItems.add, invoices.form.lineItems.empty, invoices.form.lineItems.description, invoices.form.lineItems.quantity, invoices.form.lineItems.unitPrice, invoices.form.lineItems.vatRate, invoices.form.lineItems.lineTotal, invoices.form.discount.title, invoices.form.discount.percentage, invoices.form.totals.title, invoices.form.totals.subtotal, invoices.form.totals.discount, invoices.form.totals.subtotalAfterDiscount, invoices.form.totals.vat, invoices.form.totals.total, invoices.form.notes.title, invoices.form.notes.public, invoices.form.notes.publicPlaceholder, invoices.form.notes.internal, invoices.form.notes.internalPlaceholder, invoices.actions.cancel, invoices.actions.saveDraft, invoices.sendError, invoices.errors.loadFailed, invoices.draft.fastMode.title, invoices.draft.fastMode.badge, invoices.draft.fastMode.description, invoices.draft.switchToSafe, invoices.voiceMode.toggle, invoices.voiceMode.active, invoices.voiceMode.reviewing, invoices.voiceMode.confirmPrompt, invoices.voiceMode.approve, invoices.voiceMode.requestChanges, invoices.voiceMode.changesRequested, invoices.voiceMode.changesNotes, invoices.voiceMode.changesPlaceholder, invoices.voiceMode.submitChanges, invoices.voiceMode.approved, invoices.actions.send, invoices.summary.title, invoices.summary.lineItems, invoices.summary.totalAmount, invoices.summary.paymentTerms, invoices.lineItems.summary, invoices.totals.breakdown, invoices.totals.subtotal, invoices.totals.vat, invoices.totals.total, invoices.notes.title, invoices.actions.markReviewed, invoices.draft.fastMode.warning, invoices.draft.safeMode.title, invoices.draft.safeMode.badge, invoices.status.draftUnsent, invoices.autosave.saving, invoices.autosave.saved, invoices.autosave.error, invoices.draft.safeMode.description, invoices.draft.switchToFast, invoices.voiceMode.safeActive, invoices.voiceMode.safeInstructions, invoices.lineItems.title, invoices.lineItems.description, invoices.lineItems.type, invoices.lineItems.quantity, invoices.lineItems.unitPrice, invoices.lineItems.vatRate, invoices.totals.includingVat, invoices.lineItems.addNew, invoices.draft.safeMode.addLineHint, invoices.compliance.title, invoices.compliance.kvkNumber, invoices.compliance.verified, invoices.compliance.btwId, invoices.compliance.customerAddress, invoices.compliance.complete, invoices.compliance.incomplete, invoices.compliance.dutchVat, invoices.compliance.applied, invoices.draft.safeMode.info, invoices.import.title, invoices.import.description, invoices.import.selectJob, invoices.import.selectJobPlaceholder, invoices.import.jobDetails.date, invoices.import.jobDetails.duration, invoices.import.jobDetails.employee, invoices.import.jobDetails.description, invoices.import.laborConfig, invoices.import.laborHours, invoices.import.hourlyRate, invoices.import.estimate.title, invoices.import.import[0m
   [33m⚠️  Orphaned translation keys (defined but not used): actions.actions.create, actions.actions.creating, actions.actions.openActions, actions.actions.pay, actions.actions.saving, actions.actions.update, actions.back, actions.configure, actions.connect, actions.cta.applySuggestion, actions.cta.button, actions.cta.createInvoice, actions.cta.finalizeVoiceInvoice, actions.cta.headline, actions.cta.newJob, actions.cta.subtitle, actions.fix, actions.sending, auth.auth.context.description, auth.auth.context.title, auth.auth.noOrganization, auth.auth.noRole, auth.auth.notSignedIn, auth.auth.orgId, auth.auth.role, auth.auth.signInSubtitle, auth.auth.signUpSubtitle, auth.auth.tip, auth.auth.userId, common.alternative_payment, common.due_date, common.email, common.error, common.no, common.priority.emergency, common.priority.normal, common.priority.urgent, common.status.cancelled, common.status.done, common.status.draft, common.status.in_progress, common.status.planned, common.step_data_unavailable, common.unnamed, common.yes, customers.actions.cancel, customers.actions.create, customers.actions.creating, customers.allOthers, customers.archived.description, customers.archived.tab, customers.archived.title, customers.delete.archive.archiveInstead, customers.description, customers.error.create, customers.error.load, customers.errors.address.required, customers.errors.email.invalid, customers.errors.emailAlreadyExists, customers.errors.houseNumber.required, customers.errors.name.required, customers.errors.notFoundOrNoPermission, customers.errors.phone.invalid, customers.errors.phone.required, customers.errors.postalCode.invalid, customers.errors.serverError, customers.form.requiredSymbol, customers.form.validation.addressTooLong, customers.form.validation.emailInvalid, customers.form.validation.emailTooLong, customers.form.validation.nameRequired, customers.form.validation.nameTooLong, customers.form.validation.phoneRequired, customers.form.validation.phoneTooLong, customers.form.validation.postalCodeInvalid, customers.form.validation.postalCodeRequired, customers.form.validation.postalCodeTooLong, customers.recent, customers.selectCustomer, customers.stats.active, customers.stats.archived, customers.stats.thisMonth, customers.stats.total, customers.success.created, customers.title, customers.unarchive.action, customers.unarchive.error, customers.unarchive.success, employees.employees.filter.all, employees.employees.filter.clearAll, invoices.invoice.actions.sendWhatsApp, invoices.invoice.actions.sendWhatsAppDescription, invoices.invoice.actions.updateCustomerAddress, invoices.invoice.alreadyIssued, invoices.invoice.alreadyIssuedDescription, invoices.invoice.amounts, invoices.invoice.approvals, invoices.invoice.average, invoices.invoice.backToInvoices, invoices.invoice.confirmed, invoices.invoice.connectMoneybird, invoices.invoice.connectProvider, invoices.invoice.connectProviderDesc, invoices.invoice.create.addressError, invoices.invoice.create.description, invoices.invoice.create.error, invoices.invoice.create.title, invoices.invoice.createFromJob, invoices.invoice.customer, invoices.invoice.details, invoices.invoice.detailsDescription, invoices.invoice.draft, invoices.invoice.draftLabel, invoices.invoice.drafts, invoices.invoice.draftsReady, invoices.invoice.edit.description, invoices.invoice.edit.error, invoices.invoice.edit.title, invoices.invoice.empty.description, invoices.invoice.empty.getStarted, invoices.invoice.empty.title, invoices.invoice.errors.addressGuidance, invoices.invoice.errors.addressRequired, invoices.invoice.errors.invalidId, invoices.invoice.errors.notFound, invoices.invoice.issueActions, invoices.invoice.issueActionsDescription, invoices.invoice.issueFailed, invoices.invoice.issueViaMoneybird, invoices.invoice.issueViaProviderNote, invoices.invoice.issued, invoices.invoice.issuedOn, invoices.invoice.issuedSuccessfully, invoices.invoice.issuing, invoices.invoice.job, invoices.invoice.lockedBadge, invoices.invoice.lockedDescription, invoices.invoice.manage, invoices.invoice.managePending, invoices.invoice.modes.fast, invoices.invoice.modes.safe, invoices.invoice.moreProvidersComingSoon, invoices.invoice.needsProvider, invoices.invoice.needsProviderDescription, invoices.invoice.noDrafts, invoices.invoice.noOverdue, invoices.invoice.noPendingDrafts, invoices.invoice.noSentInvoices, invoices.invoice.notFound, invoices.invoice.notFoundDescription, invoices.invoice.notes, invoices.invoice.overdue, invoices.invoice.overview, invoices.invoice.paid, invoices.invoice.payOnline, invoices.invoice.perInvoiceYear, invoices.invoice.provider, invoices.invoice.providerPdfNote, invoices.invoice.requiresAttention, invoices.invoice.sent, invoices.invoice.status, invoices.invoice.subtotalExVat, invoices.invoice.summary.items, invoices.invoice.summary.title, invoices.invoice.thisMonth, invoices.invoice.timeline.created, invoices.invoice.timeline.description, invoices.invoice.timeline.heading, invoices.invoice.timeline.loadError, invoices.invoice.timeline.loadErrorDescription, invoices.invoice.timeline.manual_follow_up, invoices.invoice.timeline.noEvents, invoices.invoice.timeline.noEventsDescription, invoices.invoice.timeline.paid, invoices.invoice.timeline.reminder_error, invoices.invoice.timeline.reminder_sent, invoices.invoice.timeline.reminder_skipped, invoices.invoice.timeline.sent, invoices.invoice.title, invoices.invoice.totalIncVat, invoices.invoice.totalInvoices, invoices.invoice.totalOutstanding, invoices.invoice.unknown, invoices.invoice.vatAmount, invoices.invoice.viewPdf, invoices.invoices.actions.markReviewed, invoices.invoices.actions.saveDraft, invoices.invoices.actions.send, invoices.invoices.autosave.error, invoices.invoices.autosave.saved, invoices.invoices.autosave.saving, invoices.invoices.compliance.applied, invoices.invoices.compliance.btwId, invoices.invoices.compliance.complete, invoices.invoices.compliance.customerAddress, invoices.invoices.compliance.dutchVat, invoices.invoices.compliance.incomplete, invoices.invoices.compliance.kvkNumber, invoices.invoices.compliance.title, invoices.invoices.compliance.verified, invoices.invoices.confirmSuccess, invoices.invoices.draft.fastMode.badge, invoices.invoices.draft.fastMode.description, invoices.invoices.draft.fastMode.title, invoices.invoices.draft.fastMode.warning, invoices.invoices.draft.safeMode.addLineHint, invoices.invoices.draft.safeMode.badge, invoices.invoices.draft.safeMode.description, invoices.invoices.draft.safeMode.info, invoices.invoices.draft.safeMode.title, invoices.invoices.draft.switchToFast, invoices.invoices.draft.switchToSafe, invoices.invoices.errors.loadFailed, invoices.invoices.import.estimate.calculation, invoices.invoices.import.estimate.title, invoices.invoices.import.jobDetails.date, invoices.invoices.import.jobDetails.description, invoices.invoices.import.jobDetails.duration, invoices.invoices.import.jobDetails.employee, invoices.invoices.lineAdded, invoices.invoices.lineItems.addNew, invoices.invoices.lineItems.description, invoices.invoices.lineItems.multiplier, invoices.invoices.lineItems.quantity, invoices.invoices.lineItems.summary, invoices.invoices.lineItems.title, invoices.invoices.lineItems.type, invoices.invoices.lineItems.unitPrice, invoices.invoices.lineItems.vatRate, invoices.invoices.notes.title, invoices.invoices.review.bulkActions.alsoWhatsApp, invoices.invoices.review.bulkActions.description, invoices.invoices.review.bulkActions.selectedCount, invoices.invoices.review.bulkActions.send, invoices.invoices.review.bulkActions.sending, invoices.invoices.review.bulkActions.title, invoices.invoices.review.controls.createDrafts, invoices.invoices.review.controls.creating, invoices.invoices.review.controls.description, invoices.invoices.review.controls.sinceDate, invoices.invoices.review.controls.title, invoices.invoices.review.created, invoices.invoices.review.customer, invoices.invoices.review.job, invoices.invoices.review.list.count, invoices.invoices.review.list.loading, invoices.invoices.review.list.title, invoices.invoices.review.noInvoices, invoices.invoices.review.noJob, invoices.invoices.review.noProvider, invoices.invoices.review.provider, invoices.invoices.review.results.errors, invoices.invoices.review.results.sent, invoices.invoices.review.results.skipped, invoices.invoices.review.results.title, invoices.invoices.review.results.total, invoices.invoices.review.results.withPaymentLinks, invoices.invoices.review.select, invoices.invoices.review.selectAll, invoices.invoices.review.selected, invoices.invoices.review.subtitle, invoices.invoices.review.title, invoices.invoices.review.total, invoices.invoices.saveSuccess, invoices.invoices.sendError, invoices.invoices.sendSuccess, invoices.invoices.status.draftUnsent, invoices.invoices.summary.lineItems, invoices.invoices.summary.paymentTerms, invoices.invoices.summary.title, invoices.invoices.summary.totalAmount, invoices.invoices.totals.breakdown, invoices.invoices.totals.includingVat, invoices.invoices.totals.subtotal, invoices.invoices.totals.total, invoices.invoices.totals.vat, invoices.invoices.voiceMode.active, invoices.invoices.voiceMode.approve, invoices.invoices.voiceMode.approved, invoices.invoices.voiceMode.changesNotes, invoices.invoices.voiceMode.changesPlaceholder, invoices.invoices.voiceMode.changesRequested, invoices.invoices.voiceMode.confirmPrompt, invoices.invoices.voiceMode.requestChanges, invoices.invoices.voiceMode.reviewing, invoices.invoices.voiceMode.safeActive, invoices.invoices.voiceMode.safeInstructions, invoices.invoices.voiceMode.submitChanges, invoices.invoices.voiceMode.toggle, invoices.providers.eboekhouden, invoices.providers.moneybird, invoices.providers.oauth.adminError, invoices.providers.oauth.authError, invoices.providers.oauth.callbackError, invoices.providers.oauth.csrfError, invoices.providers.oauth.error, invoices.providers.oauth.genericError, invoices.providers.oauth.moneybirdConnected, invoices.providers.oauth.selectAdmin, invoices.providers.oauth.stateError, invoices.providers.oauth.stateExpired, invoices.providers.oauth.success, invoices.providers.oauth.tokenError, invoices.providers.oauth.userMismatch, invoices.providers.peppol, invoices.providers.wefact, invoices.voiceMode.steps.changes, invoices.voiceMode.steps.confirm, invoices.voiceMode.steps.final, invoices.voiceMode.steps.review, jobs.invoice.createDraft.creating, jobs.invoice.createDraft.error, jobs.invoice.createDraft.label, jobs.invoice.createDraft.success, jobs.job.createDescription, jobs.job.deleteDescription, jobs.job.deleteTitle, jobs.job.editDescription, jobs.job.editJob, jobs.job.newJob, jobs.jobs.aiSuggestions, jobs.jobs.assignments.title, jobs.jobs.calendar.desc, jobs.jobs.calendar.title, jobs.jobs.create.failed, jobs.jobs.create.success, jobs.jobs.delete.failed, jobs.jobs.delete.success, jobs.jobs.description, jobs.jobs.details, jobs.jobs.empty.description, jobs.jobs.empty.title, jobs.jobs.error.load, jobs.jobs.errors.notFoundOrNoPermission, jobs.jobs.errors.serverError, jobs.jobs.errors.title.required, jobs.jobs.filter.status.all, jobs.jobs.generateInvoice, jobs.jobs.legend.header, jobs.jobs.legend.none, jobs.jobs.noAiSuggestions, jobs.jobs.source, jobs.jobs.stats.emergency.desc, jobs.jobs.stats.emergency.title, jobs.jobs.stats.monthCompleted.desc, jobs.jobs.stats.monthCompleted.title, jobs.jobs.stats.today.desc, jobs.jobs.stats.today.title, jobs.jobs.stats.week.desc, jobs.jobs.stats.week.title, jobs.jobs.table.desc, jobs.jobs.table.title, jobs.jobs.title, jobs.jobs.unscheduled.ai.assign, jobs.jobs.unscheduled.ai.confidence, jobs.jobs.unscheduled.ai.customer, jobs.jobs.unscheduled.ai.empty, jobs.jobs.unscheduled.ai.minutes, jobs.jobs.unscheduled.ai.title, jobs.jobs.update.failed, jobs.jobs.update.success, launch.controls.createDrafts, launch.controls.creating, launch.controls.description, launch.controls.sinceDate, launch.controls.title, launch.demo.content.ai_suggestion.quantity_format, launch.demo.content.demo_completed, launch.demo.content.demo_started, launch.demo.content.reminders.after_days, launch.demo.content.step_jump, launch.demo.content.step_next, launch.demo.content.step_previous, launch.demo.content.voice_draft.line_format, launch.demo.page.nav.step_counter, launch.list.loading, launch.list.title, launch.meta.description, launch.meta.keywords, launch.meta.title, launch.results.errors, launch.results.sent, launch.results.skipped, launch.results.title, launch.results.total, launch.results.withPaymentLinks, launch.trust.dutch_compliance, launch.trust.ideal_payments, launch.trust.whatsapp_business, launch.usp.ai.desc, launch.usp.ai.title, launch.usp.compliance.desc, launch.usp.compliance.title, launch.usp.invoicing.desc, launch.usp.invoicing.title, launch.usp.jobcards.desc, launch.usp.jobcards.title, launch.usp.schedule.desc, launch.usp.schedule.title, launch.usp.whatsapp.desc, launch.usp.whatsapp.title, misc.__, misc.action.delete, misc.action.edit, misc.active, misc.ai_suggestion.diagnosis, misc.ai_suggestion.emergency, misc.ai_suggestion.estimated_time, misc.ai_suggestion.minutes, misc.ai_suggestion.reliable, misc.ai_suggestion.required_materials, misc.ai_suggestion.urgency, misc.approvals.actions.description, misc.approvals.actions.selectedCount, misc.approvals.actions.sendSelected, misc.approvals.actions.sending, misc.approvals.actions.title, misc.approvals.created, misc.approvals.customer, misc.approvals.dateFilter.description, misc.approvals.dateFilter.label, misc.approvals.dateFilter.title, misc.approvals.empty, misc.approvals.list.count, misc.approvals.list.loading, misc.approvals.list.title, misc.approvals.number, misc.approvals.results.errors, misc.approvals.results.sent, misc.approvals.results.skipped, misc.approvals.results.title, misc.approvals.results.total, misc.approvals.results.withPaymentLinks, misc.approvals.select, misc.approvals.selectAll, misc.approvals.selected, misc.approvals.subtitle, misc.approvals.title, misc.approvals.total, misc.approved, misc.back, misc.badge.accepted, misc.bulkActions.alsoWhatsApp, misc.bulkActions.description, misc.bulkActions.sending, misc.bulkActions.title, misc.connected.description, misc.created, misc.customer, misc.dashboard.welcome, misc.description, misc.done.description, misc.done.environment, misc.done.goToSettings, misc.done.healthSummary, misc.done.security, misc.done.success, misc.done.successDescription, misc.done.title, misc.done.webhook, misc.draftInvoice, misc.eboekhouden.description, misc.employees.filter.all, misc.employees.filter.clearAll, misc.headline, misc.health.description, misc.health.env, misc.health.missing, misc.health.ok, misc.health.refresh, misc.health.secret, misc.health.title, misc.health.unreachable, misc.health.webhook, misc.houseNumber, misc.id, misc.jobCard.active, misc.jobCard.approved, misc.jobCard.draftInvoice, misc.jobCard.jobNumber, misc.jobCard.jobStatus, misc.jobCard.lastResponse, misc.jobCard.phone, misc.jobCard.schedule, misc.jobCard.scheduled, misc.jobCard.title, misc.jobCard.tokenExpires, misc.jobCard.urgency, misc.jobNumber, misc.jobStatus, misc.job_card.address, misc.job_card.notes, misc.job_card.phone, misc.job_card_mobile.addressUnknown, misc.job_card_mobile.backToJobs, misc.job_card_mobile.customer, misc.job_card_mobile.dateUnknown, misc.job_card_mobile.issue, misc.job_card_mobile.openCalendar, misc.job_card_mobile.phoneUnknown, misc.job_card_mobile.readOnlyNotice, misc.job_card_mobile.status, misc.job_card_mobile.statusValues.cancelled, misc.job_card_mobile.statusValues.done, misc.job_card_mobile.statusValues.in_progress, misc.job_card_mobile.statusValues.planned, misc.job_card_mobile.statusValues.scheduled, misc.job_card_mobile.statusValues.unknown, misc.job_card_mobile.timeUnknown, misc.job_card_mobile.title, misc.job_card_mobile.when, misc.job_card_mobile.where, misc.label.durationMinutes, misc.lastResponse, misc.mappings.description, misc.mappings.empty, misc.mappings.label.business, misc.mappings.label.control, misc.mappings.title, misc.money.euro, misc.moneybird.description, misc.next, misc.noInvoices, misc.noJob, misc.noProvider, misc.note, misc.numbers.businessHelp, misc.numbers.businessLabel, misc.numbers.controlHelp, misc.numbers.controlLabel, misc.numbers.error, misc.numbers.labels.select, misc.numbers.save, misc.numbers.success, misc.numbers.validation, misc.onboard.quickDescription, misc.onboard.quickTitle, misc.onboard.start, misc.onboard.title, misc.peppol.description, misc.phone, misc.postalCode, misc.prereqs.description, misc.prereqs.title, misc.prereqs.tokenHelp, misc.prereqs.verifyToken, misc.prereqs.webhookHelp, misc.prereqs.webhookUrl, misc.provider, misc.reminders.automation_active, misc.reminders.email_escalation, misc.reminders.opt_out_respected, misc.reminders.scheduled, misc.reminders.title, misc.reminders.whatsapp_series, misc.schedule.assigned_to, misc.schedule.auto_assigned, misc.schedule.end_time, misc.schedule.start_time, misc.seed.businessId, misc.seed.controlId, misc.seed.description, misc.seed.error, misc.seed.submit, misc.seed.success, misc.seed.title, misc.seed.validation, misc.select, misc.selectAll, misc.selected, misc.send_pay.awaiting_payment, misc.send_pay.click_pay, misc.send_pay.invoice_id, misc.send_pay.invoice_sent, misc.send_pay.payment_status, misc.send_pay.pdf, misc.send_pay.whatsapp_message, misc.states.connected, misc.states.error, misc.states.needs_action, misc.steps.ai_suggestion.description, misc.steps.ai_suggestion.title, misc.steps.done.description, misc.steps.done.title, misc.steps.job_card.description, misc.steps.job_card.title, misc.steps.numbers.description, misc.steps.numbers.title, misc.steps.prereqs.description, misc.steps.prereqs.title, misc.steps.reminders.description, misc.steps.reminders.title, misc.steps.schedule.description, misc.steps.schedule.title, misc.steps.send_pay.description, misc.steps.send_pay.title, misc.steps.test.description, misc.steps.test.title, misc.steps.voice_draft.description, misc.steps.voice_draft.title, misc.steps.whatsapp.description, misc.steps.whatsapp.title, misc.subtitle, misc.test.configured, misc.test.description, misc.test.error, misc.test.messageHelp, misc.test.messageLabel, misc.test.messagePlaceholder, misc.test.phoneHelp, misc.test.phoneLabel, misc.test.send, misc.test.success, misc.test.title, misc.test.validation, misc.title, misc.toast.deleteError, misc.toast.jobDeleted, misc.tokenExpires, misc.total, misc.ui.tip, misc.upsert.error, misc.upsert.label, misc.upsert.phoneNumberId, misc.upsert.submit, misc.upsert.success, misc.upsert.title, misc.upsert.validation, misc.urgency, misc.voice_draft.invoice_lines, misc.voice_draft.subtotal_ex_vat, misc.voice_draft.total, misc.voice_draft.vat_total, misc.voice_draft.voice_transcript, misc.wefact.description, providers.actions.back, providers.comingSoon, providers.eboekhouden.description, providers.eboekhouden.title, providers.moneybird.connect, providers.moneybird.connected, providers.moneybird.description, providers.moneybird.disconnect, providers.moneybird.health.invalid_token, providers.moneybird.health.not_connected, providers.moneybird.health.ok, providers.moneybird.openDashboard, providers.moneybird.reconnect, providers.moneybird.reconnectHelper, providers.moneybird.title, providers.panel.description, providers.panel.note, providers.panel.title, providers.peppol.description, providers.peppol.title, providers.providers.actions.configure, providers.providers.actions.connect, providers.providers.actions.fix, providers.providers.connected.description, providers.providers.eboekhouden.description, providers.providers.moneybird.description, providers.providers.oauth.adminError, providers.providers.oauth.authError, providers.providers.oauth.callbackError, providers.providers.oauth.csrfError, providers.providers.oauth.error, providers.providers.oauth.genericError, providers.providers.oauth.moneybirdConnected, providers.providers.oauth.selectAdmin, providers.providers.oauth.stateError, providers.providers.oauth.stateExpired, providers.providers.oauth.success, providers.providers.oauth.tokenError, providers.providers.oauth.userMismatch, providers.providers.panel.description, providers.providers.panel.note, providers.providers.panel.title, providers.providers.peppol.description, providers.providers.setup.actions.back, providers.providers.setup.actions.cancel, providers.providers.setup.actions.connect, providers.providers.setup.actions.connecting, providers.providers.setup.apiKey.help, providers.providers.setup.apiKey.label, providers.providers.setup.apiKey.placeholder, providers.providers.setup.baseUrl.help, providers.providers.setup.baseUrl.label, providers.providers.setup.errors.connection, providers.providers.setup.wefact.description, providers.providers.setup.wefact.title, providers.providers.states.connected, providers.providers.states.error, providers.providers.states.needs_action, providers.providers.wefact.description, providers.states.connected, providers.states.error, providers.states.needs_action, providers.wefact.description, providers.wefact.title, settings.whatsapp.completion.actions.dashboard, settings.whatsapp.completion.actions.settings, settings.whatsapp.completion.nextSteps.items.0, settings.whatsapp.completion.nextSteps.items.1, settings.whatsapp.completion.nextSteps.items.2, settings.whatsapp.completion.nextSteps.title, settings.whatsapp.completion.summary.credentials, settings.whatsapp.completion.summary.numbers, settings.whatsapp.completion.summary.test, settings.whatsapp.completion.summary.webhooks, settings.whatsapp.completion.title, settings.whatsapp.health.invalid_token, settings.whatsapp.health.not_connected, settings.whatsapp.health.ok, settings.whatsapp.health.webhook_error, settings.whatsapp.health.webhook_ok, settings.whatsapp.numbers.add.error, settings.whatsapp.numbers.add.label.helper, settings.whatsapp.numbers.add.label.label, settings.whatsapp.numbers.add.phoneNumberId.helper, settings.whatsapp.numbers.add.phoneNumberId.label, settings.whatsapp.numbers.add.phoneNumberId.placeholder, settings.whatsapp.numbers.add.submit, settings.whatsapp.numbers.add.submitting, settings.whatsapp.numbers.add.success, settings.whatsapp.numbers.add.title, settings.whatsapp.numbers.description, settings.whatsapp.numbers.empty.description, settings.whatsapp.numbers.empty.title, settings.whatsapp.numbers.labels.control, settings.whatsapp.numbers.labels.customer, settings.whatsapp.numbers.labels.select, settings.whatsapp.numbers.remove.confirm, settings.whatsapp.numbers.remove.error, settings.whatsapp.numbers.remove.success, settings.whatsapp.numbers.table.actions, settings.whatsapp.numbers.table.createdAt, settings.whatsapp.numbers.table.label, settings.whatsapp.numbers.table.phoneNumberId, settings.whatsapp.numbers.title, settings.whatsapp.onboard.back, settings.whatsapp.onboard.description, settings.whatsapp.onboard.done.description, settings.whatsapp.onboard.done.environment, settings.whatsapp.onboard.done.goToSettings, settings.whatsapp.onboard.done.healthSummary, settings.whatsapp.onboard.done.security, settings.whatsapp.onboard.done.success, settings.whatsapp.onboard.done.successDescription, settings.whatsapp.onboard.done.title, settings.whatsapp.onboard.done.webhook, settings.whatsapp.onboard.next, settings.whatsapp.onboard.numbers.businessHelp, settings.whatsapp.onboard.numbers.businessLabel, settings.whatsapp.onboard.numbers.controlHelp, settings.whatsapp.onboard.numbers.controlLabel, settings.whatsapp.onboard.numbers.description, settings.whatsapp.onboard.numbers.error, settings.whatsapp.onboard.numbers.save, settings.whatsapp.onboard.numbers.success, settings.whatsapp.onboard.numbers.title, settings.whatsapp.onboard.numbers.validation, settings.whatsapp.onboard.prereqs.description, settings.whatsapp.onboard.prereqs.title, settings.whatsapp.onboard.prereqs.tokenHelp, settings.whatsapp.onboard.prereqs.verifyToken, settings.whatsapp.onboard.prereqs.webhookHelp, settings.whatsapp.onboard.prereqs.webhookUrl, settings.whatsapp.onboard.steps.done.title, settings.whatsapp.onboard.steps.numbers.title, settings.whatsapp.onboard.steps.prereqs.title, settings.whatsapp.onboard.steps.test.title, settings.whatsapp.onboard.test.configured, settings.whatsapp.onboard.test.description, settings.whatsapp.onboard.test.error, settings.whatsapp.onboard.test.messageHelp, settings.whatsapp.onboard.test.messageLabel, settings.whatsapp.onboard.test.messagePlaceholder, settings.whatsapp.onboard.test.phoneHelp, settings.whatsapp.onboard.test.phoneLabel, settings.whatsapp.onboard.test.send, settings.whatsapp.onboard.test.success, settings.whatsapp.onboard.test.title, settings.whatsapp.onboard.test.validation, settings.whatsapp.onboard.title, settings.whatsapp.prereqs.webhookUrls.copy, settings.whatsapp.test.error.apiError, settings.whatsapp.test.error.noControl, settings.whatsapp.test.error.noConversation, settings.whatsapp.test.error.unknown, settings.whatsapp.test.requirements.items.0, settings.whatsapp.test.requirements.items.1, settings.whatsapp.test.requirements.items.2, settings.whatsapp.test.sending, settings.whatsapp.test.success.nextSteps, settings.whatsapp.test.success.title, settings.whatsapp.wizard.skip, settings.whatsapp.wizard.step, system.app.title, system.errors.paymentLink.sendFailed, system.locale, system.meta.created, system.notifications.paymentLink.sent, system.payment.copyFailed, system.payment.creatingMollie, system.payment.downloadPdf, system.payment.links, system.payment.linksDescription, system.payment.mollieCreated, system.payment.mollieFailed, system.payment.molliePayment, system.payment.noLinksAvailable, system.payment.noLinksDescription, system.payment.officialInvoice, system.payment.openMollieCheckout, system.payment.payOnline, system.payment.paymentCopied, system.payment.pdfCopied, system.payment.pdfDescription, system.payment.providerPayment, system.payment.viewPdf, ui.badges.legacy, ui.badges.locked_tooltip, ui.field.customer, ui.field.description, ui.field.primaryEmployee, ui.field.priority, ui.field.secondaryEmployees, ui.field.start, ui.field.status, ui.form.address, ui.form.customer, ui.form.description, ui.form.duration, ui.form.employee, ui.form.endDate, ui.form.endTime, ui.form.noEmployee, ui.form.notes, ui.form.primaryEmployee, ui.form.priority, ui.form.required, ui.form.requiredSymbol, ui.form.startDate, ui.form.startTime, ui.form.status, ui.form.title, ui.nav.customers, ui.nav.dashboard, ui.nav.invoices, ui.nav.jobs, ui.stats.activeJobs, ui.stats.newCustomers, ui.stats.outstandingInvoices, ui.stats.revenue, ui.stats.thisMonth, ui.stats.thisWeek, ui.stats.toCollect, ui.stats.today, ui.table.actions, ui.table.amount, ui.table.customer, ui.table.date, ui.table.draft, ui.table.dueDate, ui.table.invoice, ui.table.issuedOn, ui.table.job, ui.table.method, ui.table.noJobs, ui.table.paidOn, ui.table.provider, ui.table.status, ui.table.time, ui.table.title, ui.tabs.whatsapp, whatsapp.ai_analyzing, whatsapp.info.linkedCustomer, whatsapp.photo_attached, whatsapp.session.expiresAt, whatsapp.whatsapp.ai_analyzing, whatsapp.whatsapp.createJob, whatsapp.whatsapp.lastActivity, whatsapp.whatsapp.messages, whatsapp.whatsapp.noMessages, whatsapp.whatsapp.photo_attached[0m

===============================================
[31m❌ i18n VALIDATION FAILED[0m
🔧 Fix the errors above and run the validation again.

━━━ Audit Rules ━━━
🔍 STREAMLINED PRODUCTION AUDIT (Business Logic Only)
============================================================

🚫 RULE 1: NO MOCK DATA (COMPREHENSIVE PATTERNS)

📋 Scanning: Mock data variables (mockSomething)
✅ Clean

📋 Scanning: Demo data variables (demoSomething)
✅ Clean

📋 Scanning: Stub data variables (stubSomething)
✅ Clean

📋 Scanning: Sample data variables (sampleSomething)
✅ Clean

📋 Scanning: Fake data variables (fakeSomething)
✅ Clean

📋 Scanning: Test data variables (testSomething)
✅ Clean
📋 Scanning: Mock/temporary data comments
✅ Clean

📋 Scanning: Hardcoded business data arrays
✅ Clean

📋 Scanning: Lorem ipsum and placeholder content
✅ Clean

🆔 RULE 2: NO FAKE UUIDS

📋 Scanning: Hardcoded UUIDs
✅ Clean

🔐 RULE 3: NO CLIENT-SIDE SECRETS

📋 Scanning: Server secrets in client code
✅ Clean

📞 RULE 4: NO FAKE CONTACT INFO

📋 Scanning: Fake Dutch phone numbers
✅ Clean

📋 Scanning: Fake email addresses
✅ Clean

📋 Scanning: Fake Dutch addresses
✅ Clean

📅 RULE 5: NO HARDCODED DATES

📋 Scanning: Hardcoded dates (should use Temporal)
✅ Clean

💰 RULE 6: DUTCH MARKET COMPLIANCE

📋 Scanning: Non-Euro currency symbols
✅ Clean
📋 Scanning: Non-Dutch locales
✅ Clean

📋 Scanning: Non-Amsterdam timezone configs
✅ Clean

🗄️ RULE 7: ARCHITECTURE VIOLATIONS
📋 Scanning: Direct Supabase calls in client code (use tRPC)
✅ Clean
📋 Scanning: External HTTP calls (should use tRPC)
✅ Clean

📋 Scanning: Non-Mollie payment providers
✅ Clean

🔒 RULE 7b: RLS SECURITY VIOLATIONS - SERVICE-ROLE WHITELIST
📋 Scanning: Service-role usage with strict whitelist validation
✅ Clean - all service-role usage in whitelisted locations
   Allowed: src/lib/supabase.ts, src/app/api/health/route.ts, src/app/api/webhooks/clerk/route.ts, src/app/api/webhooks/mollie/route.ts, src/app/api/webhooks/whatsapp/route.ts

🎨 RULE 8: UI/UX VIOLATIONS

📋 Scanning: Non-Tailwind CSS frameworks
✅ Clean

📋 Scanning: Non-shadcn UI libraries
✅ Clean

🔧 RULE 9: CODE QUALITY VIOLATIONS

📋 Scanning: TypeScript suppressions (fix types instead)
✅ Clean

📋 Scanning: ESLint suppressions (fix issues instead)
✅ Clean

📋 Scanning: Console.log statements (use proper logging)
✅ Clean

🏢 RULE 10: BUSINESS LOGIC VIOLATIONS

📋 Scanning: Client-side role checks (server-side only)
✅ Clean
📋 Scanning: Non-Temporal date usage
✅ Clean

==================================================
📊 AUDIT SUMMARY
==================================================
✅ ALL PRODUCTION RULES COMPLIANT
🚀 Ready for production

━━━ Build ━━━
   ▲ Next.js 15.5.3
   - Environments: .env.local
   - Experiments (use with caution):
     · optimizePackageImports

   Creating an optimized production build ...
 ✓ Compiled successfully in 8.7s
   Linting and checking validity of types ...


========== GUARD-SAFE SUMMARY ==========
✅ PASS  Biome Format
✅ PASS  Biome Check
❌ FAIL (exit 1)  ESLint
✅ PASS  Pre-TypeCheck
❌ FAIL (exit 2)  TypeScript Check
✅ PASS  Check Imports
✅ PASS  Check Routes
✅ PASS  Check Encoding
✅ PASS  Check Placeholders
✅ PASS  i18n Prune
❌ FAIL (exit 1)  i18n Scan
❌ FAIL (exit 1)  i18n Check
✅ PASS  Audit Rules
❌ FAIL (exit 1)  Build
========================================

 ELIFECYCLE  Command failed with exit code 1.


 ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
Failed to compile.

./src/app/invoices/review/page.tsx:156:14
Type error: Argument of type '"review.controls.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.

[0m [90m 154 |[39m 								[33m<[39m[33mFileText[39m className[33m=[39m[32m"h-4 w-4"[39m [33m/[39m[33m>[39m
 [90m 155 |[39m 								{createDraftsMutation[33m.[39misPending
[31m[1m>[22m[39m[90m 156 |[39m 									[33m?[39m t([32m"review.controls.creating"[39m)
 [90m     |[39m 									    [31m[1m^[22m[39m
 [90m 157 |[39m 									[33m:[39m t([32m"review.controls.createDrafts"[39m)}
 [90m 158 |[39m 							[33m<[39m[33m/[39m[33mButton[39m[33m>[39m
 [90m 159 |[39m 						[33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
Next.js build worker exited with code: 1 and signal: null

```
## Standard Error

```

 ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
Failed to compile.

./src/app/invoices/review/page.tsx:156:14
Type error: Argument of type '"review.controls.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.

[0m [90m 154 |[39m 								[33m<[39m[33mFileText[39m className[33m=[39m[32m"h-4 w-4"[39m [33m/[39m[33m>[39m
 [90m 155 |[39m 								{createDraftsMutation[33m.[39misPending
[31m[1m>[22m[39m[90m 156 |[39m 									[33m?[39m t([32m"review.controls.creating"[39m)
 [90m     |[39m 									    [31m[1m^[22m[39m
 [90m 157 |[39m 									[33m:[39m t([32m"review.controls.createDrafts"[39m)}
 [90m 158 |[39m 							[33m<[39m[33m/[39m[33mButton[39m[33m>[39m
 [90m 159 |[39m 						[33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
Next.js build worker exited with code: 1 and signal: null

```