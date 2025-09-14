// Fix missing useTranslations imports
import fg from 'fast-glob';
import { readFile, writeFile } from 'fs/promises';

(async () => {
  const missingImportFiles = [
    'src/app/customers/page.tsx',
    'src/app/en/launch/demo/page.tsx',
    'src/app/invoices/[id]/page.tsx',
    'src/app/invoices/approvals/page.tsx',
    'src/app/invoices/page.tsx',
    'src/app/invoices/review/page.tsx',
    'src/app/jobs/page.tsx',
    'src/app/nl/launch/demo/page.tsx',
    'src/app/settings/providers/page.tsx',
    'src/app/settings/whatsapp/onboard/page.tsx',
    'src/app/settings/whatsapp/page.tsx',
    'src/app/whatsapp/[conversationId]/page.tsx',
    'src/app/whatsapp/page.tsx'
  ];

  for (const filePath of missingImportFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Check if useTranslations is used but not imported
      const hasUseTranslationsCall = /useTranslations\(\)/.test(content);
      const hasUseTranslationsImport = /import.*useTranslations.*from.*next-intl/.test(content);

      if (hasUseTranslationsCall && !hasUseTranslationsImport) {
        // Add import after the existing imports
        const lines = content.split('\n');
        let insertIndex = 0;

        // Find the last import line
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === '' && insertIndex > 0) {
            // Found empty line after imports
            break;
          }
        }

        // Insert the import
        lines.splice(insertIndex, 0, 'import { useTranslations } from "next-intl";');

        const newContent = lines.join('\n');
        await writeFile(filePath, newContent, 'utf-8');
        console.log(`Added useTranslations import to ${filePath}`);
      }
    } catch (error) {
      console.warn(`Could not process ${filePath}:`, error);
    }
  }
})();