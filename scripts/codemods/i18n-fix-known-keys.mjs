/**
 * Codemod: fix known i18n key shortcuts/typos to canonical full-root paths.
 * Safe replaces inside t("...") calls only.
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let dirty = false;

  const fixes = {
    // General
    "sending": "actions.sending",
    "cta.newJob": "actions.cta.newJob",

    // UI form (short -> full-root)
    "form.startTime": "ui.form.startTime",
    "form.duration": "ui.form.duration",
    "form.title": "ui.form.title",
    "form.description": "ui.form.description",
    "form.priority": "ui.form.priority",
    "form.primaryEmployee": "ui.form.primaryEmployee",
    "form.required": "ui.form.required",

    // Tabs
    "tabs.whatsapp": "ui.tabs.whatsapp",

    // JobDrawer / Jobs delete (legacy alias)
    "JobDrawer.delete": "jobs.delete.title",

    // System payment keys
    "paymentLink.sent": "system.notifications.paymentLink.sent",
    "paymentLink.sendFailed": "system.errors.paymentLink.sendFailed",
    "mollieCreated": "system.payment.mollieCreated",
    "mollieFailed": "system.payment.mollieFailed",
    "paymentCopied": "system.payment.paymentCopied",
    "pdfCopied": "system.payment.pdfCopied",
    "copyFailed": "system.payment.copyFailed",
    "noLinksAvailable": "system.payment.noLinksAvailable",
    "noLinksDescription": "system.payment.noLinksDescription"
  };

  function replaceKeyLiteral(node) {
    if (!node || node.type !== "Literal" || typeof node.value !== "string") return;
    const old = node.value;
    if (fixes[old]) {
      node.value = fixes[old];
      dirty = true;
    }
    // Pattern: jobs.jobs.* -> jobs.*
    if (/^jobs\.jobs\./.test(old)) {
      node.value = old.replace(/^jobs\.jobs\./, "jobs.");
      dirty = true;
    }
  }

  root.find(j.CallExpression, { callee: { type: "Identifier", name: "t" } })
    .forEach(p => {
      const args = p.node.arguments || [];
      if (args[0]) replaceKeyLiteral(args[0]);
    });

  return dirty ? root.toSource({ quote: "double" }) : null;
}