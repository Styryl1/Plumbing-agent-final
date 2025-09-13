# Translation Namespace Files

This directory contains translation files split by namespace for better maintainability.

## How it works

1. Edit these namespace files — not the parent `en.json`
2. Run `pnpm i18n:aggregate` to rebuild the monolithic file
3. The parent `en.json` is automatically generated for next-intl compatibility
