#!/bin/bash

# Direct fix for unused useTranslations imports
# For each file that has unused useTranslations import, remove it if no calls exist

cd "C:\Users\styry\plumbing-agent"

# Get list of files with unused useTranslations imports
pnpm -s lint 2>&1 | grep "useTranslations.*is defined but never used" | cut -d: -f1 > /tmp/unused_files.txt

echo "Files to fix:"
cat /tmp/unused_files.txt | wc -l

while IFS= read -r file; do
    if [ -f "$file" ]; then
        echo "Processing: $file"

        # Check if file has any useTranslations() calls
        if ! grep -q "useTranslations(" "$file"; then
            # File has no calls, safe to remove import

            # Method 1: Remove entire import line if it only imports useTranslations
            if grep -q "^import { useTranslations } from \"next-intl\";$" "$file"; then
                sed -i '/^import { useTranslations } from "next-intl";$/d' "$file"
                echo "  ✓ Removed entire import line"

            # Method 2: Remove useTranslations from mixed import
            elif grep -q "import.*useTranslations.*from \"next-intl\"" "$file"; then
                # This is trickier - remove just the useTranslations specifier
                sed -i 's/import { useTranslations, /import { /g' "$file"
                sed -i 's/import { useTranslations } from "next-intl";//g' "$file"
                sed -i 's/, useTranslations } from "next-intl"/ } from "next-intl"/g' "$file"
                echo "  ✓ Removed from mixed import"
            fi
        else
            echo "  ⚠ File has useTranslations() calls - skipping"
        fi
    fi
done < /tmp/unused_files.txt

echo "Cleanup complete"