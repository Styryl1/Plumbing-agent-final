# GUARD VALIDATION REPORT ❌

**Generated**: 2025-09-13T12:05:54.517Z
**Status**: FAILED (5 failed steps, 9 passed steps)
**Exit Code**: 1

## Validation Steps Summary

```
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
```

## Detailed Error Output

All error details with full context (i18n key lists omitted for brevity):

```
 ELIFECYCLE  Command failed with exit code 1.


 ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
Failed to compile.

./src/app/invoices/review/page.tsx:156:14
Type error: Argument of type '"review.controls.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.

  154 | 								<FileText className="h-4 w-4" />
  155 | 								{createDraftsMutation.isPending
> 156 | 									? t("review.controls.creating")
      | 									    ^
  157 | 									: t("review.controls.createDrafts")}
  158 | 							</Button>
  159 | 						</div>
Next.js build worker exited with code: 1 and signal: null


 ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
Failed to compile.

./src/app/invoices/review/page.tsx:156:14
Type error: Argument of type '"review.controls.creating"' is not assignable to parameter of type 'NamespacedMessageKeys<{ actions: { actions: { cancel: string; create: string; creating: string; delete: string; deleting: string; edit: string; openActions: string; pay: string; saving: string; update: string; }; back: string; ... 4 more ...; sending: string; }; ... 12 more ...; whatsapp: { ...; }; }, "invoices">'.

  154 | 								<FileText className="h-4 w-4" />
  155 | 								{createDraftsMutation.isPending
> 156 | 									? t("review.controls.creating")
      | 									    ^
  157 | 									: t("review.controls.createDrafts")}
  158 | 							</Button>
  159 | 						</div>
Next.js build worker exited with code: 1 and signal: null

```

---
*This report preserves all validation error details while providing a clean summary section.*