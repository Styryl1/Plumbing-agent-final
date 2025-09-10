# Translation Namespace Files

This directory contains translation files split by namespace for better maintainability.

## How it works

1. **Edit these namespace files** - not the parent `en.json`
2. **Run `pnpm i18n:aggregate`** to rebuild the monolithic file
3. **The parent `en.json`** is automatically generated for next-intl compatibility

## Files in this directory

- **common.json** - Root level keys, shared utilities (actions, ui, etc.)
- **invoices.json** - Invoice management and billing
- **jobs.json** - Job scheduling and management  
- **providers.json** - Third-party integrations (accounting providers)
- **ui.json** - User interface elements (forms, tables, navigation)
- **system.json** - System, auth, and application-level messages
- **whatsapp.json** - WhatsApp integration messages
- **employees.json** - Employee management
- **actions.json** - Action buttons and CTAs
- **misc.json** - Miscellaneous and smaller namespaces

## Adding new keys

1. Determine which namespace file the key belongs to
2. Add the key to the appropriate `.json` file in this directory
3. Run `pnpm i18n:aggregate` to update the parent file
4. Run `pnpm i18n:sync` to ensure parity between languages
